"""check.py — mechanical audit of a documentary board film.
  python3 tools/check.py --project projects/<slug> [--video ../output/<slug>.mp4]
Checks: every narration line has a beat, timeline words resolved, on-screen phrases never repeat,
few words on screen per beat, the topic is in ../mavzular_tarixi.txt, and the MP4 is 1920x1080 / 30 fps
with audio and video exactly as long as the voiceover (±1 frame)."""
import argparse, json, os, subprocess, sys
ap = argparse.ArgumentParser(); ap.add_argument('--project', required=True); ap.add_argument('--video'); a = ap.parse_args()
P = a.project; bad = []; ok = []
tm = json.load(open(os.path.join(P, 'timings.json'))); B = json.load(open(os.path.join(P, 'beats.json')))
lines = {b['line'] for b in B['beats']}
miss = [i for i in range(len(tm['lines'])) if i not in lines]
(bad if miss else ok).append(f'beats for all {len(tm["lines"])} lines' + (f' — missing {miss}' if miss else ''))
(bad if B['errors'] else ok).append('timeline words resolved' + (f': {B["errors"]}' if B['errors'] else ''))
seen = {}
for b in B['beats']:
    for t in b['onscreen']:
        k = t.split(' (@')[0].strip().upper()
        if k in ('?',): continue
        if k in seen: bad.append(f'on-screen text repeated: "{k}" (lines {seen[k] + 1} and {b["line"] + 1})')
        seen[k] = b['line']
    words = sum(len(t.split(' (@')[0].split()) for t in b['onscreen'])
    if words > 6: bad.append(f'line {b["line"] + 1}: {words} words of screen text (keep it ≤ 6)')
    if not b['focus']: bad.append(f'line {b["line"] + 1}: no focus object')
ok.append(f'{len(seen)} on-screen phrases, none repeated') if not any('repeated' in x for x in bad) else None
slug = os.path.basename(os.path.abspath(P)).split('_', 1)[-1]
hist = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mavzular_tarixi.txt'), encoding='utf8').read()
(ok if f'| {slug} |' in hist else bad).append(f'topic "{slug}" recorded in mavzular_tarixi.txt')
if a.video:
    pr = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-count_packets', '-show_entries', 'stream=codec_type,width,height,r_frame_rate,nb_read_packets,duration', '-of', 'json', a.video], capture_output=True, text=True).stdout)
    v = next(s for s in pr['streams'] if s['codec_type'] == 'video'); au = next((s for s in pr['streams'] if s['codec_type'] == 'audio'), None)
    vd = int(v['nb_read_packets']) / 30
    (ok if (v['width'], v['height']) == (1920, 1080) else bad).append(f'size {v["width"]}x{v["height"]}')
    (ok if v['r_frame_rate'] == '30/1' else bad).append(f'fps {v["r_frame_rate"]}')
    (ok if abs(vd - tm['duration']) <= 1 / 30 + 1e-6 else bad).append(f'video {vd:.3f} s vs voice {tm["duration"]:.3f} s')
    if au: (ok if abs(float(au['duration']) - vd) <= 1 / 30 + 0.03 else bad).append(f'audio {float(au["duration"]):.3f} s vs video {vd:.3f} s')
    else: bad.append('no audio stream')
for x in ok: print('  ok  ', x)
for x in bad: print('  FAIL', x)
sys.exit(1 if bad else 0)
