#!/usr/bin/env python3
"""Audit plan.json before rendering. Fix every ERROR; read every WARN.

  python check.py --plan work/plan.json
"""
import argparse
import json
import os
import re
import statistics
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from render import MOVES, FX_TYPES, find_ffmpeg, audio_duration, resolve  # noqa: E402

TRANSITIONS = {"cut", "crossfade", "dip_black", "dip_white", "flash"}
GRADES = {"none", "storm", "warm", "cool", "night", "faded", "golden"}
PACE = {"frosted": (2.0, 5.5, 2.8, 3.8), "plain": (2.0, 8.0, 3.2, 5.0)}  # min, max, avg lo, avg hi


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--plan", required=True)
    args = ap.parse_args()
    base = os.path.dirname(os.path.abspath(args.plan))
    plan = json.load(open(args.plan, encoding="utf-8"))
    err, warn = [], []

    audio = resolve(base, plan.get("audio", ""))
    if not os.path.exists(audio):
        print("ERROR audio not found:", audio)
        sys.exit(1)
    dur = audio_duration(find_ffmpeg(), audio)
    wpath = resolve(base, plan.get("words", "words.json"))
    if not os.path.exists(wpath):
        err.append(f"words file not found: {wpath} (run build_timings.py)")
        words = []
    else:
        words = json.load(open(wpath, encoding="utf-8"))
        words = words["words"] if isinstance(words, dict) else words

    mode = plan.get("captions", {}).get("mode", "frosted")
    if mode not in PACE:
        err.append(f"captions.mode must be frosted or plain, not {mode}")
        mode = "frosted"
    mn, mx, alo, ahi = PACE[mode]
    shots = sorted(plan.get("shots", []), key=lambda s: s["start"])
    if not shots:
        err.append("no shots")
    lens = []
    prev_end, prev_move, prev_img = 0.0, None, None
    for i, s in enumerate(shots):
        sid = s.get("id", f"#{i + 1}")
        st, en = float(s["start"]), float(s["end"])
        L = en - st
        lens.append(L)
        if abs(st - prev_end) > 0.05:
            err.append(f"{sid}: starts at {st:.2f} but previous shot ends at {prev_end:.2f} (gap/overlap)")
        if L < mn:
            warn.append(f"{sid}: {L:.1f}s is short (< {mn}s)")
        if L > mx:
            warn.append(f"{sid}: {L:.1f}s is long (> {mx}s) - split the phrase into two images")
        if not s.get("says"):
            err.append(f"{sid}: 'says' missing - write the words this shot illustrates")
        if not s.get("prompt"):
            warn.append(f"{sid}: 'prompt' missing - keep the image prompt in the plan for re-generation")
        mv = s.get("move", "push_in")
        if mv not in MOVES:
            err.append(f"{sid}: unknown move {mv}")
        if mv == prev_move and s.get("image") != prev_img:
            warn.append(f"{sid}: same move '{mv}' as the shot before - vary the camera")
        if s.get("transition", "cut") not in TRANSITIONS:
            err.append(f"{sid}: unknown transition {s.get('transition')}")
        if s.get("grade", "none") not in GRADES:
            err.append(f"{sid}: unknown grade {s.get('grade')}")
        for f in s.get("fx", []):
            t = f if isinstance(f, str) else f.get("type")
            if t not in FX_TYPES:
                err.append(f"{sid}: unknown fx {t}")
        img = resolve(base, s.get("image", ""))
        if not os.path.exists(img):
            err.append(f"{sid}: image missing {img}")
        else:
            with Image.open(img) as im:
                w, h = im.size
            r = w / h
            if not 0.5 <= r <= 0.62:
                warn.append(f"{sid}: image is {w}x{h} (ratio {r:.2f}); 9:16 = 0.56 - it will be cropped")
            if w < 1080:
                warn.append(f"{sid}: image only {w}px wide - 4K output will look soft; generate larger if possible")
        prev_end, prev_move, prev_img = en, mv, s.get("image")
    if shots and prev_end < dur - 0.1:
        warn.append(f"last shot ends {prev_end:.2f}s, audio is {dur:.2f}s (renderer will extend it)")
    if shots and float(shots[0]["start"]) > 0.05:
        err.append("first shot must start at 0")
    if shots and shots[0]["end"] - shots[0]["start"] > 3.6:
        warn.append("first shot is longer than 3.6s - the hook should change picture fast")
    if lens:
        avg = statistics.mean(lens)
        if not alo <= avg <= ahi:
            warn.append(f"average shot {avg:.2f}s; this style targets {alo}-{ahi}s")
        print(f"shots: {len(lens)}  avg {avg:.2f}s  median {statistics.median(lens):.2f}s  audio {dur:.1f}s  "
              f"=> {len(lens) / dur * 60:.1f} shots/min")
    imgs = [s.get("image") for s in shots]
    reused = {p for p in imgs if imgs.count(p) > 1}
    for p in reused:
        idx = [i for i, q in enumerate(imgs) if q == p]
        if any(b - a == 1 for a, b in zip(idx, idx[1:])):
            continue
        warn.append(f"image {p} reused in non-adjacent shots - fine only for a deliberate callback")
    if words:
        if words[-1]["end"] > dur + 0.2:
            err.append(f"words run past the audio end ({words[-1]['end']:.2f} > {dur:.2f})")
        bad = [w["w"] for a, w in zip(words, words[1:]) if w["start"] < a["start"]]
        if bad:
            err.append(f"word times not in order near: {bad[:5]}")
        keys = sum(1 for w in words if w.get("key"))
        if keys == 0:
            warn.append("no key words - mark 1 key word in most phrases (Alloh, shukr, neʼmat...)")
        elif keys > len(words) * 0.2:
            warn.append(f"{keys} key words of {len(words)} - too many, highlight loses meaning")
        apos = [w["w"] for w in words if re.search(r"[oOgG]'", w["w"])]
        if apos:
            warn.append(f"use ʻ (U+02BB) in oʻ/gʻ, not ' : {apos[:4]}")
    for m in err:
        print("ERROR", m)
    for m in warn:
        print("WARN ", m)
    print("OK - ready to render" if not err else f"{len(err)} error(s)")
    sys.exit(1 if err else 0)


if __name__ == "__main__":
    main()
