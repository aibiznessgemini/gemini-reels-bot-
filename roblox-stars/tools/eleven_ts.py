"""Voice with exact word timings via ElevenLabs /with-timestamps (no whisper needed).
python tools/eleven_ts.py <slug> [--voice ID] [--model eleven_v4] [--tempo 1.12]
writes audio/raw.mp3, audio/voice.wav (tempo-adjusted), audio/words.json"""
import argparse, base64, json, os, re, subprocess, urllib.request
ap = argparse.ArgumentParser(); ap.add_argument("slug")
ap.add_argument("--voice", default="GoV1V2hQd1doxcYR2SuA"); ap.add_argument("--model", default="eleven_v4")
ap.add_argument("--tempo", type=float, default=1.12)
o = ap.parse_args()
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
vdir = os.path.join(ROOT, "videos", o.slug); adir = os.path.join(vdir, "audio"); os.makedirs(adir, exist_ok=True)
text = " ".join(l.strip() for l in open(os.path.join(vdir, "script.txt"), encoding="utf-8") if l.strip() and not l.startswith("#"))
req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{o.voice}/with-timestamps",
                             data=json.dumps({"text": text, "model_id": o.model}).encode(),
                             headers={"xi-api-key": os.environ.get("ELEVENLABS_API_KEY", "proxy-injected"),
                                      "Content-Type": "application/json"})
d = json.load(urllib.request.urlopen(req, timeout=300))
open(os.path.join(adir, "raw.mp3"), "wb").write(base64.b64decode(d["audio_base64"]))
al = d["alignment"]; ch, st, en = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]
words, cur = [], None
for c, s, e in zip(ch, st, en):
    if c.isspace():
        if cur: words.append(cur); cur = None
        continue
    if cur is None:
        cur = {"word": c, "start": s, "end": e}
    else:
        cur["word"] += c; cur["end"] = e
if cur: words.append(cur)
k = o.tempo
for w in words:
    w["start"] = round(w["start"] / k, 3); w["end"] = round(w["end"] / k, 3)
json.dump(words, open(os.path.join(adir, "words.json"), "w"), indent=0)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(adir, "raw.mp3"), "-af", f"atempo={k}", "-ar", "44100",
                "-ac", "1", os.path.join(adir, "voice.wav")], check=True)
dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0",
                            os.path.join(adir, "voice.wav")], capture_output=True, text=True).stdout)
print(f"{len(words)} words, {dur:.2f}s, {len(words) / dur * 60:.0f} wpm, first 15s: {sum(1 for w in words if w['start'] < 15)} words")
