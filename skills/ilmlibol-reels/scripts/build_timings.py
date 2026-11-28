#!/usr/bin/env python3
"""Turn the AI's phrase transcript into exact word timings for captions.

The model that listens to the audio writes phrases.json (text + rough start/end per phrase).
Its clock is usually close but not exact. This script finds where speech really is in the
audio (energy detector), snaps every phrase onto the real speech edges, then spreads the
words of each phrase across the voiced parts by word length.

  python build_timings.py --audio input/audio.mp3 --phrases work/phrases.json --out work/words.json
  python build_timings.py --audio input/audio.mp3 --segments      # just print speech segments

phrases.json:
  {"phrases": [{"text": "Ha, musulmon boy boʻlgani", "start": 0.2, "end": 2.1, "keys": ["boy"]}, ...]}
  (a word-level {"words": [{"w","start","end","key"}]} file is also accepted and only refined)
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys

import numpy as np

SR = 16000
HOP = 0.01  # 10 ms


def find_ffmpeg():
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    try:
        import imageio_ffmpeg  # type: ignore
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        sys.exit("ffmpeg not found. Run:  pip install imageio-ffmpeg")


def load_audio(path):
    raw = subprocess.run([find_ffmpeg(), "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768.0


def speech_segments(x, min_sil=0.16, min_speech=0.08):
    hop = int(SR * HOP)
    win = hop * 3
    n = max(1, (len(x) - win) // hop)
    # band-limit a little: speech energy lives 150-4000 Hz; a simple pre-emphasis helps against music hum
    y = np.append(x[0], x[1:] - 0.94 * x[:-1])
    e = np.array([np.sqrt(np.mean(y[i * hop:i * hop + win] ** 2) + 1e-10) for i in range(n)])
    db = 20 * np.log10(e)
    lo, hi = np.percentile(db, 12), np.percentile(db, 97)
    thr = lo + 0.32 * (hi - lo)
    on = db > thr
    # hysteresis smoothing
    segs, start = [], None
    for i, v in enumerate(on):
        if v and start is None:
            start = i
        elif not v and start is not None:
            segs.append([start * HOP, i * HOP])
            start = None
    if start is not None:
        segs.append([start * HOP, n * HOP])
    merged = []
    for s in segs:
        if merged and s[0] - merged[-1][1] < min_sil:
            merged[-1][1] = s[1]
        else:
            merged.append(s)
    return [s for s in merged if s[1] - s[0] >= min_speech]


def nearest(edges, t, lim):
    best = None
    for e in edges:
        if abs(e - t) <= lim and (best is None or abs(e - t) < abs(best - t)):
            best = e
    return best


def weight(tok):
    letters = re.sub(r"[^\wʻ’'‘-]", "", tok)
    w = max(1, len(letters)) + 1.5
    if re.search(r"[,.!?;:…]$", tok):
        w += 2.5  # the voice usually pauses after punctuation
    return w


def spread(tokens, t0, t1, segs):
    """place tokens between t0 and t1, only inside voiced parts when possible."""
    voiced = [[max(a, t0), min(b, t1)] for a, b in segs if b > t0 and a < t1]
    voiced = [v for v in voiced if v[1] - v[0] > 0.04] or [[t0, t1]]
    total_v = sum(b - a for a, b in voiced)
    ws = [weight(t) for t in tokens]
    tot = sum(ws)
    out, acc = [], 0.0

    def at(frac):
        target = frac * total_v
        run = 0.0
        for a, b in voiced:
            if run + (b - a) >= target - 1e-9:
                return a + (target - run)
            run += b - a
        return voiced[-1][1]

    for tok, w in zip(tokens, ws):
        s = at(acc / tot)
        acc += w
        e = at(acc / tot)
        out.append([s, max(s + 0.05, e)])
    return out


def norm_key(s):
    return re.sub(r"[^\w]", "", s.lower().replace("ʻ", "").replace("'", "").replace("’", "").replace("‘", ""))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--audio", required=True)
    ap.add_argument("--phrases")
    ap.add_argument("--out")
    ap.add_argument("--segments", action="store_true", help="print speech segments and exit")
    ap.add_argument("--snap", type=float, default=0.6, help="max seconds a phrase edge may move (0 = off)")
    args = ap.parse_args()

    x = load_audio(args.audio)
    dur = len(x) / SR
    segs = speech_segments(x)
    if args.segments:
        print(json.dumps({"duration": round(dur, 2), "segments": [[round(a, 2), round(b, 2)] for a, b in segs]}, indent=1))
        return
    if not args.phrases or not args.out:
        sys.exit("--phrases and --out are required")

    data = json.load(open(args.phrases, encoding="utf-8"))
    if "words" in data and "phrases" not in data:
        # word-level input: group by pauses into pseudo-phrases so the same snapping applies
        phrases, cur = [], []
        for w in data["words"]:
            if cur and (w["start"] - cur[-1]["end"] > 0.3 or re.search(r"[.!?]$", cur[-1]["w"])):
                phrases.append(cur)
                cur = []
            cur.append(w)
        if cur:
            phrases.append(cur)
        data = {"phrases": [{"text": " ".join(w["w"] for w in p), "start": p[0]["start"], "end": p[-1]["end"],
                             "keys": [w["w"] for w in p if w.get("key")]} for p in phrases]}

    starts = [a for a, _ in segs]
    ends = [b for _, b in segs]
    words, report = [], []
    prev_end = 0.0
    phrases = sorted(data["phrases"], key=lambda p: p["start"])
    for i, p in enumerate(phrases):
        s, e = float(p["start"]), float(p["end"])
        if args.snap > 0:
            ns = nearest(starts, s, args.snap)
            ne = nearest(ends, e, args.snap)
            if ns is not None:
                s = ns
            if ne is not None and ne > s + 0.15:
                e = ne
        s = max(s, prev_end)
        if i + 1 < len(phrases):
            e = min(e, max(s + 0.2, float(phrases[i + 1]["start"]) + args.snap))
        e = min(max(e, s + 0.2), dur)
        shift = max(abs(s - p["start"]), abs(e - p["end"]))
        if shift > 0.35:
            report.append(f"  phrase {i + 1} moved {shift:.2f}s: {p['text'][:50]}")
        toks = p["text"].split()
        keys = {norm_key(k) for k in p.get("keys", [])}
        for tok, (ws, we) in zip(toks, spread(toks, s, e, segs)):
            words.append({"w": tok, "start": round(ws, 3), "end": round(we, 3), "key": norm_key(tok) in keys or any(
                k and norm_key(tok).startswith(k) for k in keys)})
        if words:
            words[-1]["brk"] = True  # a phrase never shares a caption with the next one
        prev_end = e

    json.dump({"duration": round(dur, 3), "words": words}, open(args.out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    voiced = sum(b - a for a, b in segs)
    covered = sum(1 for a, b in segs if any(w["start"] < b and w["end"] > a for w in words))
    print(f"words: {len(words)}  phrases: {len(phrases)}  audio: {dur:.1f}s  speech segments: {len(segs)}")
    print(f"speech segments covered by words: {covered}/{len(segs)}  (voiced {voiced:.1f}s)")
    missing = [(a, b) for a, b in segs if b - a > 0.5 and not any(w["start"] < b and w["end"] > a for w in words)]
    if missing:
        print("WARNING: speech with no words (listen again, a phrase may be missing):")
        for a, b in missing:
            print(f"  {a:.2f}-{b:.2f}s")
    if report:
        print("phrases snapped far from the given time (check them):")
        print("\n".join(report))
    print("wrote", args.out)


if __name__ == "__main__":
    main()
