"""players_test: look/rig test of the 7 rigged footballers (no voice)."""
from shotkit import *
from rbx import story
from rbx.story import *
from rbx.stars import ball, pitch
from rbx.players import player, lineup, ORDER
V = Video(__file__); story.bind(V); V.end = 20.0

@V.shot(1, 0.0, 2.0, "lineup on the pitch")
def s1():
    pitch()
    ps = lineup(0.0, 2.0, gap=2.2, expr="smile")
    Cam().push(0.0, 2.0, (0, 0, 2.0), 19, 18, yaw=0, pitch=8, lens=32)

@V.shot(2, 2.0, 6.0, "Ronaldo faces: neutral 2.5, joy 3.5, shock 4.5, angry 5.5")
def s2():
    pitch()
    R = player("ronaldo", 2.0, 6.0, "neutral", blink=False)
    for t, e in ((2.0, "neutral"), (3.2, "joy"), (4.2, "shock"), (5.2, "angry")):
        R.face(t, e)
    h = R.head_pos()
    Cam().push(2.0, 6.0, tuple(h), 3.2, 3.1, yaw=-12, pitch=3, lens=50)

@V.shot(3, 6.0, 8.0, "Messi kicks (strike 7.0)")
def s3():
    pitch()
    M = player("messi", 6.0, 8.0, "determined")
    M.kick(7.0, "L")
    from rbx.players import kick_ball
    kick_ball(ball("b", (0.5, -1.3, 0.45)), 7.0, (2, -14, 0.45), height=2.5, dur=0.6)
    Cam().push(6.0, 8.0, (0, 0, 1.8), 10, 9.5, yaw=-60, pitch=6, lens=35)

@V.shot(4, 8.0, 10.0, "Mbappe sprint")
def s4():
    pitch()
    P = player("mbappe", 8.0, 10.0, "determined")
    P.run(8.0, 10.0, (0, 6, 0), (0, -6, 0))
    Cam().push(8.0, 10.0, (0, 0, 1.8), 11, 11, yaw=-80, pitch=6, lens=35)

@V.shot(5, 10.0, 12.0, "Vini cheer")
def s5():
    pitch()
    P = player("vinijr", 10.0, 12.0, "joy")
    P.cheer(10.0, 12.0, jump=False)
    Cam().push(10.0, 12.0, (0, 0, 2.2), 9, 8.5, yaw=-15, pitch=6, lens=35)

@V.shot(6, 12.0, 14.0, "Haaland + Neymar + Yamal walk")
def s6():
    pitch()
    for i, k in enumerate(("haaland", "neymar", "yamal")):
        P = player(k, 12.0, 14.0, "smile")
        P.walk(12.0, 14.0, ((i - 1) * 2.4, 3, 0), ((i - 1) * 2.4, -2, 0))
    Cam().push(12.0, 14.0, (0, 0, 2.0), 13, 12, yaw=-25, pitch=8, lens=35)

LIKENESS = False
FACE_KEYS = ["ronaldo", "mbappe", "vinijr", "haaland", "neymar", "yamal", "messi"]
for j, k in enumerate(FACE_KEYS):
    def mk(k=k, j=j):
        t0 = 14.0 + j * 2.0
        @V.shot(7 + j, t0, t0 + 2.0, f"face {k}")
        def s():
            pitch()
            P = player(k, t0, t0 + 2.0, "smile", blink=False, rot=-15, likeness=LIKENESS)
            h = P.head_pos()
            Cam().push(t0, t0 + 2.0, tuple(h), 3.0, 2.95, yaw=-15, pitch=3, lens=50)
    mk()
V.end = 28.0
