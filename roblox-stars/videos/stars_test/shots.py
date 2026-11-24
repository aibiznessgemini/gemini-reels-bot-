"""stars_test: 10 s silent test clip with the rigged footballers (no voice)."""
from shotkit import *
from rbx import story
from rbx.story import *
from rbx.stars import ball, pitch
from rbx.players import player, kick_ball
V = Video(__file__); story.bind(V); V.end = 10.0
LINE = ["yamal", "neymar", "messi", "ronaldo", "mbappe", "vinijr", "haaland"]


@V.shot(1, 0.0, 2.5, "the seven line up")
def s1():
    pitch()
    rows = [(["neymar", "ronaldo", "messi"], -1.6), (["yamal", "mbappe", "vinijr", "haaland"], 1.6)]
    n = 0
    for keys, y in rows:
        for i, k in enumerate(keys):
            x = (i - (len(keys) - 1) / 2) * 2.4 + (0.0 if y < 0 else 0.0)
            P = player(k, 0.0, 2.5, "smile", loc=(x, y, 0))
            P.idle(0.0, 2.5, seed=n); n += 1
    sfx(0.0, "crowd", 0.6)
    cam = Cam(); cam.push(0.0, 2.5, (0, 0, 2.6), 24, 17, yaw=0, pitch=9, lens=30, lens1=32)


@V.shot(2, 2.5, 5.2, "Ronaldo run-up and strike")
def s2():
    pitch()
    R = player("ronaldo", 2.5, 5.2, "determined")
    R.run(2.5, 3.9, (0.6, -8, 0), (0.15, -1.9, 0), rate=2.6)
    R.pose(3.9, rot=180)
    R.rest(4.0)
    R.kick(4.35, "R")
    b = ball("b", (-0.05, -0.55, 0.45))
    kick_ball(b, 4.35, (2.5, 49, 2.6), height=4.0, dur=0.85, bounce=False)
    sfx(2.6, "footsteps", 0.7); sfx(4.33, "thud", 1.0); sfx(4.36, "whoosh", 0.8)
    cam = Cam(); cam.track(R, 2.5, 4.0, offset=(-3.5, -8.0, 2.2), look_up=1.8, lens=30)
    cam.key(5.2, (-3.0, -6.5, 2.6), (0.5, 8, 2.0), lens=30, ease="EASE_OUT")


@V.shot(3, 5.2, 7.2, "Vini + Yamal: shock, then joy")
def s3():
    pitch()
    A = player("vinijr", 5.2, 7.2, "shock", loc=(-1.3, 0, 0), rot=20)
    B = player("yamal", 5.2, 7.2, "shock", loc=(1.3, 0, 0), rot=-20)
    for P, s in ((A, 1), (B, -1)):
        P.pose(5.2, armL=(30, 20), armR=(30, 20), elbowL=100, elbowR=100)
        P.face(6.0, "joy")
        P.cheer(6.0, 7.2, jump=True)
    sfx(5.3, "gasp", 0.8); sfx(5.95, "cheer", 1.0)
    cam = Cam(); cam.push(5.2, 7.2, (0, 0, 3.0), 12.5, 11.5, yaw=0, pitch=5, lens=35)
    cam.crash(5.95, 35, 42)


@V.shot(4, 7.2, 10.0, "Ronaldo's jump-spin celebration, team runs in")
def s4():
    pitch()
    R = player("ronaldo", 7.2, 10.0, "joy")
    R.run(7.2, 7.9, (0, 5, 0), (0, 0.5, 0), rate=2.8)
    R.pose(7.9, rot=180)
    R.pose(7.95, hipz=-0.25, kneeL=45, kneeR=45, armL=(0, 20), armR=(0, 20))
    R.pose(8.05, loc=(0, 0.5, 0), hipz=0)
    R.pose(8.25, loc=(0, 0.5, 1.6), rot=90, kneeL=50, kneeR=50, legL=(30, 0), legR=(30, 0))
    R.pose(8.45, loc=(0, 0.5, 0), rot=0, kneeL=0, kneeR=0, legL=(0, 18), legR=(0, 18))
    R.pose(8.55, hipz=-0.35, kneeL=40, kneeR=40, armL=(-10, 55), armR=(-10, 55), elbowL=0, elbowR=0,
           torso=(0, -12, 0), head=(0, -18, 0))
    R.pose(10.0, hipz=-0.3, kneeL=36, kneeR=36, armL=(-12, 58), armR=(-12, 58), torso=(0, -14, 0))
    for i, k in enumerate(("messi", "neymar", "mbappe", "haaland")):
        x = (-1 if i % 2 == 0 else 1) * (3.2 + 1.4 * (i // 2))
        P = player(k, 7.2, 10.0, "joy", loc=(x, 9, 0))
        P.run(7.6 + 0.1 * i, 9.4, (x, 9 + i, 0), (x * 0.7, 2.5, 0), rate=2.6)
        P.pose(9.4, rot=0)
        P.cheer(9.4, 10.0, jump=False)
    sfx(7.2, "crowd", 0.9); sfx(8.0, "whoosh", 0.7); sfx(8.5, "stomp", 0.9); sfx(8.5, "cheer", 1.0); sfx(8.55, "confetti", 0.7)
    cam = Cam(); cam.push(7.2, 10.0, (0, 0.5, 2.6), 11, 8.5, yaw=-8, pitch=2, lens=30, pitch1=6)
