#!/usr/bin/env python3
"""ilmlibol-reels renderer.

plan.json + images + words.json + the original audio  ->  vertical MP4 (4K by default).

  python render.py --plan work/plan.json --out work/final.mp4            # final 2160x3840
  python render.py --plan work/plan.json --sheet work/sheet.jpg          # contact sheet (seconds)
  python render.py --plan work/plan.json --out work/preview.mp4 --preview  # 540x960 fast check

Needs: pillow, numpy, and ffmpeg (system ffmpeg, or `pip install imageio-ffmpeg`).
The "ilmlibol" signature is drawn on every frame and cannot be switched off.
"""
import argparse
import json
import math
import os
import random
import re
import shutil
import subprocess
import sys

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

BRAND = "ilmlibol"
HERE = os.path.dirname(os.path.abspath(__file__))
FONT_DIR = os.path.join(HERE, "..", "assets", "fonts")


# --------------------------------------------------------------------------- utils

def find_ffmpeg():
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    try:
        import imageio_ffmpeg  # type: ignore
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        sys.exit("ffmpeg not found. Run:  pip install imageio-ffmpeg")


def audio_duration(ffmpeg, path):
    p = subprocess.run([ffmpeg, "-hide_banner", "-i", path], capture_output=True, text=True)
    m = re.search(r"Duration:\s*(\d+):(\d+):([\d.]+)", p.stderr)
    if not m:
        sys.exit(f"cannot read audio duration of {path}")
    h, mi, s = m.groups()
    return int(h) * 3600 + int(mi) * 60 + float(s)


def font(weight, size):
    name = {"bold": "Inter-Bold.otf", "semibold": "Inter-SemiBold.otf", "medium": "Inter-Medium.otf"}[weight]
    path = os.path.join(FONT_DIR, name)
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        for alt in ("DejaVuSans-Bold.ttf", "Arial Bold.ttf", "arialbd.ttf"):
            try:
                return ImageFont.truetype(alt, size)
            except OSError:
                pass
        return ImageFont.load_default()


def ease(p, kind="inout"):
    p = min(max(p, 0.0), 1.0)
    if kind == "linear":
        return p
    s = 0.5 - 0.5 * math.cos(math.pi * p)
    return 0.45 * p + 0.55 * s  # mostly smooth, never fully stops: the samples always drift


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def resolve(base, p):
    return p if os.path.isabs(p) else os.path.normpath(os.path.join(base, p))


# --------------------------------------------------------------------------- camera moves

MOVES = {
    # name: (zoom_from, zoom_to, dx_from, dx_to, dy_from, dy_to)   dx/dy are offsets of the view centre
    "push_in":    (1.04, 1.16, 0, 0, 0, 0),
    "push_in_slow": (1.04, 1.09, 0, 0, 0, 0),
    "push_in_fast": (1.02, 1.30, 0, 0, 0, 0),
    "pull_out":   (1.18, 1.04, 0, 0, 0, 0),
    "pull_out_fast": (1.34, 1.02, 0, 0, 0, 0),
    "pan_left":   (1.14, 1.14, 0.05, -0.05, 0, 0),
    "pan_right":  (1.14, 1.14, -0.05, 0.05, 0, 0),
    "tilt_up":    (1.14, 1.14, 0, 0, 0.05, -0.05),
    "tilt_down":  (1.14, 1.14, 0, 0, -0.05, 0.05),
    "crane_up":   (1.10, 1.16, 0, 0, 0.06, -0.04),
    "crane_down": (1.16, 1.10, 0, 0, -0.06, 0.04),
    "drift":      (1.07, 1.11, -0.02, 0.02, 0.01, -0.01),
    "static":     (1.06, 1.07, 0, 0, 0, 0),
}


class Shot:
    def __init__(self, d, idx, base, W, H, defaults):
        self.d = d
        self.idx = idx
        self.id = d.get("id", f"s{idx + 1:02d}")
        self.start = float(d["start"])
        self.end = float(d["end"])
        self.image_path = resolve(base, d["image"])
        self.move = d.get("move", "push_in")
        if self.move not in MOVES:
            sys.exit(f"{self.id}: unknown move '{self.move}'. Use one of: {', '.join(MOVES)}")
        z0, z1, x0, x1, y0, y1 = MOVES[self.move]
        if "zoom" in d:
            z0, z1 = d["zoom"]
        fx, fy = d.get("focus", [0.5, 0.5])
        self.c0 = (fx + x0, fy + y0)
        self.c1 = (fx + x1, fy + y1)
        if "from" in d:
            self.c0 = tuple(d["from"])
        if "to" in d:
            self.c1 = tuple(d["to"])
        self.z0, self.z1 = float(z0), float(z1)
        self.easing = d.get("easing", "inout")
        self.transition = d.get("transition", defaults.get("transition", "cut"))
        self.xfade = float(d.get("xfade", defaults.get("xfade", 0.6)))
        self.fx = [f if isinstance(f, dict) else {"type": f} for f in d.get("fx", [])]
        self.grade = d.get("grade", "none")
        self.labels = d.get("labels", [])
        self.W, self.H = W, H
        self.src = None
        self.fx_objs = None

    def load(self):
        if self.src is not None:
            return
        if not os.path.exists(self.image_path):
            sys.exit(f"{self.id}: image not found: {self.image_path}")
        im = Image.open(self.image_path).convert("RGB")
        W, H = self.W, self.H
        zmax = max(self.z0, self.z1)
        # pre-scale once to the size needed at maximum zoom (+ a little margin), with sharpening
        k = max(W / im.width, H / im.height) * zmax * 1.02
        if k > 1.0:
            im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
            if k > 1.4:
                im = im.filter(ImageFilter.UnsharpMask(radius=max(1, round(1.2 * k)), percent=60, threshold=2))
        elif k < 0.9:
            im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
        self.src = apply_grade(im, self.grade)  # grade is constant per shot: do it once

    def unload(self):
        self.src = None
        self.fx_objs = None

    def frame(self, t):
        self.load()
        dur = max(self.end - self.start, 1e-3)
        p = ease((t - self.start) / dur, self.easing)
        z = self.z0 + (self.z1 - self.z0) * p
        cx = self.c0[0] + (self.c1[0] - self.c0[0]) * p
        cy = self.c0[1] + (self.c1[1] - self.c0[1]) * p
        iw, ih = self.src.size
        k = max(self.W / iw, self.H / ih)
        vw, vh = self.W / (k * z), self.H / (k * z)
        x = min(max(cx * iw - vw / 2, 0), iw - vw)
        y = min(max(cy * ih - vh / 2, 0), ih - vh)
        img = self.src.transform((self.W, self.H), Image.EXTENT, (x, y, x + vw, y + vh), Image.BILINEAR)
        if self.fx_objs is None:
            self.fx_objs = [make_fx(f, self.W, self.H, seed=self.idx * 977 + i) for i, f in enumerate(self.fx)]
        local = t - self.start
        for fx in self.fx_objs:
            img = fx.apply(img, local)
        if self.labels:
            img = draw_labels(img, self.labels, local, self.H)
        return img


# --------------------------------------------------------------------------- grading

def apply_grade(img, grade):
    if grade in (None, "none"):
        return img
    a = np.asarray(img).astype(np.float32) / 255.0
    lum = (a @ np.array([0.299, 0.587, 0.114], np.float32))[..., None]
    if grade == "storm":
        a = lum + (a - lum) * 0.55
        a = a * np.array([0.86, 0.9, 0.98], np.float32) * 0.85
    elif grade == "warm":
        a = a * np.array([1.06, 1.0, 0.9], np.float32)
    elif grade == "cool":
        a = a * np.array([0.92, 0.98, 1.06], np.float32)
    elif grade == "night":
        a = (lum + (a - lum) * 0.6) * np.array([0.7, 0.8, 1.0], np.float32) * 0.75
    elif grade == "faded":
        a = lum + (a - lum) * 0.7
        a = a * 0.9 + 0.08
    elif grade == "golden":
        a = a * np.array([1.1, 1.0, 0.82], np.float32) + np.array([0.03, 0.015, 0.0], np.float32)
    else:
        return img
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))


# --------------------------------------------------------------------------- effects

class FX:
    def __init__(self, cfg, W, H, seed):
        self.cfg, self.W, self.H = cfg, W, H
        self.s = H / 3840.0
        self.rng = random.Random(seed)
        self.strength = float(cfg.get("strength", 1.0))
        self.setup()

    def setup(self):
        pass

    def apply(self, img, t):
        return img


class Rain(FX):
    def setup(self):
        n = int(260 * self.strength)
        r = self.rng
        self.drops = [(r.random() * self.W * 1.2, r.random() * self.H, r.uniform(70, 170) * self.s,
                       r.uniform(2600, 3800) * self.s, r.randint(70, 170), r.uniform(1.2, 3.2) * self.s) for _ in range(n)]
        self.slant = float(self.cfg.get("slant", 0.12))

    def apply(self, img, t):
        layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        for x0, y0, ln, sp, a, w in self.drops:
            y = (y0 + sp * t) % (self.H + ln) - ln
            x = (x0 - self.slant * sp * t) % (self.W * 1.2) - self.W * 0.1
            d.line([(x, y), (x + self.slant * ln, y + ln)], fill=(235, 240, 245, a), width=max(1, round(w)))
            d.ellipse([x + self.slant * ln - w, y + ln - w, x + self.slant * ln + w, y + ln + w], fill=(255, 255, 255, min(255, a + 50)))
        return Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")


class Snow(FX):
    def setup(self):
        r = self.rng
        n = int(300 * self.strength)
        self.f = [(r.random() * self.W, r.random() * self.H, r.uniform(3, 11) * self.s, r.uniform(110, 300) * self.s,
                   r.uniform(0.4, 1.4), r.uniform(0, 6.28), r.randint(150, 240)) for _ in range(n)]

    def apply(self, img, t):
        layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        for x0, y0, rad, sp, fr, ph, a in self.f:
            y = (y0 + sp * t) % (self.H + 20) - 10
            x = (x0 + math.sin(t * fr + ph) * 40 * self.s) % self.W
            d.ellipse([x - rad, y - rad, x + rad, y + rad], fill=(255, 255, 255, a))
        return Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")


class Petals(FX):
    COLORS = {"petals": [(248, 214, 222), (255, 236, 240), (240, 190, 205)],
              "leaves": [(120, 160, 80), (170, 180, 70), (205, 160, 70)]}

    def setup(self):
        r = self.rng
        n = int((70 if self.cfg["type"] == "petals" else 40) * self.strength)
        cols = self.COLORS[self.cfg["type"]]
        self.p = [(r.random() * self.W, r.random() * self.H, r.uniform(14, 30) * self.s, r.uniform(160, 380) * self.s,
                   r.uniform(60, 220) * self.s, r.uniform(0.5, 1.6), r.uniform(0, 6.28), r.choice(cols), r.randint(170, 240))
                  for _ in range(n)]

    def apply(self, img, t):
        layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        for x0, y0, sz, vy, vx, fr, ph, col, a in self.p:
            y = (y0 + vy * t) % (self.H + 60) - 30
            x = (x0 + vx * t + math.sin(t * fr + ph) * 60 * self.s) % (self.W + 60) - 30
            ang = t * fr * 2 + ph
            pts = []
            for k in range(10):
                th = k / 10 * 6.283
                px, py = math.cos(th) * sz, math.sin(th) * sz * 0.55 * (0.4 + 0.6 * abs(math.cos(ang)))
                pts.append((x + px * math.cos(ang) - py * math.sin(ang), y + px * math.sin(ang) + py * math.cos(ang)))
            d.polygon(pts, fill=col + (a,))
        return Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")


class Motes(FX):
    """dust in sunlight / fireflies / stars: glowing points that drift and twinkle."""

    def setup(self):
        r = self.rng
        kind = self.cfg["type"]
        self.kind = kind
        n = {"dust": 90, "fireflies": 45, "stars": 160}[kind]
        n = int(n * self.strength)
        ymax = 0.45 if kind == "stars" else 1.0
        self.p = [(r.random() * self.W, r.random() * self.H * ymax, r.uniform(2, 6) * self.s * (1.8 if kind == "fireflies" else 1),
                   r.uniform(-40, 40) * self.s, r.uniform(-60, 10) * self.s, r.uniform(0.6, 2.2), r.uniform(0, 6.28)) for _ in range(n)]
        self.col = {"dust": (255, 236, 200), "fireflies": (230, 255, 150), "stars": (255, 255, 245)}[kind]

    def apply(self, img, t):
        layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        for x0, y0, rad, vx, vy, fr, ph in self.p:
            if self.kind == "stars":
                x, y = x0, y0
            else:
                x = (x0 + vx * t) % self.W
                y = (y0 + vy * t) % self.H
            tw = 0.5 + 0.5 * math.sin(t * fr * 2 + ph)
            a = int(60 + 170 * tw)
            g = rad * 3.2
            d.ellipse([x - g, y - g, x + g, y + g], fill=self.col + (a // 6,))
            d.ellipse([x - rad, y - rad, x + rad, y + rad], fill=self.col + (a,))
        return Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")


class Ripples(FX):
    def setup(self):
        r = self.rng
        x0, y0, x1, y1 = self.cfg.get("region", [0.0, 0.6, 1.0, 1.0])
        n = int(22 * self.strength)
        self.p = [(r.uniform(x0, x1) * self.W, r.uniform(y0, y1) * self.H, r.uniform(0, 1.6), r.uniform(1.2, 1.9)) for _ in range(n)]

    def apply(self, img, t):
        layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        for x, y, off, per in self.p:
            ph = ((t + off) % per) / per
            rad = (20 + 150 * ph) * self.s
            a = int(150 * (1 - ph))
            w = max(1, round(3 * self.s * 2))
            d.ellipse([x - rad, y - rad * 0.38, x + rad, y + rad * 0.38], outline=(235, 242, 245, a), width=w)
        return Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")


class Birds(FX):
    def setup(self):
        r = self.rng
        n = int(7 * self.strength)
        self.p = [(r.uniform(-0.3, 0.2) * self.W, r.uniform(0.08, 0.35) * self.H, r.uniform(16, 30) * self.s,
                   r.uniform(160, 300) * self.s, r.uniform(5, 8), r.uniform(0, 6.28)) for _ in range(n)]

    def apply(self, img, t):
        layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        for x0, y0, sz, sp, fr, ph in self.p:
            x = x0 + sp * t
            y = y0 + math.sin(t * 0.8 + ph) * 20 * self.s
            flap = math.sin(t * fr + ph) * sz * 0.5
            w = max(2, round(4 * self.s * 1.5))
            d.line([(x - sz, y - flap), (x, y), (x + sz, y - flap)], fill=(50, 50, 55, 200), width=w)
        return Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")


class Fog(FX):
    def setup(self):
        r = np.random.default_rng(self.rng.randint(0, 10 ** 6))
        small = (r.random((24, 48)) * 255).astype(np.uint8)
        tex = Image.fromarray(small).resize((self.W * 2, self.H), Image.BICUBIC).filter(ImageFilter.GaussianBlur(60 * self.s))
        y = np.linspace(0, 1, self.H, dtype=np.float32)[:, None]
        band = np.clip(1 - np.abs(y - float(self.cfg.get("height", 0.55))) * 2.2, 0, 1)
        a = (np.asarray(tex).astype(np.float32) / 255.0) * band * 140 * self.strength
        self.alpha = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
        self.white = Image.new("RGB", (self.W, self.H), (236, 238, 236))
        self.speed = 90 * self.s

    def apply(self, img, t):
        off = int(self.speed * t) % self.W
        m = self.alpha.crop((off, 0, off + self.W, self.H))
        return Image.composite(self.white, img, m)


class SunRays(FX):
    def setup(self):
        W, H = self.W, self.H
        ox, oy = self.cfg.get("origin", [0.75, -0.05])
        layer = Image.new("L", (W, H), 0)
        d = ImageDraw.Draw(layer)
        r = self.rng
        cx, cy = ox * W, oy * H
        for _ in range(9):
            ang = r.uniform(1.75, 2.75)  # pointing down-left by default
            if ox < 0.5:
                ang = math.pi - ang
            spread = r.uniform(0.03, 0.08)
            L = H * 1.4
            p1 = (cx + math.cos(ang - spread) * L, cy + math.sin(ang - spread) * L)
            p2 = (cx + math.cos(ang + spread) * L, cy + math.sin(ang + spread) * L)
            d.polygon([(cx, cy), p1, p2], fill=r.randint(40, 90))
        self.mask = layer.filter(ImageFilter.GaussianBlur(40 * self.s))
        self.col = Image.new("RGB", (W, H), (255, 240, 205))

    def apply(self, img, t):
        k = (0.75 + 0.25 * math.sin(t * 1.3)) * self.strength
        m = self.mask.point(lambda v: int(v * k))
        return Image.composite(self.col, img, m)


class LightLeak(FX):
    def setup(self):
        W, H = self.W, self.H
        y, x = np.mgrid[0:H:8, 0:W:8].astype(np.float32)
        d = np.sqrt((x - W * 0.95) ** 2 + (y - H * 0.08) ** 2) / (H * 0.6)
        a = np.clip(1 - d, 0, 1) ** 2 * 120 * self.strength
        self.mask = Image.fromarray(a.astype(np.uint8)).resize((W, H), Image.BILINEAR)
        self.col = Image.new("RGB", (W, H), (255, 190, 120))

    def apply(self, img, t):
        k = 0.7 + 0.3 * math.sin(t * 0.9)
        return Image.composite(self.col, img, self.mask.point(lambda v: int(v * k)))


class Heat(FX):
    """sun haze: gentle brightness breathing (desert)."""

    def apply(self, img, t):
        k = 1.0 + 0.025 * math.sin(t * 2.1) * self.strength
        return img.point(lambda v: min(255, int(v * k)))


FX_TYPES = {"rain": Rain, "snow": Snow, "petals": Petals, "leaves": Petals, "dust": Motes, "fireflies": Motes,
            "stars": Motes, "ripples": Ripples, "birds": Birds, "fog": Fog, "sun_rays": SunRays,
            "light_leak": LightLeak, "heat": Heat}


def make_fx(cfg, W, H, seed):
    t = cfg.get("type")
    if t not in FX_TYPES:
        sys.exit(f"unknown fx '{t}'. Use one of: {', '.join(FX_TYPES)}")
    return FX_TYPES[t](cfg, W, H, seed)


# --------------------------------------------------------------------------- finish (paper / vignette / grain)

class Finish:
    """vignette + paper texture + film grain, baked into a few multiply maps (one cheap op per frame)."""

    def __init__(self, W, H, look):
        self.W, self.H = W, H
        rng = np.random.default_rng(7)
        h4, w4 = H // 4, W // 4
        y, x = np.mgrid[0:h4, 0:w4].astype(np.float32)
        nx, ny = (x / w4 - 0.5) * 2, (y / h4 - 0.5) * 2
        vig = float(look.get("vignette", 0.22))
        base = 1 - vig * np.clip((nx ** 2 * 0.8 + ny ** 2 * 0.6) - 0.25, 0, 1.5) / 1.5
        if look.get("paper", False):
            n = rng.normal(0, 1, (h4, w4)).astype(np.float32)
            n = np.asarray(Image.fromarray(((n * 20) + 128).clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32)
            base = base * (1 - 0.06 + (n - 128) / 128 * 0.05)
        base_img = Image.fromarray((np.clip(base, 0, 1) * 255).astype(np.uint8)).resize((W, H), Image.BILINEAR)
        base_arr = np.asarray(base_img).astype(np.float32)
        amt = float(look.get("grain_amount", 1.0)) if look.get("grain", True) else 0.0
        self.maps = []
        for k in range(3 if amt > 0 else 1):
            g = rng.normal(0, 1, (H // 2, W // 2)).astype(np.float32)
            g = np.repeat(np.repeat(g, 2, 0), 2, 1)[:H, :W]
            m = np.clip(base_arr * (1 + g * 0.018 * amt), 0, 255).astype(np.uint8)
            mi = Image.fromarray(m)
            self.maps.append(Image.merge("RGB", (mi, mi, mi)))

    def apply(self, img, fi):
        # grain changes every 2 frames: alive like film, but cheap for the encoder
        return ImageChops.multiply(img, self.maps[(fi // 2) % len(self.maps)])


# --------------------------------------------------------------------------- labels (3D infographic marks)

def draw_labels(img, labels, local, H):
    s = H / 3840.0
    W = img.width
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for lb in labels:
        t0 = float(lb.get("t0", 0.3))
        t1 = lb.get("t1")
        a = min(1.0, max(0.0, (local - t0) / 0.3))
        if t1 is not None:
            a *= min(1.0, max(0.0, (float(t1) - local) / 0.3))
        if a <= 0:
            continue
        A = int(255 * a)
        x, y = lb.get("x", 0.5) * W, lb.get("y", 0.4) * H
        if "bracket" in lb:
            bx0, bx1, by = lb["bracket"]
            bx0, bx1, by = bx0 * W, bx1 * W, by * H
            w = max(2, round(7 * s))
            d.line([(bx0, by), (bx1, by)], fill=(245, 240, 225, A), width=w)
            d.line([(bx0, by - 26 * s), (bx0, by + 26 * s)], fill=(245, 240, 225, A), width=w)
            d.line([(bx1, by - 26 * s), (bx1, by + 26 * s)], fill=(245, 240, 225, A), width=w)
        f = font("semibold", round(float(lb.get("size", 64)) * s))
        txt = str(lb["text"])
        bb = d.textbbox((0, 0), txt, font=f)
        tw, th = bb[2] - bb[0], bb[3] - bb[1]
        px, py = 30 * s, 18 * s
        d.rounded_rectangle([x - tw / 2 - px, y - th / 2 - py, x + tw / 2 + px, y + th / 2 + py], radius=(th + 2 * py) / 2,
                            fill=(242, 234, 218, int(A * 0.92)))
        d.text((x - tw / 2 - bb[0], y - th / 2 - bb[1]), txt, font=f, fill=(40, 46, 40, A))
    return Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")


# --------------------------------------------------------------------------- captions

PUNCT_END = re.compile(r"[,.!?;:…»”\"]$")


def build_cues(words, mode, W, f, max_w):
    cues, cur = [], []

    def flush():
        if cur:
            cues.append(list(cur))
            cur.clear()

    for i, w in enumerate(words):
        if cur:
            gap = w["start"] - cur[-1]["end"]
            text = " ".join(x["w"] for x in cur + [w])
            lines = wrap(text, f, max_w)
            limit = 1 if mode == "frosted" else 2
            if gap > 0.45 or len(lines) > limit:
                flush()
        cur.append(w)
        if w.get("brk") or PUNCT_END.search(w["w"]):
            flush()
    flush()
    out = []
    for k, c in enumerate(cues):
        nxt = cues[k + 1][0]["start"] if k + 1 < len(cues) else c[-1]["end"] + 1.2
        out.append({"words": c, "start": c[0]["start"], "end": min(c[-1]["end"] + 0.9, nxt - 0.02)})
    return out


def wrap(text, f, max_w):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if f.getlength(t) <= max_w or not cur:
            cur = t
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


class Captions:
    def __init__(self, words, W, H, cfg):
        self.W, self.H = W, H
        s = H / 3840.0
        self.s = s
        self.mode = cfg.get("mode", "frosted")  # frosted (2D) | plain (3D)
        self.text_col = hex_rgb(cfg.get("color", "#1F3A2C" if self.mode == "frosted" else "#FFFFFF"))
        self.key_col = hex_rgb(cfg.get("key_color", "#D9822B" if self.mode == "frosted" else "#F2B263"))
        size = cfg.get("size", 74 if self.mode == "frosted" else 96)
        self.f = font("bold" if self.mode == "plain" else "semibold", round(size * s))
        self.brand_f = font("medium", round((44 if self.mode == "frosted" else 50) * s))
        self.y = cfg.get("y", 0.785 if self.mode == "frosted" else 0.745)
        self.brand_y = cfg.get("brand_y", 0.838 if self.mode == "frosted" else 0.838)
        self.brand_col = hex_rgb(cfg.get("brand_color", "#2E5A43" if self.mode == "frosted" else "#FFFFFF"))
        self.max_w = W * (0.70 if self.mode == "frosted" else 0.74)
        self.cues = build_cues(words, self.mode, W, self.f, self.max_w)
        self.layouts = [self.layout(c) for c in self.cues]
        self.off = set(map(tuple, cfg.get("off", [])))  # [[t0,t1], ...] no captions (brand stays)

    def layout(self, cue):
        text = " ".join(w["w"] for w in cue["words"])
        lines = wrap(text, self.f, self.max_w)
        asc, desc = self.f.getmetrics()
        lh = (asc + desc) * 1.12
        items, wi = [], 0
        block_h = lh * len(lines)
        top = self.y * self.H - block_h / 2
        widths = []
        for li, line in enumerate(lines):
            lw = self.f.getlength(line)
            widths.append(lw)
            x = self.W / 2 - lw / 2
            for tok in line.split():
                w = cue["words"][wi]
                items.append((x, top + li * lh, tok, w))
                x += self.f.getlength(tok + " ")
                wi += 1
        return {"items": items, "top": top, "h": block_h, "w": max(widths)}

    def active(self, t):
        for c, lay in zip(self.cues, self.layouts):
            if c["start"] - 0.08 <= t <= c["end"] + 0.15:
                return c, lay
        return None, None

    def band(self):
        """vertical strip that holds every caption and the signature; all drawing happens inside it."""
        if not hasattr(self, "_band"):
            tops = [l["top"] for l in self.layouts] or [self.y * self.H]
            bots = [l["top"] + l["h"] for l in self.layouts] or [self.y * self.H]
            y0 = max(0, int(min(tops) - 110 * self.s))
            y1 = min(self.H, int(max(max(bots), self.brand_y * self.H) + 110 * self.s))
            self._band = (y0, y1)
        return self._band

    def draw(self, img, t):
        cue, lay = self.active(t)
        if any(a <= t <= b for a, b in self.off):
            cue = None
        s = self.s
        y0, y1 = self.band()
        reg = img.crop((0, y0, self.W, y1))
        if cue is not None:
            fade_out = min(1.0, max(0.0, (cue["end"] + 0.15 - t) / 0.15))
            if self.mode == "frosted":
                reg = self.frost(reg, lay, fade_out, y0)
            layer = Image.new("RGBA", reg.size, (0, 0, 0, 0))
            d = ImageDraw.Draw(layer)
            for x, y, tok, w in lay["items"]:
                a = min(1.0, max(0.0, (t - (w["start"] - 0.06)) / 0.16)) * fade_out
                if a <= 0:
                    continue
                col = self.key_col if w.get("key") else self.text_col
                d.text((x, y - y0), tok, font=self.f, fill=col + (int(255 * a),))
            reg = reg.convert("RGBA")
            if self.mode == "plain":
                shadow = layer.split()[3].filter(ImageFilter.GaussianBlur(10 * s)).point(lambda v: int(v * 0.55))
                dark = Image.new("RGBA", reg.size, (0, 0, 0, 255))
                dark.putalpha(shadow)
                reg = Image.alpha_composite(reg, dark)
            reg = Image.alpha_composite(reg, layer)
        reg = self.brand(reg.convert("RGBA"), y0).convert("RGB")
        img = img.copy()
        img.paste(reg, (0, y0))
        return img

    def frost(self, reg, lay, k, y0):
        s = self.s
        pad_x, pad_y = 70 * s, 46 * s
        w = max(lay["w"] + 2 * pad_x, self.W * 0.46)
        h = lay["h"] + 2 * pad_y
        x0, by = int(self.W / 2 - w / 2), int(lay["top"] - pad_y + 6 * s - y0)
        box = (x0, max(0, by), int(x0 + w), min(reg.height, int(by + h)))
        region = reg.crop(box).filter(ImageFilter.GaussianBlur(22 * s))
        white = Image.new("RGB", region.size, (250, 250, 246))
        region = Image.blend(region, white, 0.72)
        mask = Image.new("L", region.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle([34 * s, 30 * s, region.width - 34 * s, region.height - 30 * s],
                                               radius=34 * s, fill=int(255 * k))
        mask = mask.filter(ImageFilter.GaussianBlur(24 * s))  # soft glowing edge, like frosted glass in the samples
        reg = reg.copy()
        reg.paste(region, box[:2], mask)
        return reg

    def brand(self, reg, y0):
        if not hasattr(self, "_brand"):
            layer = Image.new("RGBA", (self.W, reg.height), (0, 0, 0, 0))
            d = ImageDraw.Draw(layer)
            bb = d.textbbox((0, 0), BRAND, font=self.brand_f)
            x = self.W / 2 - (bb[2] - bb[0]) / 2 - bb[0]
            y = self.brand_y * self.H - y0 - (bb[3] - bb[1]) / 2 - bb[1]
            # halo so the signature reads on any background: light glow for dark text, dark glow for white text
            glow = Image.new("L", layer.size, 0)
            ImageDraw.Draw(glow).text((x, y), BRAND, font=self.brand_f, fill=255, stroke_width=max(1, round(10 * self.s)))
            glow = glow.filter(ImageFilter.GaussianBlur(14 * self.s)).point(lambda v: int(v * (0.75 if self.mode == "frosted" else 0.5)))
            halo = Image.new("RGBA", layer.size, (250, 250, 244, 255) if self.mode == "frosted" else (0, 0, 0, 255))
            halo.putalpha(glow)
            layer = Image.alpha_composite(layer, halo)
            d = ImageDraw.Draw(layer)
            d.text((x, y), BRAND, font=self.brand_f, fill=self.brand_col + (230,))
            self._brand = layer
        return Image.alpha_composite(reg, self._brand)


# --------------------------------------------------------------------------- timeline

class Timeline:
    def __init__(self, plan, base, W, H, duration):
        defaults = plan.get("defaults", {})
        self.shots = [Shot(d, i, base, W, H, defaults) for i, d in enumerate(plan["shots"])]
        self.shots.sort(key=lambda s: s.start)
        if self.shots:
            self.shots[-1].end = max(self.shots[-1].end, duration)
            self.shots[0].start = min(self.shots[0].start, 0.0)
        self.W, self.H = W, H

    def index_at(self, t):
        for i, s in enumerate(self.shots):
            if t < s.end or i == len(self.shots) - 1:
                return i
        return len(self.shots) - 1

    def frame(self, t):
        i = self.index_at(t)
        cur = self.shots[i]
        # transitions are centred on the boundary between shot i-1 and i, or i and i+1
        for a, b in ((i - 1, i), (i, i + 1)):
            if a < 0 or b >= len(self.shots):
                continue
            nxt = self.shots[b]
            tr, d = nxt.transition, nxt.xfade
            if tr == "cut":
                continue
            bt = nxt.start
            if bt - d / 2 <= t <= bt + d / 2:
                p = (t - (bt - d / 2)) / d
                A = self.shots[a].frame(t)
                B = nxt.frame(t)
                if tr == "crossfade":
                    return Image.blend(A, B, ease(p))
                col = (0, 0, 0) if tr == "dip_black" else (255, 255, 255)
                flat = Image.new("RGB", A.size, col)
                if tr == "flash":
                    return B if p >= 0.5 else Image.blend(A, flat, min(1, p * 2) * 0.85)
                return Image.blend(A, flat, p * 2) if p < 0.5 else Image.blend(flat, B, (p - 0.5) * 2)
        return cur.frame(t)

    def release_before(self, t):
        for s in self.shots:
            if s.end + 2 < t:
                s.unload()


# --------------------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--plan", required=True)
    ap.add_argument("--out")
    ap.add_argument("--sheet", help="write a contact sheet JPG (one frame per shot) instead of a video")
    ap.add_argument("--preview", action="store_true", help="540x960, faster encode")
    ap.add_argument("--still", type=float, action="append", help="write PNG of the frame at this second (repeatable)")
    ap.add_argument("--from", dest="t_from", type=float, default=0.0)
    ap.add_argument("--to", dest="t_to", type=float)
    ap.add_argument("--crf", type=int, default=18)
    ap.add_argument("--jobs", type=int, default=0, help="parallel frame workers (default: cores-1, max 6)")
    ap.add_argument("--x264-preset", default="medium")
    args = ap.parse_args()

    plan_path = os.path.abspath(args.plan)
    base = os.path.dirname(plan_path)
    plan = json.load(open(plan_path, encoding="utf-8"))
    ff = find_ffmpeg()

    W, H = plan.get("size", [2160, 3840])
    fps = int(plan.get("fps", 30))
    if args.preview or args.sheet:
        W, H = W // 4, H // 4
        fps = min(fps, 24) if args.preview else fps

    audio = resolve(base, plan["audio"])
    duration = audio_duration(ff, audio)
    words = json.load(open(resolve(base, plan.get("words", "words.json")), encoding="utf-8"))
    words = words["words"] if isinstance(words, dict) else words

    tl = Timeline(plan, base, W, H, duration)
    caps = Captions(words, W, H, plan.get("captions", {}))
    finish = Finish(W, H, plan.get("look", {}))

    def render(t, fi):
        img = tl.frame(t)
        img = finish.apply(img, fi)
        return caps.draw(img, t)

    if args.sheet:
        thumbs = []
        for s in tl.shots:
            t = min(s.end - 0.05, s.start + (s.end - s.start) * 0.6)
            im = render(t, 0)
            d = ImageDraw.Draw(im)
            d.rectangle([0, 0, W, 34], fill=(0, 0, 0))
            d.text((8, 6), f"{s.id} {s.start:.1f}-{s.end:.1f} {s.move}", font=font("semibold", 20), fill=(255, 255, 255))
            thumbs.append(im)
            s.unload()
        cols = 6
        rows = math.ceil(len(thumbs) / cols)
        sheet = Image.new("RGB", (cols * W, rows * H), (20, 20, 20))
        for k, im in enumerate(thumbs):
            sheet.paste(im, ((k % cols) * W, (k // cols) * H))
        sheet.save(args.sheet, quality=88)
        print(f"sheet: {args.sheet}  ({len(thumbs)} shots)")
        return

    if args.still:
        for t in args.still:
            p = os.path.join(base, f"still_{t:06.2f}.png")
            render(t, 0).save(p)
            print("still:", p)
        return

    if not args.out:
        sys.exit("--out is required for video")
    t0 = args.t_from
    t1 = min(args.t_to or duration, duration)
    n = int(round((t1 - t0) * fps))
    vbr = ["-maxrate", "8M", "-bufsize", "16M"] if args.preview else ["-maxrate", "45M", "-bufsize", "90M"]
    cmd = [ff, "-y", "-hide_banner", "-loglevel", "error",
           "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(fps), "-i", "-",
           "-ss", str(t0), "-t", str(t1 - t0), "-i", audio,
           "-map", "0:v", "-map", "1:a",
           "-c:v", "libx264", "-preset", "veryfast" if args.preview else args.x264_preset,
           "-crf", str(23 if args.preview else args.crf), *vbr, "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "256k", "-shortest", "-movflags", "+faststart", args.out]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    import time
    st = time.time()
    jobs = args.jobs or max(1, min((os.cpu_count() or 2) - 1, 6))
    times = [t0 + fi / fps for fi in range(n)]

    def report(fi, t):
        el = time.time() - st
        eta = el / max(fi, 1) * (n - fi)
        print(f"\r{fi}/{n} frames  t={t:5.1f}s  eta {eta / 60:4.1f} min", end="", flush=True)

    if jobs > 1:
        import multiprocessing as mp
        ctx = mp.get_context("fork" if "fork" in mp.get_all_start_methods() else "spawn")
        with ctx.Pool(jobs, initializer=_worker_init, initargs=(plan_path, W, H, fps, duration)) as pool:
            for fi, buf in enumerate(pool.imap(_worker_frame, enumerate(times), chunksize=max(4, fps // 2))):
                proc.stdin.write(buf)
                if fi % (fps * 5) == 0:
                    report(fi, times[fi])
    else:
        for fi, t in enumerate(times):
            proc.stdin.write(render(t, fi).tobytes())
            if fi % (fps * 5) == 0:
                tl.release_before(t)
                report(fi, t)
    proc.stdin.close()
    rc = proc.wait()
    print(f"\ndone: {args.out}  ({W}x{H} @ {fps} fps, {t1 - t0:.1f}s, {time.time() - st:.0f}s render, {jobs} jobs)"
          if rc == 0 else f"\nffmpeg failed ({rc})")
    sys.exit(rc)


_W = {}


def _worker_init(plan_path, W, H, fps, duration):
    base = os.path.dirname(plan_path)
    plan = json.load(open(plan_path, encoding="utf-8"))
    words = json.load(open(resolve(base, plan.get("words", "words.json")), encoding="utf-8"))
    words = words["words"] if isinstance(words, dict) else words
    _W["tl"] = Timeline(plan, base, W, H, duration)
    _W["caps"] = Captions(words, W, H, plan.get("captions", {}))
    _W["fin"] = Finish(W, H, plan.get("look", {}))
    _W["n"] = 0


def _worker_frame(arg):
    fi, t = arg
    tl, caps, fin = _W["tl"], _W["caps"], _W["fin"]
    img = caps.draw(fin.apply(tl.frame(t), fi), t)
    _W["n"] += 1
    if _W["n"] % 60 == 0:
        tl.release_before(t)
    return img.tobytes()


if __name__ == "__main__":
    main()
