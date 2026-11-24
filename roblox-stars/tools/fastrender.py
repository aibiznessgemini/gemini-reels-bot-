"""Quick test render (no voice): every shot at reduced res/samples -> videos/<slug>/fast/####.png + cues.
blender -b -P tools/fastrender.py -- <slug> [pct] [samples]"""
import importlib.util, json, os, sys
import bpy
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import shotkit
from rbx.core import F, CUES
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
slug = argv[0]; pct = int(argv[1]) if len(argv) > 1 else 50; samples = int(argv[2]) if len(argv) > 2 else 8
vdir = os.path.join(shotkit.STUDIO, "videos", slug)
spec = importlib.util.spec_from_file_location("video_shots", os.path.join(vdir, "shots.py"))
mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
V = mod.V
out = os.path.join(vdir, "fast"); os.makedirs(out, exist_ok=True)
cues = []
for i in sorted(V.shots):
    S = V.build(i, samples=samples, pct=pct)
    sc = bpy.context.scene
    sc.render.use_motion_blur = False
    sc.eevee.use_raytracing = False
    sc.render.filepath = os.path.join(out, "")
    sc.render.image_settings.file_format = "PNG"
    cues += [dict(c) for c in CUES]
    bpy.ops.render.render(animation=True)
    print(f"shot {i} frames {sc.frame_start}-{sc.frame_end}", flush=True)
json.dump(cues, open(os.path.join(vdir, "fast_cues.json"), "w"))
