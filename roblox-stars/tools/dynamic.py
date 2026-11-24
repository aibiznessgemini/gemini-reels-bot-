"""Dynamic camera / edit pass over rendered frames (post, no re-render).
python tools/dynamic.py <slug> [--src fast] [--dst dyn] [--w 1080 --h 1920]
- every shot: slow push-in or pull-out + handheld drift
- every cut: snap zoom / whip pan / white flash (rotating styles)
- impact cues (bonk, thud, boom, ...): shake + zoom punch + RGB split
- music kicks (audio/beats.json): small zoom pulse
- grade: saturation, contrast, vignette
reads fast_log.txt ("shot N frames a-b"), audio/cues.json, audio/beats.json."""
import argparse, json, math, os, re, sys
from multiprocessing import Pool
import numpy as np
from PIL import Image, ImageEnhance

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FPS = 30
IMPACT = {'bonk': 1.0, 'thud': 0.8, 'boom': 1.0, 'rimshot': 0.5, 'boing': 0.45, 'ding': 0.35, 'cheer': 0.4,
          'confetti': 0.5, 'glitch': 0.9, 'jet': 0.5, 'click': 0.2}
G = {}


def setup(slug, src, dst, W, H):
    vd = os.path.join(ROOT, 'videos', slug)
    shots = [(int(a), int(b)) for a, b in re.findall(r'shot \d+ frames (\d+)-(\d+)', open(os.path.join(vd, 'fast_log.txt')).read())]
    cues = json.load(open(os.path.join(vd, 'audio', 'cues.json')))
    bp = os.path.join(vd, 'audio', 'beats.json')
    beats = json.load(open(bp)) if os.path.exists(bp) else []
    G.update(vd=vd, src=os.path.join(vd, src), dst=os.path.join(vd, dst), W=W, H=H, shots=shots,
             impacts=[(c['t'], IMPACT[c['name']] * c.get('vol', 1)) for c in cues if c['name'] in IMPACT],
             whoosh=[c['t'] for c in cues if c['name'] == 'whoosh'], beats=np.array(beats))
    os.makedirs(G['dst'], exist_ok=True)


def noise1(t, seed):
    # smooth pseudo-random in [-1,1]
    return (math.sin(t * 1.7 + seed) * 0.5 + math.sin(t * 2.9 + seed * 2.1) * 0.3 + math.sin(t * 5.3 + seed * 3.7) * 0.2)


def params(f):
    t = (f - 1) / FPS
    si = next(i for i, (a, b) in enumerate(G['shots']) if a <= f <= b)
    a, b = G['shots'][si]
    p = (f - a) / max(1, b - a)
    z = 1.08 + (0.07 * p if si % 3 != 2 else 0.07 * (1 - p))  # push-in, every 3rd shot pulls out
    dx = 14 * noise1(t, si) ; dy = 10 * noise1(t, si + 9); rot = 0.35 * noise1(t * 0.8, si + 4)
    flash = 0.0; blur = 0.0; split = 0.0
    # cut styles
    style = si % 3
    k_in = f - a          # frames since cut
    k_out = b - f         # frames until next cut
    if si > 0 and k_in < 7:
        e = math.exp(-k_in / 2.0)
        if style == 0:
            z += 0.28 * e
        elif style == 1:
            dx += (1 if si % 2 else -1) * 420 * math.exp(-k_in / 1.4) ; blur = max(blur, 1.0 * math.exp(-k_in / 1.4))
        else:
            flash = max(flash, 0.75 * math.exp(-k_in / 1.3)); z += 0.12 * e
    if si + 1 < len(G['shots']) and (si + 1) % 3 == 1 and k_out < 3:  # whip out before a whip-in
        dx -= (1 if (si + 1) % 2 else -1) * 380 * (3 - k_out) / 3; blur = max(blur, (3 - k_out) / 3)
    # impacts
    for (ti, s) in G['impacts']:
        d = t - ti
        if 0 <= d < 0.5:
            e = math.exp(-d / 0.09) * s
            z += 0.16 * e
            dx += 34 * e * noise1(d * 60, 1); dy += 34 * e * noise1(d * 60, 5); rot += 2.2 * e * noise1(d * 50, 3)
            split = max(split, 9 * e)
        if -0.06 < d < 0 and s >= 0.8:
            flash = max(flash, 0.35 * s)
    for tw in G['whoosh']:
        d = t - tw
        if 0 <= d < 0.25:
            blur = max(blur, 0.6 * (1 - d / 0.25)); dx += 60 * (1 - d / 0.25)
    if len(G['beats']):
        d = t - G['beats'][G['beats'] <= t + 1e-6][-1] if (G['beats'] <= t + 1e-6).any() else 9
        z += 0.025 * math.exp(-d / 0.08)
    return z, dx, dy, rot, flash, blur, split


VIG = None


def frame(f):
    global VIG
    W, H = G['W'], G['H']
    out = os.path.join(G['dst'], f'{f:04d}.png')
    im = Image.open(os.path.join(G['src'], f'{f:04d}.png')).convert('RGB')
    w, h = im.size
    z, dx, dy, rot, flash, blur, split = params(f)
    c, sn = math.cos(math.radians(rot)), abs(math.sin(math.radians(rot)))
    # keep the frame covered: grow zoom for rotation, clamp the offsets to the margin
    need_x = W / 2 * c + H / 2 * sn; need_y = W / 2 * sn + H / 2 * c
    z = max(z, 1.01 * need_x / (W / 2), 1.01 * need_y / (H / 2))
    s = (W / w) * z
    mx = s * w / 2 - need_x; my = s * h / 2 - need_y
    dx = max(-mx, min(mx, dx)); dy = max(-my, min(my, dy))
    sn = math.sin(math.radians(rot))
    # output -> input: in = C_in + R^-1 (out - C_out - d) / s
    A = c / s; B_ = sn / s; D = -sn / s; E = c / s
    ox, oy = W / 2 + dx, H / 2 + dy
    C = w / 2 - (A * ox + B_ * oy); F = h / 2 - (D * ox + E * oy)
    img = im.transform((W, H), Image.AFFINE, (A, B_, C, D, E, F), resample=Image.BICUBIC)
    img = ImageEnhance.Color(img).enhance(1.22)
    img = ImageEnhance.Contrast(img).enhance(1.08)
    x = np.asarray(img).astype(np.float32)
    if blur > 0.05:
        n = 7; L = int(70 * blur)
        acc = np.zeros_like(x)
        for k in range(n):
            acc += np.roll(x, int((k / (n - 1) - 0.5) * L), axis=1)
        x = acc / n
    if split > 0.5:
        sp = int(split)
        x[..., 0] = np.roll(x[..., 0], sp, axis=1); x[..., 2] = np.roll(x[..., 2], -sp, axis=1)
    if VIG is None:
        yy, xx = np.mgrid[0:H, 0:W]
        r = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
        VIG = (1 - 0.32 * np.clip(r - 0.55, 0, 1) ** 1.5)[..., None].astype(np.float32)
    x *= VIG
    if flash > 0:
        x = x * (1 - flash) + 255 * flash
    Image.fromarray(np.clip(x, 0, 255).astype(np.uint8)).save(out, compress_level=1)
    return f


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('slug'); ap.add_argument('--src', default='fast'); ap.add_argument('--dst', default='dyn')
    ap.add_argument('--w', type=int, default=1080); ap.add_argument('--h', type=int, default=1920)
    ap.add_argument('--only', default='')
    o = ap.parse_args()
    setup(o.slug, o.src, o.dst, o.w, o.h)
    last = G['shots'][-1][1]
    fs = [int(v) for v in o.only.split(',')] if o.only else list(range(1, last + 1))
    with Pool(4, initializer=setup, initargs=(o.slug, o.src, o.dst, o.w, o.h)) as pool:
        for i, _ in enumerate(pool.imap_unordered(frame, fs, chunksize=8)):
            if i % 200 == 0:
                print(i, flush=True)
    print('done', len(fs))
