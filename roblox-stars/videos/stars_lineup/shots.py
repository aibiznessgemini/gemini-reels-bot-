"""stars_lineup: look test for the football star cast (no voice). Shot 1 = front row, 2 = backs, 3-9 = close-ups."""
from shotkit import *
from rbx import story
from rbx.story import *
from rbx import stars
from rbx.stars import *

V = Video(__file__); story.bind(V)
V.end = 18.0


def two_rows(t0, t1, back=False):
    pitch()
    front, rear = ["messi", "ronaldo", "neymar"], ["yamal", "mbappe", "vini", "haaland"]
    out = []
    for row, keys, y in ((0, front, -2.5), (1, rear, 1.5)):
        gap = 3.2
        x0 = -gap * (len(keys) - 1) / 2
        for i, k in enumerate(keys):
            ch = CAST[k](t0, t1, "smile" if not back else "neutral", loc=(x0 + i * gap, y, 0), rot=180 if back else 0)
            out.append(ch)
    ball("ball", (0.0, -4.6, 0.45))
    return out


@V.shot(1, 0.0, 2.0, "front: 3 in front, 4 behind")
def s1():
    two_rows(0.0, 2.0)
    cam = Cam(); cam.push(0.0, 2.0, (0, 0, 3.6), 34, 31, yaw=0, pitch=10, lens=30)


@V.shot(2, 2.0, 4.0, "backs: names + numbers")
def s2():
    two_rows(2.0, 4.0, back=True)
    cam = Cam(); cam.push(2.0, 4.0, (0, 0, 3.6), 34, 31, yaw=0, pitch=10, lens=30)


for j, k in enumerate(stars.ORDER):
    t0 = 4.0 + j * 2.0
    def mk(k=k, t0=t0):
        @V.shot(3 + j, t0, t0 + 2.0, f"close-up {k}")
        def s():
            pitch(crowd=True)
            ch = CAST[k](t0, t0 + 2.0, "grin" if k != "haaland" else "smug", loc=(0, 0, 0), rot=-15)
            ball("ball", (1.3, -1.2, 0.45))
            cam = Cam(); cam.push(t0, t0 + 2.0, (0, 0, 4.3), 11.5, 10.0, yaw=-12, pitch=6, lens=32)
    mk()
