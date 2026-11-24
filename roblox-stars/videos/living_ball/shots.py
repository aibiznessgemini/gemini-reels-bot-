"""living_ball: "In this world, the football is alive and chooses who scores."
25 shots keyed to script word indices (see script.txt). Players from rbx.players (scale 2: 3.5 units tall)."""
import math, random
from mathutils import Vector
from shotkit import *
from rbx import story
from rbx.story import *
from rbx.stars import pitch, ball as plain_ball
from rbx.players import player

V = Video(__file__); story.bind(V)
BR = 0.3                                    # ball radius
HEAD = 2.95                                 # head height at scale 2


# ------------------------------------------------------------------ the living ball
class Ball:
    """pos (location, faces where its eyes look) -> spin (rolling rotation) -> ball mesh. Eyes ride on pos."""
    def __init__(self, loc=(0, 0, BR), eyes=True, look=0.0):
        self.pos = empty("lb_pos", loc)
        self.spin = empty("lb_spin", (0, 0, 0), self.pos)
        self.mesh = plain_ball("lb_mesh", (0, 0, 0), r=BR, parent=self.spin)
        self.pos.rotation_euler[2] = math.radians(look)
        if eyes:
            Mw = mat("lb_eye_w", (0.97, 0.97, 0.97), 0.2, coat=0.6)
            Mp = mat("lb_eye_p", (0.02, 0.02, 0.02), 0.2, coat=0.6)
            self.eyes = []
            for s in (-1, 1):
                e = empty(f"lb_eye{s}", (s * 0.11, -BR * 0.86, BR * 0.32), self.pos)
                sphere(f"lb_ew{s}", 0.095, (0, 0, 0), Mw, (1, 0.55, 1.15), parent=e, seg=20)
                sphere(f"lb_ep{s}", 0.05, (0, -0.045, -0.005), Mp, (1, 0.5, 1), parent=e, seg=16)
                self.eyes.append(e)
        self._loc = Vector(loc)

    def key(self, t, loc=None, look=None, interp="BEZIER"):
        f = F(t)
        if loc is not None:
            self.pos.location = loc; self._loc = Vector(loc)
            self.pos.keyframe_insert("location", frame=f); set_interp(self.pos, "location", f, interp)
        if look is not None:
            self.pos.rotation_euler[2] = math.radians(look)
            self.pos.keyframe_insert("rotation_euler", index=2, frame=f)
        return self

    def roll(self, t0, t1, p1, hops=0, hop_h=0.5, look=None):
        p0 = Vector(self._loc); p1 = Vector(p1)
        d = p1 - p0
        lk = look if look is not None else math.degrees(math.atan2(d.x, -d.y)) + 180
        self.key(t0, tuple(p0), lk, "LINEAR")
        n = max(1, hops * 2)
        for k in range(1, n + 1):
            u = k / n
            p = p0.lerp(p1, u)
            if hops and k % 2 == 1:
                p.z += hop_h
            self.key(t0 + (t1 - t0) * u, tuple(p), interp="LINEAR" if not hops else "BEZIER")
        # rolling: rotate around the axis perpendicular to travel
        ang = d.length / BR
        self.spin.rotation_mode = "XYZ"
        self.spin.keyframe_insert("rotation_euler", frame=F(t0))
        axis = Vector((d.y, -d.x, 0)).normalized() if d.length > 1e-4 else Vector((1, 0, 0))
        # pos is yawed to `lk`; express the roll in pos space
        R = self.pos.matrix_world.to_3x3().inverted()
        ax = R @ axis
        cur = Vector(self.spin.rotation_euler)
        self.spin.rotation_euler = tuple(cur + ax * -ang)
        self.spin.keyframe_insert("rotation_euler", frame=F(t1))
        return self

    def hop(self, t, h=0.8, dur=0.35, squash=True):
        p = Vector(self._loc)
        self.key(t, tuple(p)); self.key(t + dur / 2, tuple(p + Vector((0, 0, h)))); self.key(t + dur, tuple(p))
        if squash:
            for tt, sc in ((t - 0.04, (1.15, 1.15, 0.8)), (t + 0.05, (0.9, 0.9, 1.15)), (t + dur, (1.12, 1.12, 0.85)),
                           (t + dur + 0.08, (1, 1, 1))):
                self.pos.scale = sc; self.pos.keyframe_insert("scale", frame=F(tt))
        return self

    def whirl(self, t0, t1, turns=4):
        self.spin.rotation_mode = "XYZ"
        self.spin.keyframe_insert("rotation_euler", frame=F(t0))
        self.spin.rotation_euler[2] += turns * math.tau
        self.spin.keyframe_insert("rotation_euler", frame=F(t1))
        self.pos.keyframe_insert("rotation_euler", index=2, frame=F(t0))
        self.pos.rotation_euler[2] += math.radians(turns * 360)
        self.pos.keyframe_insert("rotation_euler", index=2, frame=F(t1))
        return self

    def fly(self, pts, interp="BEZIER"):
        for t, p in pts:
            self.key(t, p, interp=interp)
        return self


def scene():
    pitch()


def cam_on(target, t0, t1, d0, d1, yaw=0, pitch_=6, lens=32, **kw):
    c = Cam(); c.push(t0, t1, target, d0, d1, yaw=yaw, pitch=pitch_, lens=lens, **kw)
    return c


# ------------------------------------------------------------------ HOOK: Haaland's monster kick
@S(1, 0, 8, "HOOK: Haaland winds up and smashes the ball")
def s01(t0, t1):
    scene()
    H = player("haaland", t0, t1, "angry", loc=(-3.2, 0, 0), rot=90)
    H.run(t0, t1 - 0.55, (-3.2, 0, 0), (-1.0, 0, 0), rate=2.6)
    H.pose(t1 - 0.5, rot=90)
    H.kick(t1 - 0.12, "R", power=1.3)
    B = Ball((0.0, 0.0, BR), look=-60)
    B.key(t0)
    sfx(t0 + 0.05, "footsteps", 0.7); sfx(t1 - 0.14, "thud", 1.0)
    c = cam_on((-0.8, 0, 1.6), t0, t1, 9.0, 6.5, yaw=-30, pitch_=4, lens=30)
    c.crash(t1 - 0.3, 30, 40)


@S(2, 8, 18, "the ball flies off... and comes straight back into his face. BONK")
def s02(t0, t1):
    scene()
    H = player("haaland", t0, t1, "smug", loc=(-1.0, 0, 0), rot=90)
    H.pose(t0, legR=(70, 0), kneeR=20, torso=(-15, 10, 0))
    H.rest(t0 + 0.5)
    tb = w(16)                                       # "face"
    B = Ball((0.6, 0, 1.0), look=-90)
    B.fly([(t0, (0.6, 0, 1.0)), (t0 + 0.5, (8, 0, 4.5)), (tb - 0.35, (6, 0.2, 4.0)), (tb, (-0.35, 0, HEAD))])
    B.key(tb + 0.45, (2.0, -0.6, BR)); B.key(tb + 0.7, (2.6, -0.8, 0.9)); B.key(tb + 0.9, (3.1, -1.0, BR))
    H.face(tb - 0.4, "shock")
    H.fall(tb, back=True)
    H.face(tb, "furious")
    sfx(t0 + 0.02, "whoosh", 0.8); sfx(tb - 0.4, "whoosh", 0.9); sfx(tb, "bonk", 1.0); sfx(tb + 0.3, "thud", 0.8)
    c = cam_on((0.5, 0, 2.2), t0, t1, 10.5, 9.0, yaw=-20, pitch_=5, lens=30)
    c.handheld(1.0)


# ------------------------------------------------------------------ RULE
@S(3, 18, 26, "wide stadium, the ball alone in the centre - it hops: alive")
def s03(t0, t1):
    scene()
    B = Ball((0, 0, BR), look=0)
    B.key(t0)
    B.hop(w(25), 0.9); B.hop(w(25) + 0.45, 0.5)
    sfx(w(25), "boing", 0.9); sfx(t0, "crowd", 0.5)
    c = cam_on((0, 0, 0.6), t0, t1, 30, 6.5, yaw=0, pitch_=14, lens=30, pitch1=6)


@S(4, 26, 32, "it looks around at three players - it chooses")
def s04(t0, t1):
    scene()
    ps = [player(k, t0, t1, "worried", loc=p, rot=r) for k, p, r in
          (("mbappe", (-3.2, 2.2, 0), 220), ("vinijr", (0, 3.4, 0), 180), ("yamal", (3.2, 2.2, 0), 140))]
    B = Ball((0, 0, BR), look=0)
    B.key(t0, look=0); B.key(t0 + 0.5, look=-50); B.key(t0 + 1.0, look=50); B.key(t1, look=0)
    for P in ps:
        P.idle(t0, t1)
    sfx(t0 + 0.5, "click", 0.6); sfx(t0 + 1.0, "click", 0.6)
    cam_on((0, 1.2, 1.4), t0, t1, 15, 13.5, yaw=0, pitch_=14, lens=30)


# ------------------------------------------------------------------ EXAMPLES
@S(5, 32, 35, "It loves Messi: ball bounces happily at his feet")
def s05(t0, t1):
    scene()
    M = player("messi", t0, t1, "smile", loc=(0.8, 0, 0), rot=-20)
    M.idle(t0, t1)
    B = Ball((-0.6, -0.9, BR), look=25)
    B.key(t0); B.hop(t0 + 0.15, 0.6); B.hop(t0 + 0.6, 0.6)
    sfx(t0 + 0.2, "sparkle", 0.8)
    cam_on((0.2, 0, 1.8), t0, t1, 7.5, 6.8, yaw=-10, pitch_=6, lens=32)


@S(6, 35, 43, "it follows him everywhere, like a puppy")
def s06(t0, t1):
    scene()
    M = player("messi", t0, t1, "smile")
    M.walk(t0, t1, (-6, 0, 0), (5, 0, 0), rate=1.8)
    B = Ball((-8, -0.6, BR))
    B.roll(t0, t1, (3.2, -0.6, BR), hops=6, hop_h=0.35, look=-60)
    sfx(t0 + 0.3, "boing", 0.5); sfx(t0 + 1.2, "boing", 0.5)
    c = Cam(); c.track(M, t0, t1, offset=(-1.0, -11.0, 1.6), look_up=1.4, lens=30)


@S(7, 43, 48, "It hates Ronaldo's free kicks: power stance")
def s07(t0, t1):
    scene()
    R = player("ronaldo", t0, t1, "determined", loc=(0, -2.6, 0), rot=180)
    R.pose(t0, legL=(0, 12), legR=(0, 12), armL=(-5, 18), armR=(-5, 18), torso=(0, -4, 0))
    B = Ball((0, -0.6, BR), look=180)
    B.key(t0, look=150); B.key(t1, look=180)
    sfx(t0, "crowd", 0.6)
    cam_on((0, -2.6, 2.2), t0, t1, 8.5, 7.5, yaw=180, pitch_=2, lens=32)


@S(8, 48, 52, "Way too much power: run-up and BOOM")
def s08(t0, t1):
    scene()
    R = player("ronaldo", t0, t1, "furious")
    R.run(t0, t1 - 0.5, (0, -5, 0), (0.15, -1.3, 0), rate=2.8)
    R.pose(t1 - 0.48, rot=180)
    R.kick(t1 - 0.12, "R", power=1.3)
    B = Ball((0, -0.2, BR), look=180)
    B.key(t0)
    sfx(t0, "footsteps", 0.8); sfx(t1 - 0.14, "boom", 0.7)
    c = cam_on((0, -1.8, 1.6), t0, t1, 8, 6, yaw=140, pitch_=3, lens=30)
    c.crash(t1 - 0.25, 30, 42)


@S(9, 52, 60, "the ball stops in mid-air... and drops; Ronaldo stares")
def s09(t0, t1):
    scene()
    R = player("ronaldo", t0, t1, "determined", loc=(0, -3, 0), rot=180)
    R.pose(t0, legR=(60, 0), kneeR=20, torso=(15, 10, 0))
    R.rest(t0 + 0.4)
    ts, td = w(55), w(59)
    B = Ball((0, -1.5, 1.0), look=0)
    B.fly([(t0, (0, -1.5, 1.0)), (ts, (0, 6, 5.0))])
    B.key(td - 0.05, (0, 6, 5.0)); B.key(td, (0, 6.0, 5.15))
    B.key(td + 0.4, (0, 6, BR), interp="LINEAR"); B.hop(td + 0.4, 0.4, 0.3)
    R.face(ts, "shock"); R.pose(ts, armL=(20, 35), armR=(20, 35), elbowL=60, elbowR=60)
    R.face(td + 0.4, "sad")
    sfx(ts, "rise", 0.0); sfx(ts, "crickets", 0.8); sfx(td + 0.38, "thud", 0.8)
    cam_on((0, 0.5, 2.8), t0, t1, 11, 10, yaw=200, pitch_=8, lens=28)


@S(10, 60, 65, "Mbappe tried to outrun it: sprint beside the ball")
def s10(t0, t1):
    scene()
    P = player("mbappe", t0, t1, "determined")
    P.run(t0, t1, (-8, 0.8, 0), (8, 0.8, 0), rate=3.2)
    B = Ball((-6, -0.6, BR))
    B.roll(t0, t1, (10, -0.6, BR), look=-90)
    sfx(t0, "whoosh", 0.7); sfx(t0 + 0.2, "footsteps", 0.9)
    c = Cam(); c.track(P, t0, t1, offset=(0.5, -10.5, 1.2), look_up=1.6, lens=30)


@S(11, 65, 67, "Bad idea. (Mbappe close-up)")
def s11(t0, t1):
    scene()
    P = player("mbappe", t0, t1, "determined", rot=-90)
    P._gait(t0, t1, 3.2, 40, 46, 0.24, 14, 70, 85)
    c = cam_on((0, 0, HEAD - 0.1), t0, t1, 3.6, 3.2, yaw=-60, pitch_=0, lens=45)
    c.handheld(1.5)
    sfx(t0, "rimshot", 0.0)


@S(12, 67, 75, "the ball zooms off the other way; Mbappe skids and looks back")
def s12(t0, t1):
    scene()
    P = player("mbappe", t0, t1, "shock")
    P.run(t0, t0 + 0.8, (-2, 0.8, 0), (2.5, 0.8, 0), rate=3.2)
    P.pose(t0 + 0.8, rot=-90); P.rest(t0 + 1.0)
    P.look(t0 + 1.2, 70, 0)
    B = Ball((1.5, -0.6, BR))
    B.roll(t0 + 0.2, t0 + 1.1, (-14, -0.6, BR), look=90)
    sfx(t0 + 0.2, "whoosh", 1.0); sfx(t0 + 0.25, "jet", 0.4)
    cam_on((0.5, 0, 1.6), t0, t1, 12, 11, yaw=0, pitch_=5, lens=30)


@S(13, 75, 82, "Neymar's step-over in front of the ball")
def s13(t0, t1):
    scene()
    N = player("neymar", t0, t1, "smug", loc=(0, 0, 0), rot=0)
    B = Ball((0, -1.2, BR), look=180)
    B.key(t0)
    t, k = t0 + 0.2, 0
    while t < t1 - 0.2:
        sd = "L" if k % 2 == 0 else "R"
        o = "R" if sd == "L" else "L"
        sg = 1 if sd == "L" else -1
        N.pose(t, **{f"leg{sd}": (35, -sg * 25), f"knee{sd}": 30, f"leg{o}": (0, 0), f"knee{o}": 15,
                     "torso": (sg * 14, 6, sg * 8), f"arm{o}": (10, 35), f"arm{sd}": (0, 15), "hipz": -0.12})
        N.pose(t + 0.16, **{f"leg{sd}": (0, sg * 10), f"knee{sd}": 10})
        t += 0.32; k += 1
    sfx(t0 + 0.2, "whoosh", 0.4); sfx(t0 + 0.84, "whoosh", 0.4)
    cam_on((0, -0.4, 1.5), t0, t1, 8, 7, yaw=0, pitch_=6, lens=32)


@S(14, 82, 87, "the ball tricks him back - circles around him")
def s14(t0, t1):
    scene()
    N = player("neymar", t0, t1, "confused" if False else "worried")
    B = Ball((0, -1.2, BR), look=180)
    steps = 8
    for k in range(steps + 1):
        a = -math.pi / 2 + k / steps * math.tau * 1.25
        B.key(t0 + (t1 - t0) * k / steps, (math.cos(a) * 1.3, math.sin(a) * 1.3, BR), look=math.degrees(a) + 90)
    for k, yaw in enumerate((0, 60, 130, 200, 260)):
        N.pose(t0 + k * (t1 - t0) / 5, rot=yaw)
        N.look(t0 + k * (t1 - t0) / 5 + 0.1, 25, 10)
    sfx(t0 + 0.1, "whoosh", 0.6); sfx(t0 + 0.6, "whoosh", 0.6)
    cam_on((0, 0, 1.6), t0, t1, 8.5, 8.0, yaw=0, pitch_=18, lens=32)


@S(15, 87, 90, "Down he goes!")
def s15(t0, t1):
    scene()
    N = player("neymar", t0, t1, "shock", rot=200)
    N.pose(t0, legL=(20, 20), legR=(-10, 15), torso=(20, 0, 10))
    N.fall(t0 + 0.12, back=True, dur=0.4)
    B = Ball((1.4, -0.6, BR), look=0)
    B.key(t0); B.hop(t0 + 0.6, 0.5)
    sfx(t0 + 0.45, "thud", 1.0); sfx(t0 + 0.55, "aww", 0.6)
    c = cam_on((0, 0, 1.0), t0, t1, 8, 7, yaw=-20, pitch_=8, lens=30)
    c.crash(t0 + 0.45, 30, 36)


# ------------------------------------------------------------------ TURN: Yamal
@S(16, 90, 95, "Then the youngest one, Yamal: hero walk-in, low angle")
def s16(t0, t1):
    scene()
    Y = player("yamal", t0, t1, "determined")
    Y.walk(t0, t1, (0, 6, 0), (0, 1.5, 0), rate=1.6)
    sfx(t0, "rise", 0.6)
    cam_on((0, 2.5, 2.4), t0, t1, 8.5, 7.5, yaw=0, pitch_=-6, lens=28)


@S(17, 95, 102, "walked up to the ball... and smiled")
def s17(t0, t1):
    scene()
    Y = player("yamal", t0, t1, "smile", loc=(0, 1.5, 0))
    Y.walk(t0, t0 + 1.0, (0, 1.5, 0), (0, 0.6, 0), rate=1.6)
    Y.rest(t0 + 1.1); Y.look(t0 + 1.2, 0, 22)
    B = Ball((0, -1.3, BR), look=180)
    B.key(t0)
    B.key(w(101) - 0.05, look=180); B.key(w(101) + 0.2, look=180)
    sfx(w(101), "sparkle", 0.8)
    c = cam_on((0, 0.6, HEAD - 0.2), t0, t1, 5.5, 4.2, yaw=-15, pitch_=0, lens=40)


@S(18, 102, 109, "the ball rolls straight to his feet")
def s18(t0, t1):
    scene()
    Y = player("yamal", t0, t1, "smile", loc=(0, 0.6, 0))
    Y.pose(t0, head=(0, 22, 0))
    B = Ball((0, -6, BR), look=180)
    B.roll(t0 + 0.1, t1 - 0.6, (0, -0.35, BR), hops=2, hop_h=0.25, look=180)
    B.hop(t1 - 0.5, 0.35, 0.3)
    sfx(t1 - 0.6, "ding", 0.8)
    cam_on((0, -0.6, 1.3), t0, t1, 8.5, 7.5, yaw=-60, pitch_=8, lens=30)


@S(19, 109, 114, "That's when I noticed something - slow push, everyone watching")
def s19(t0, t1):
    scene()
    Y = player("yamal", t0, t1, "smile", loc=(0, 0.6, 0))
    Y.pose(t0, head=(0, 20, 0))
    for k, p in (("messi", (-4.5, 4, 0)), ("haaland", (4.5, 4.5, 0))):
        P = player(k, t0, t1, "shock", loc=p, rot=180 + (25 if p[0] < 0 else -25))
    B = Ball((0, -0.35, BR), look=180)
    B.key(t0)
    cam_on((0, 0.5, 1.6), t0, t1, 12, 9.5, yaw=0, pitch_=8, lens=30)


@S(20, 114, 123, "the ball never runs from someone who is smiling - Neymar's grin, ball snuggles")
def s20(t0, t1):
    scene()
    N = player("neymar", t0, t1, "joy", loc=(0, 0.4, 0))
    B = Ball((0, -0.5, BR), look=180)
    B.key(t0); B.hop(w(117), 0.3, 0.28); B.hop(w(122), 0.3, 0.28)
    sfx(w(122), "sparkle", 0.7)
    cam_on((0, 0.4, HEAD - 0.1), t0, w(119), 3.8, 3.4, yaw=-12, pitch_=0, lens=45)
    c = Cam(); c.key(w(119), orbit_pos((0, -0.5, 0.5), 3.5, -40, 15), (0, -0.5, 0.4), lens=35)
    c.key(t1, orbit_pos((0, -0.5, 0.5), 3.2, -20, 12), (0, -0.5, 0.4), lens=35)


# ------------------------------------------------------------------ PAYOFF
RING = ["ronaldo", "messi", "neymar", "mbappe", "vinijr", "haaland", "yamal"]


def ring(t0, t1, expr="joy", r=4.4):
    out = []
    for i, k in enumerate(RING):
        a = i / len(RING) * math.tau - math.pi / 2
        p = (math.cos(a) * r, math.sin(a) * r, 0)
        out.append(player(k, t0, t1, expr, loc=p, rot=facing(p, (0, 0, 0)), blink=False))
    return out


@S(21, 123, 131, "So all seven of them smiled at it: ring around the ball")
def s21(t0, t1):
    scene()
    ps = ring(t0, t1, "smile")
    for P in ps:
        P.face(w(128), "joy")
    B = Ball((0, 0, BR), look=0)
    B.key(t0)
    sfx(w(128), "sparkle", 0.9)
    c = Cam(); c.orbit(t0, t1, (0, 0, 0.8), 21, 10, 60, pitch=50, lens=30)


@S(22, 131, 135, "At the same time: low angle from the ball's eyes")
def s22(t0, t1):
    scene()
    ring(t0, t1, "joy", r=3.6)
    c = Cam(); c.key(t0, (0, 0, 0.5), (0, -3.6, 2.6), lens=22); c.key(t1, (0, 0, 0.5), (1.2, -3.4, 2.6), lens=22)
    c.handheld(0.6)


@S(23, 135, 143, "the ball spins... and spins... it couldn't choose")
def s23(t0, t1):
    scene()
    ring(t0, t1, "joy")
    B = Ball((0, 0, BR), look=0)
    B.key(t0)
    B.whirl(t0 + 0.1, t1, turns=7)
    B.key(t0 + 0.1, (0, 0, BR)); B.key(t1, (0, 0, BR + 0.15))
    sfx(t0 + 0.1, "glitch", 0.5); sfx(w(139), "glitch", 0.5)
    c = Cam(); c.orbit(t0, t1, (0, 0, 0.6), 7.5, -20, 40, pitch=24, lens=32)


@S(24, 143, 150, "So it kicked itself into the net")
def s24(t0, t1):
    scene()
    ring(t0, t1, "shock", r=4.4)
    B = Ball((0, 0, BR), look=0)
    tk = w(145)
    B.key(tk - 0.15, (0, 0, BR)); B.hop(tk - 0.15, 0.2, 0.15, squash=True)
    B.fly([(tk, (0, 0, BR)), (tk + 0.4, (0, 18, 3.5)), (tk + 0.75, (1.0, 36, 2.8)), (tk + 1.05, (1.5, 51.5, 2.2))])
    B.key(tk + 1.4, (1.6, 52.6, BR))
    sfx(tk, "boom", 0.6); sfx(tk + 0.02, "whoosh", 1.0); sfx(tk + 1.05, "cheer", 1.0); sfx(tk + 1.05, "crowd", 1.0)
    c = Cam()
    c.key(t0, (0, -9, 3.0), (0, 0, 1.2), lens=28)
    c.key(tk + 0.1, (0, -7, 2.6), (0, 2, 1.4), lens=28)
    c.key(tk + 1.0, (5, 38, 3.2), (1.5, 51, 2.0), lens=30, ease="EASE_OUT")
    c.key(t1, (4.2, 40, 2.8), (1.5, 51, 1.6), lens=34)


@S(25, 150, None, "Goal of the season? The ball. Again. - everyone cheers, the ball hops")
def s25(t0, t1):
    scene()
    ps = ring(t0, t1, "joy", r=4.0)
    for i, P in enumerate(ps):
        P.cheer(t0 + 0.1 * i, t1, jump=(i % 2 == 0))
    B = Ball((0, 0, BR), look=0)
    B.key(t0)
    B.hop(w(155), 1.0, 0.45); B.hop(w(156), 0.7, 0.4)
    sfx(t0, "cheer", 0.9); sfx(w(155), "boing", 0.9); sfx(w(156), "confetti", 0.8)
    c = Cam(); c.orbit(t0, t1, (0, 0, 1.4), 18, -30, 15, pitch=16, lens=30)
