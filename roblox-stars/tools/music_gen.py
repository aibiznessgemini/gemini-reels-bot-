"""Code-made music bed for a video, arranged to the story (no stock audio).
python tools/music_gen.py <slug> [--plan plan.json]
plan: {"bpm":128, "end":47.8, "sections":[[start, mode, origin?], ...]}
modes: intro (filtered groove), full, drop (full + lead + crash), stop (tape stop -> silence),
       break (pads + soft hats), build (snare roll + riser), gap (silence), end (final hit + tail)
writes videos/<slug>/audio/music.wav and audio/beats.json (kick times, for the visual pulse)."""
import argparse, json, os, sys
import numpy as np
from scipy.signal import butter, sosfilt, sosfilt_zi

SR = 44100
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rng = np.random.default_rng(7)

# A minor: Am F C G, one chord per bar
CHORDS = [(57, 60, 64), (53, 57, 60), (48, 52, 55), (55, 59, 62)]
BASS = [33, 29, 36, 31]
ARP = [[69, 72, 76, 81], [65, 69, 72, 77], [64, 67, 72, 76], [62, 67, 71, 74]]


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def env(n, a, d):
    t = np.arange(n) / SR
    e = np.exp(-t / d)
    na = max(1, int(a * SR))
    e[:na] *= np.linspace(0, 1, na)
    return e


def filt(x, kind, f, order=2):
    sos = butter(order, f, btype=kind, fs=SR, output='sos')
    return sosfilt(sos, x)


def saw(f, n, detune=(0.0,)):
    t = np.arange(n) / SR
    out = np.zeros(n)
    for d in detune:
        ph = (t * f * (1 + d) + rng.random()) % 1.0
        out += 2 * ph - 1
    return out / len(detune)


def kick(n=int(0.45 * SR)):
    t = np.arange(n) / SR
    f = 45 + 110 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * env(n, 0.001, 0.22)
    x[:200] += rng.standard_normal(200) * np.linspace(0.6, 0, 200)
    return np.tanh(1.6 * x)


def clap():
    n = int(0.35 * SR)
    x = np.zeros(n)
    for k, o in enumerate((0, 0.011, 0.022)):
        i = int(o * SR)
        m = n - i
        x[i:] += rng.standard_normal(m) * env(m, 0.0005, 0.012 if k < 2 else 0.09)
    return filt(x, 'bandpass', (900, 4500)) * 1.8


def hat(open_=False):
    n = int((0.16 if open_ else 0.04) * SR)
    x = filt(rng.standard_normal(n), 'highpass', 7000, 4) * env(n, 0.0005, 0.05 if open_ else 0.011)
    return x


def snare():
    n = int(0.22 * SR)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * 190 * t) * env(n, 0.001, 0.05)
    nz = filt(rng.standard_normal(n), 'highpass', 1500) * env(n, 0.001, 0.08)
    return 0.6 * body + nz


def crash():
    n = int(2.2 * SR)
    return filt(rng.standard_normal(n), 'highpass', 3500, 2) * env(n, 0.002, 0.6) * 0.7


def boom():
    n = int(1.6 * SR)
    t = np.arange(n) / SR
    f = 32 + 70 * np.exp(-t / 0.12)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.002, 0.55)
    return np.tanh(2.2 * x) + 0.4 * filt(rng.standard_normal(n), 'lowpass', 900) * env(n, 0.002, 0.25)


def riser(n):
    t = np.linspace(0, 1, n)
    nz = rng.standard_normal(n)
    # 4 bands sweeping up, crossfaded
    out = np.zeros(n)
    bands = [(400, 1200), (1200, 3000), (3000, 7000), (7000, 14000)]
    for k, b in enumerate(bands):
        w = np.clip(1 - abs(t * 3 - k) , 0, 1)
        out += filt(nz, 'bandpass', b) * w
    f = 200 * 2 ** (t * 3.2)
    out += 0.25 * np.sin(2 * np.pi * np.cumsum(f) / SR)
    return out * t ** 1.6


def pluck(midi, n, bright=3500):
    x = saw(hz(midi), n, (-0.004, 0.0, 0.005)) * env(n, 0.002, 0.11)
    return filt(x, 'lowpass', bright)


def pad(chord, n):
    x = sum(saw(hz(m), n, (-0.006, 0.006)) for m in chord) / 3
    e = np.ones(n)
    a = int(0.25 * SR)
    e[:a] = np.linspace(0, 1, a)
    e[-a:] = np.linspace(1, 0, a)
    return filt(x, 'lowpass', 1400) * e


def lead(midi, n):
    t = np.arange(n) / SR
    sq = np.sign(np.sin(2 * np.pi * hz(midi) * t * (1 + 0.004 * np.sin(2 * np.pi * 5.5 * t))))
    return filt(sq, 'lowpass', 5000) * env(n, 0.003, 0.14)


def put(buf, x, t, g=1.0):
    i = int(round(t * SR))
    if i >= len(buf) or i + len(x) <= 0:
        return
    if i < 0:
        x, i = x[-i:], 0
    m = min(len(x), len(buf) - i)
    buf[i:i + m] += x[:m] * g


def render(plan):
    bpm = plan['bpm']
    B = 60.0 / bpm
    end = plan['end']
    N = int((end + 3.0) * SR)
    drums = np.zeros(N); bass = np.zeros(N); keys = np.zeros(N); fx = np.zeros(N); duck = np.ones(N)
    secs = plan['sections']
    beats = []
    K, CL, HT, HO, SN = kick(), clap(), hat(), hat(True), snare()
    for si, s in enumerate(secs):
        t0, mode = s[0], s[1]
        t1 = secs[si + 1][0] if si + 1 < len(secs) else end
        org = s[2] if len(s) > 2 else t0
        nb = int(np.ceil((t1 - org) / B)) + 1
        if mode in ('intro', 'full', 'drop'):
            lp = mode == 'intro'
            sub_d = np.zeros(N); sub_b = np.zeros(N); sub_k = np.zeros(N)
            for b in range(nb):
                tb = org + b * B
                if tb < t0 - 1e-6 or tb >= t1:
                    continue
                bar, beat = divmod(b, 4)
                ci = bar % 4
                put(sub_d, K, tb, 1.0); beats.append(round(tb, 3))
                put(duck, -0.7 * env(int(0.28 * SR), 0.003, 0.09), tb)
                if beat in (1, 3):
                    put(sub_d, CL, tb, 0.7)
                put(sub_d, HO, tb + B / 2, 0.35)
                for q in (0.25, 0.75):
                    put(sub_d, HT, tb + q * B, 0.25)
                # bass: 8ths, octave jump on the off
                for e8 in range(2):
                    m = BASS[ci] + (12 if e8 else 0)
                    n = int(B / 2 * SR * 0.9)
                    x = saw(hz(m), n, (-0.003, 0.003)) * env(n, 0.003, 0.18)
                    put(sub_b, filt(x, 'lowpass', 700 if not lp else 300), tb + e8 * B / 2, 0.55)
                # syncopated stabs
                for q in ((0.75,) if beat % 2 == 0 else (0.5,)):
                    n = int(0.2 * SR)
                    x = sum(pluck(m, n, 2500 if lp else 4200) for m in CHORDS[ci]) / 3
                    put(sub_k, x, tb + q * B, 0.45)
                if mode == 'drop':
                    for k in range(4):  # 16th arp lead
                        put(sub_k, lead(ARP[ci][(b * 4 + k) % 4] + 12, int(B / 4 * SR)), tb + k * B / 4, 0.16)
            if lp:
                sub_d = filt(sub_d, 'lowpass', 1500); sub_k = filt(sub_k, 'lowpass', 1200)
                sub_d *= 0.8
            if mode == 'drop':
                put(fx, crash(), t0, 0.8)
            drums += sub_d; bass += sub_b; keys += sub_k
        elif mode == 'break':
            nbar = int(np.ceil((t1 - org) / (4 * B)))
            for bar in range(nbar):
                tb = org + bar * 4 * B
                n = int(min(4 * B, t1 - tb) * SR)
                if n > SR // 4:
                    put(keys, pad(CHORDS[bar % 4], n), tb, 0.5)
                for b in range(4):
                    for q in (0.5,):
                        tt = tb + (b + q) * B
                        if tt < t1:
                            put(drums, HT, tt, 0.18)
                    tt = tb + b * B
                    if tt < t1:
                        n2 = int(B * SR)
                        put(keys, filt(saw(hz(ARP[bar % 4][b]), n2) * env(n2, 0.003, 0.25), 'lowpass', 2200), tt, 0.12)
        elif mode == 'build':
            L = t1 - t0
            put(fx, riser(int(L * SR)), t0, 0.5)
            t = t0
            while t < t1 - 0.02:  # snare roll that speeds up
                p = (t - t0) / L
                step = B if p < 0.35 else (B / 2 if p < 0.65 else (B / 4 if p < 0.88 else B / 8))
                put(drums, SN, t, 0.25 + 0.55 * p)
                if step >= B / 2 and abs(((t - org) / B) % 1) < 1e-3:
                    put(drums, K, t, 0.6); beats.append(round(t, 3))
                t += step
            nbar = int(np.ceil(L / (4 * B)))
            for bar in range(nbar):
                n = int(min(4 * B, t1 - t0 - bar * 4 * B) * SR)
                if n > 0:
                    put(keys, pad(CHORDS[bar % 4], n), t0 + bar * 4 * B, 0.35)
        elif mode == 'stop':
            pass  # handled after mixing (tape stop)
        elif mode == 'end':
            put(fx, boom(), t0, 0.9); put(fx, crash(), t0, 0.8)
            n = int(2.5 * SR)
            put(keys, pad(CHORDS[0], n) * np.linspace(1, 0, n), t0, 0.5)
            beats.append(round(t0, 3))
        if mode in ('drop',) or (mode == 'full' and si > 0 and secs[si - 1][1] in ('stop', 'gap', 'build')):
            put(fx, boom(), t0, 0.7)
    mix = drums * 0.9 + (bass + keys * 0.8) * np.clip(duck, 0.25, 1) + fx * 0.7
    # stops: tape stop from the section start over 0.45 s, then silence until the next section
    for si, s in enumerate(secs):
        if s[1] in ('stop', 'gap'):
            t0 = s[0]; t1 = secs[si + 1][0] if si + 1 < len(secs) else end
            i0, i1 = int(t0 * SR), int(t1 * SR)
            if s[1] == 'stop':
                L = int(0.45 * SR)
                rate = np.linspace(1, 0.05, L)
                pos = i0 + np.cumsum(rate)
                ts = np.interp(pos, np.arange(len(mix)), mix) * np.linspace(1, 0, L)
                tail = mix[i0:i1].copy()
                mix[i0:i1] = 0
                mix[i0:i0 + L] = ts
            else:
                fade = int(0.03 * SR)
                mix[i0:i0 + fade] *= np.linspace(1, 0, fade)
                mix[i0 + fade:i1] = 0
            # keep fx (risers/booms) that start inside: re-add crash/boom of the next section is outside anyway
    mix = mix[:int((end + 2.5) * SR)]
    mix /= np.abs(mix).max() + 1e-9
    mix = np.tanh(mix * 1.4) / np.tanh(1.4)
    st = np.stack([mix, np.roll(filt(mix, 'highpass', 300), int(0.012 * SR)) * 0.25 + mix], 1)
    st /= np.abs(st).max() * 1.05
    return st.astype(np.float32), sorted(set(beats))


def write_wav(path, st):
    import wave
    x = (np.clip(st, -1, 1) * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(x.tobytes())


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('slug'); ap.add_argument('--plan', default='')
    o = ap.parse_args()
    vdir = os.path.join(ROOT, 'videos', o.slug)
    plan = json.load(open(o.plan or os.path.join(vdir, 'music_plan.json')))
    st, beats = render(plan)
    write_wav(os.path.join(vdir, 'audio', 'music.wav'), st)
    json.dump(beats, open(os.path.join(vdir, 'audio', 'beats.json'), 'w'))
    print(f"music.wav {len(st) / SR:.1f}s, {len(beats)} kicks, bpm {plan['bpm']}")
