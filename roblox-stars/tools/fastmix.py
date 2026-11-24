"""Mix sfx cues (fast_cues.json) over a looped crowd bed and mux with fast/####.png -> out/test.mp4"""
import json, os, subprocess, sys
slug = sys.argv[1]; dur = float(sys.argv[2])
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
vdir = os.path.join(ROOT, "videos", slug); sfx = os.path.join(ROOT, "sfx")
cues = json.load(open(os.path.join(vdir, "fast_cues.json")))
cues = [c for c in cues if c["t"] < dur]
args = ["ffmpeg", "-y", "-loglevel", "error", "-framerate", "30", "-i", os.path.join(vdir, "fast", "%04d.png"),
        "-stream_loop", "-1", "-i", os.path.join(sfx, "crowd.wav")]
for c in cues:
    args += ["-i", os.path.join(sfx, c["name"] + ".wav")]
fl = [f"[1:a]volume=0.35,atrim=0:{dur}[bed]"]
labels = ["[bed]"]
for k, c in enumerate(cues):
    d = int(c["t"] * 1000)
    fl.append(f"[{k + 2}:a]volume={c.get('vol', 1.0) * 0.9},adelay={d}|{d}[c{k}]")
    labels.append(f"[c{k}]")
fl.append("".join(labels) + f"amix=inputs={len(labels)}:normalize=0,alimiter=limit=0.9,atrim=0:{dur}[a]")
os.makedirs(os.path.join(vdir, "out"), exist_ok=True)
out = os.path.join(vdir, "out", "test.mp4")
args += ["-filter_complex", ";".join(fl), "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-pix_fmt", "yuv420p",
         "-crf", "20", "-c:a", "aac", "-b:a", "160k", "-shortest", out]
subprocess.run(args, check=True)
print(out, os.path.getsize(out))
