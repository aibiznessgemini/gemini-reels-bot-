"""mix.py — soundtrack for a documentary board film: narration + generated music bed + word-synced SFX.

  python audio/mix.py --project projects/<slug> [--video build/video_silent.mp4] [--out ../output/x.mp4]

Reads <project>/cues.json (written by `node render.mjs --table`) and <project>/music.json (optional plan:
[{"start":0,"end":60,"mood":"mystery","intensity":0.35}, ...]). Music and SFX are synthesised here
(razgon-2d-studio/audio dsp + music), nothing is downloaded. Music is ducked under the voice.
The output audio is trimmed/padded to exactly the video length (frames / 30).
"""
import argparse, json, os, subprocess, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'razgon-2d-studio', 'audio'))
from dsp import SR, secs, noise, lp, hp, bp, expdec, sine, stereo, reverb, fade, normalize, place, write_wav, db, rms_db  # noqa
import music as MUSIC  # noqa
import sfx as RZ  # noqa


def rnd(seed):
    return np.random.default_rng(int(seed) + 1)


# ---- foley for paper boards ----
def paper(seed=0, **_):  # a sheet / photo landing on the table
    n = secs(0.45); r = rnd(seed); t = np.arange(n) / SR
    slap = bp(noise(n, seed), 700, 5000) * np.exp(-t / 0.035) * 0.9
    rustle = bp(noise(n, seed + 3), 1800, 7000) * np.exp(-t / 0.12) * (0.25 + 0.2 * r.random())
    thump = sine(90 + 30 * r.random(), n) * np.exp(-t / 0.05) * 0.5
    return normalize(reverb(stereo(slap + rustle + thump, (r.random() - 0.5) * 0.4, 0.3), 0.6, 0.12, seed), -3)


def slide(seed=0, **_):
    n = secs(0.5); t = np.arange(n) / SR; env = np.sin(np.pi * np.clip(t / 0.5, 0, 1)) ** 1.5
    return normalize(stereo(bp(noise(n, seed), 1500, 6000) * env, 0, 0.4), -4)


def marker(seed=0, dur=0.5, **_):  # felt-tip scribble
    n = secs(max(0.2, dur)); r = rnd(seed); t = np.arange(n) / SR
    am = 0.55 + 0.45 * np.sin(2 * np.pi * (7 + 5 * r.random()) * t + r.random() * 6) ** 2
    x = bp(noise(n, seed), 2500, 7500) * am * np.minimum(1, t / 0.03) * np.minimum(1, (n / SR - t) / 0.06)
    return normalize(stereo(x, (r.random() - 0.5) * 0.3, 0.2), -6)


def pencil(seed=0, dur=1.0, **_):
    n = secs(max(0.3, dur)); r = rnd(seed); t = np.arange(n) / SR
    am = 0.4 + 0.6 * (np.sin(2 * np.pi * 11 * t + r.random() * 6) > 0.2)
    x = hp(bp(noise(n, seed), 3000, 9000), 2500) * lp(am.astype(np.float32), 60) * np.minimum(1, (n / SR - t) / 0.08)
    return normalize(stereo(x, 0, 0.2), -8)


def stamp(seed=0, **_):  # rubber stamp: wooden thump + slap
    n = secs(0.6); t = np.arange(n) / SR
    body = sine(70 * np.exp(-t / 0.08) + 55, n) * np.exp(-t / 0.09) * 1.0
    slap = bp(noise(n, seed), 400, 3500) * np.exp(-t / 0.02) * 0.9
    return normalize(reverb(stereo(body + slap, 0, 0.2), 0.9, 0.18, seed), -1)


def knock(seed=0, **_):
    n = secs(0.35); t = np.arange(n) / SR
    x = sine(180 * np.exp(-t / 0.03) + 120, n) * np.exp(-t / 0.05) + bp(noise(n, seed), 500, 2500) * np.exp(-t / 0.015) * 0.7
    return normalize(reverb(stereo(x, 0.1, 0.2), 1.2, 0.25, seed), -2)


def highlight(seed=0, dur=0.45, **_):
    return marker(seed, dur) * db(-3)


FOLEY = {'paper': paper, 'slide': slide, 'marker': marker, 'pencil': pencil, 'stamp': stamp, 'knock': knock, 'highlight': highlight}


def make(name, c):
    if name in FOLEY: return FOLEY[name](**c)
    if name in RZ.LIB: return RZ.LIB[name]['fn'](**{k: v for k, v in c.items() if k in ('dur', 'seed', 'pitch')})
    raise KeyError(name)


def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()


def envelope(x, att=0.04, rel=0.5):
    mono = np.abs(x).mean(axis=1); hop = secs(0.01)
    fr = np.sqrt(np.add.reduceat(mono ** 2, np.arange(0, len(mono), hop)) / hop)
    lv = np.clip((20 * np.log10(fr + 1e-9) + 50) / 30, 0, 1); out = np.zeros_like(lv); v = 0.0
    a, r = np.exp(-0.01 / att), np.exp(-0.01 / rel)
    for i, s in enumerate(lv): v = a * v + (1 - a) * s if s > v else r * v + (1 - r) * s; out[i] = v
    return np.repeat(out, hop)[:len(mono)]


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--project', required=True); ap.add_argument('--video'); ap.add_argument('--out')
    a = ap.parse_args(); P = os.path.abspath(a.project)
    cues = json.load(open(os.path.join(P, 'cues.json')))
    voice = load(os.path.join(P, 'build', 'voiceover.wav'))
    video = a.video or os.path.join(P, 'build', 'video_silent.mp4')
    if os.path.exists(video):
        nf = int(subprocess.run(['ffprobe', '-v', 'error', '-count_packets', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', video], capture_output=True, text=True).stdout.strip())
        total = nf / 30.0
    else:
        total = cues['duration']
    n = secs(total)
    out = np.zeros((n + secs(4), 2), np.float32)
    # voice
    place(out, voice[:n], 0, 1.0)
    # music bed (ducked)
    plan_path = os.path.join(P, 'music.json')
    plan = json.load(open(plan_path)) if os.path.exists(plan_path) else [{'start': 0, 'end': total, 'mood': 'mystery', 'intensity': 0.35}]
    mus = MUSIC.render_score(plan, total, seed=7)[:n]
    env = envelope(out[:n])
    duck = db(-10 * env)[:, None]
    mus = mus * duck * db(-4)
    place(out, mus, 0, 1.0)
    # sfx
    sfxbus = np.zeros_like(out)
    for c in cues['cues']:
        try: y = make(c['name'], c)
        except KeyError: print('unknown sfx', c['name']); continue
        place(sfxbus, y, secs(max(0, c['t'])), db(c.get('gain', 0) - 6))
    out += sfxbus
    out = out[:n]
    # gentle fade at the end, peak safety
    k = secs(0.8); out[-k:] *= np.linspace(1, 0, k)[:, None]
    out = normalize(out, -1.0)
    wav = os.path.join(P, 'build', 'mix.wav'); write_wav(wav, out)
    # loudness to -14 LUFS (single pass), exact length
    final = os.path.join(P, 'build', 'mix_lufs.wav')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-af', f'loudnorm=I=-14:TP=-1.5:LRA=11,apad,atrim=0:{total:.6f}', '-ar', '48000', final], check=True)
    print(f'mix: {total:.3f} s  ({len(cues["cues"])} sfx cues) -> {final}')
    if os.path.exists(video) and a.out:
        os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', video, '-i', final, '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-b:a', '192k', '-t', f'{total:.6f}', '-movflags', '+faststart', a.out], check=True)
        print('video:', a.out)


if __name__ == '__main__':
    main()
