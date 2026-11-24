"""Rigged 3D footballers (assets/players/<key>.glb): load, pose, face, and ready-made motions.

    from rbx.players import player, lineup, PLAYERS
    R = player("ronaldo", t0, t1, loc=(0, 0, 0), rot=0, expr="smug")   # blinks + breathing
    R.pose(t, armL=(fwd, out), elbowL=deg, legR=(fwd, out), kneeR=deg, torso=(yaw, lean, roll),
           head=(yaw, nod, tilt), loc=(x, y, z), rot=yaw_deg)
    R.face(t, "joy"); R.talk(t0, t1, V.span(t0, t1)); R.look(t, yaw, pitch)
    R.walk(t0, t1, p0, p1); R.run(...); R.kick(t, "R"); R.cheer(t0, t1); R.jump(t); R.idle(t0, t1)

Character space: faces -Y, up +Z, the player's left = +X (same as rbx.chars). Models are 1.74 m
tall; default scale 2.0 matches the kit's sets (goal 4.9 units high). Angles in degrees.
Messi's rig has no face bones: face/talk/blink just skip on him."""
import math, os, random
import bpy
from mathutils import Vector, Quaternion
from . import ASSETS
from .core import F, D, collection, noise, set_interp

ORDER = ["ronaldo", "messi", "neymar", "mbappe", "vinijr", "haaland", "yamal"]
ALIAS = {"vini": "vinijr", "vinicius": "vinijr", "cr7": "ronaldo", "kylian": "mbappe"}
PLAYERS = {}
X, Y, Z = Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))

# expression -> jaw open (deg), smile (0..1), brow (-1 angry .. +1 raised), lid (0 open .. 1 shut)
EXPR = {
    "neutral": (0, 0.0, 0.0, 0.0), "smile": (2, 0.8, 0.15, 0.0), "happy": (8, 1.0, 0.3, 0.1),
    "joy": (16, 1.0, 0.5, 0.45), "grin": (5, 1.0, 0.2, 0.25), "smug": (0, 0.6, -0.3, 0.4),
    "shock": (22, 0.0, 1.0, -0.15), "gasp": (16, 0.0, 0.8, -0.1), "scared": (14, -0.4, 0.9, -0.1),
    "angry": (3, -0.5, -1.0, 0.3), "furious": (18, -0.6, -1.0, 0.25), "shout": (20, 0.0, -0.6, 0.15),
    "sad": (2, -0.6, 0.6, 0.4), "worried": (4, -0.4, 0.7, 0.2), "determined": (0, -0.2, -0.7, 0.3),
    "talk": (10, 0.2, 0.1, 0.1), "sleepy": (0, 0.0, 0.0, 0.7),
}


def _key(pb, path, f, interp="BEZIER"):
    pb.keyframe_insert(path, frame=f)
    act = pb.id_data.animation_data.action
    from .core import fcurves
    for fc in fcurves(act):
        if fc.data_path == f'pose.bones["{pb.name}"].{path}':
            for kp in fc.keyframe_points:
                if abs(kp.co[0] - f) < 0.5:
                    kp.interpolation = interp


class Player:
    def __init__(self, key, name=None, loc=(0, 0, 0), rot=0.0, scale=2.0, keep_ball=False, likeness=True):
        key = ALIAS.get(key, key)
        self.key = key
        self.name = name or key.capitalize()
        path = os.path.join(ASSETS, "players", key + ".glb")
        if not os.path.exists(path):
            raise FileNotFoundError(f"player model missing: {path}")
        self.coll = collection("PL_" + self.name)
        before = set(bpy.data.objects)
        lc = bpy.context.view_layer.layer_collection.children.get(self.coll.name)
        if lc:
            bpy.context.view_layer.active_layer_collection = lc
        bpy.ops.import_scene.gltf(filepath=path)
        bpy.context.view_layer.active_layer_collection = bpy.context.view_layer.layer_collection
        new = [o for o in bpy.data.objects if o not in before]
        self.arm = next(o for o in new if o.type == "ARMATURE")
        self.extras = {}
        for o in list(new):
            if o.type == "MESH" and o.parent is None and not any(m.type == "ARMATURE" for m in o.modifiers):
                if keep_ball and o.name.startswith("Soccer_Ball"):
                    self.extras["ball"] = o
                    continue
                bpy.data.objects.remove(o)
        self.meshes = [o for o in bpy.data.objects if o not in before and o.type == "MESH" and o.name in bpy.data.objects]
        for o in self.meshes:                         # move everything with the armature object
            if o.parent is None:
                o.parent = self.arm
        for o in [o for o in bpy.data.objects if o not in before]:
            for c in list(o.users_collection):
                if c != self.coll:
                    c.objects.unlink(o)
            if self.coll not in o.users_collection:
                self.coll.objects.link(o)
        self.photo_face = self._fix_photo_face()
        from . import likeness as _lk
        if self.photo_face:                         # let the painted nose/lips lead: flatten the sculpted ones
            _lk.flatten_face(self)
            _lk.reproject_face_uv(self)
        elif likeness:
            _lk.apply(self)
        A = self.arm
        A.name = self.name + "_rig"
        self.root = A                                 # for Cam.track and other root-based helpers
        A.rotation_mode = "XYZ"
        A.scale = (scale,) * 3
        self.scale = scale
        self.pb = A.pose.bones
        for pb in self.pb:
            pb.rotation_mode = "QUATERNION"
        self.Rinv = {pb.name: pb.bone.matrix_local.to_3x3().inverted() for pb in self.pb}
        self.has_face = "Jaw" in self.pb
        self._expr = []
        self._cur = EXPR["neutral"]
        self.pose(-10.0, loc=loc, rot=rot)
        PLAYERS[self.name] = self

    def _fix_photo_face(self):
        """Photo-face models: the face image is wrongly wired as a normal map too and imported as
        Non-Color. Unhook the normal map, make it sRGB, and match the neck/ear skin to the photo."""
        found = False
        mats = {m for o in self.meshes for m in o.data.materials if m}
        for m in mats:
            if not m.use_nodes:
                continue
            N, L = m.node_tree.nodes, m.node_tree.links
            for n in [n for n in N if n.type == "NORMAL_MAP"]:
                src = [l.from_node for l in n.inputs["Color"].links]
                if src and src[0].type == "TEX_IMAGE" and src[0].image and "face" in src[0].image.name:
                    for l in list(n.outputs[0].links):
                        L.remove(l)
                    found = True
            for n in N:
                if n.type == "TEX_IMAGE" and n.image and "face" in n.image.name:
                    n.image.colorspace_settings.name = "sRGB"
                    n.interpolation = "Cubic"
                    found = True
                    img = n.image
                    px = img.pixels[:]                       # sample the skin around the face (corner)
                    w = img.size[0]
                    i = (int(img.size[1] * 0.5) * w + int(w * 0.05)) * 4
                    lin = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
                    skin = tuple(lin(c) for c in px[i:i + 3])
                    b = next((x for x in N if x.type == "BSDF_PRINCIPLED"), None)
                    if b:
                        b.inputs["Specular IOR Level"].default_value = 0.3
                        try:
                            b.inputs["Subsurface Weight"].default_value = 0.15
                        except KeyError:
                            pass
                    self._photo_skin = skin
        if found and getattr(self, "_photo_skin", None):
            for m in mats:
                if m.name.startswith("Skin_Mat") and m.use_nodes:
                    b = next((x for x in m.node_tree.nodes if x.type == "BSDF_PRINCIPLED"), None)
                    if b and not b.inputs["Base Color"].is_linked:
                        b.inputs["Base Color"].default_value = (*self._photo_skin, 1)
        return found

    # ------------------------------------------------------------ low level
    def q(self, bone, axis, deg):
        return Quaternion(self.Rinv[bone] @ axis, math.radians(deg))

    def rotk(self, t, bone, quat, interp="BEZIER"):
        if bone not in self.pb:
            return
        pb = self.pb[bone]
        pb.rotation_quaternion = quat
        _key(pb, "rotation_quaternion", F(t), interp)

    def lock(self, t, bone, offset_world, interp="BEZIER"):
        if bone not in self.pb:
            return
        pb = self.pb[bone]
        pb.location = self.Rinv[bone] @ Vector(offset_world)
        _key(pb, "location", F(t), interp)

    def head_pos(self):
        """World position of the head centre (for cameras)."""
        bpy.context.view_layer.update()
        return self.arm.matrix_world @ (self.pb["Head"].head + Vector((0, 0, 0.18)))

    # ------------------------------------------------------------ body pose
    def pose(self, t, interp="BEZIER", **kw):
        kw.pop("face", None)
        for side, s in (("L", 1), ("R", -1)):
            a = kw.get("arm" + side)
            if a is not None:
                fwd, out = (list(a) + [0, 0])[:2]
                self.rotk(t, f"UpperArm.{side}", self.q(f"UpperArm.{side}", Y, -s * out) @ self.q(f"UpperArm.{side}", X, -fwd), interp)
            e = kw.get("elbow" + side)
            if e is not None:
                self.rotk(t, f"Forearm.{side}", self.q(f"Forearm.{side}", X, -e), interp)
            l = kw.get("leg" + side)
            if l is not None:
                fwd, out = (list(l) + [0, 0])[:2]
                self.rotk(t, f"Thigh.{side}", self.q(f"Thigh.{side}", Y, -s * out) @ self.q(f"Thigh.{side}", X, -fwd), interp)
            k = kw.get("knee" + side)
            if k is not None:
                self.rotk(t, f"Shin.{side}", self.q(f"Shin.{side}", X, k), interp)
            ft = kw.get("foot" + side)
            if ft is not None:
                self.rotk(t, f"Foot.{side}", self.q(f"Foot.{side}", X, ft), interp)
        for part, bones in (("torso", ("Spine", "Chest")), ("head", ("Neck", "Head"))):
            v = kw.get(part)
            if v is not None:
                yaw, lean, roll = (list(v) + [0, 0, 0])[:3]
                for b in bones:
                    self.rotk(t, b, self.q(b, Z, yaw / 2) @ self.q(b, X, lean / 2) @ self.q(b, Y, roll / 2), interp)
        if "hips" in kw:
            yaw, lean, roll = (list(kw["hips"]) + [0, 0, 0])[:3]
            self.rotk(t, "Pelvis", self.q("Pelvis", Z, yaw) @ self.q("Pelvis", X, lean) @ self.q("Pelvis", Y, roll), interp)
        if "hipz" in kw:
            self.lock(t, "Root", (0, 0, kw["hipz"] / self.scale), interp)
        f = F(t)
        if "loc" in kw:
            self.arm.location = kw["loc"]
            self.arm.keyframe_insert("location", frame=f)
            set_interp(self.arm, "location", f, interp)
        if "rot" in kw:
            r = kw["rot"]
            cur = math.degrees(self.arm.rotation_euler[2])
            r += 360 * round((cur - r) / 360)            # shortest turn from the last keyed yaw
            self.arm.rotation_euler[2] = math.radians(r)
            self.arm.keyframe_insert("rotation_euler", index=2, frame=f)
            set_interp(self.arm, "rotation_euler", f, interp)
        return self

    def rest(self, t, interp="BEZIER"):
        return self.pose(t, interp, armL=(0, 0), armR=(0, 0), elbowL=0, elbowR=0, legL=(0, 0), legR=(0, 0),
                         kneeL=0, kneeR=0, torso=(0, 0, 0), head=(0, 0, 0), hipz=0)

    # ------------------------------------------------------------ face
    def face(self, t, expr="neutral", jaw=None, smile=None, brow=None, lid=None):
        if not self.has_face:
            return self
        j, s, b, l = EXPR.get(expr, EXPR["neutral"])
        j = j if jaw is None else jaw
        s = s if smile is None else smile
        b = b if brow is None else brow
        l = l if lid is None else lid
        self._cur = (j, s, b, l)
        self._expr.append((t, (j, s, b, l)))
        self.rotk(t, "Jaw", self.q("Jaw", X, j))
        for side, sg in (("L", 1), ("R", -1)):
            self.lock(t, f"Mouth_Smile.{side}", (sg * 0.006 * s, 0, 0.012 * s))
            self.lock(t, f"Brow.{side}", (0, 0, 0.014 * b))
            self.rotk(t, f"Brow.{side}", self.q(f"Brow.{side}", Y, sg * 12 * min(0, b)))   # angry: inner ends down
            self.rotk(t, f"Eyelid.{side}", self.q(f"Eyelid.{side}", X, 40 * l))
        return self

    def _lid_at(self, t):
        cur = EXPR["neutral"]
        for tt, v in sorted(self._expr, key=lambda x: x[0]):
            if tt <= t:
                cur = v
        return cur

    def blink(self, t0, t1, every=(2.2, 4.0), seed=None):
        if not self.has_face:
            return self
        rnd = random.Random(seed if seed is not None else hash(self.name) & 0xffff)
        t = t0 + rnd.uniform(0.5, 1.4)
        while t < t1 - 0.3:
            base = self._lid_at(t)[3]
            for dt, l in ((-0.02, base), (0.06, 1.0), (0.17, base)):
                for side in ("L", "R"):
                    self.rotk(t + dt, f"Eyelid.{side}", self.q(f"Eyelid.{side}", X, 40 * l))
            t += rnd.uniform(*every)
        return self

    def talk(self, t0, t1, words=None, amount=1.0, syll=0.11):
        if not self.has_face:
            return self
        ts = [w["start"] for w in (words or []) if t0 <= w["start"] < t1] or \
             [t0 + i * syll * 2 for i in range(int((t1 - t0) / (syll * 2)))]
        for k, s in enumerate(ts):
            base = self._lid_at(s)[0]
            self.rotk(s, "Jaw", self.q("Jaw", X, base + amount * (14 if k % 2 == 0 else 9)))
            self.rotk(s + syll, "Jaw", self.q("Jaw", X, base + 2))
        self.rotk(t1, "Jaw", self.q("Jaw", X, self._lid_at(t1)[0]))
        return self

    def look(self, t, yaw=0, pitch=0, eyes=True):
        self.pose(t, head=(yaw, pitch, 0))
        if eyes and self.has_face:
            for side in ("L", "R"):
                self.rotk(t, f"Eye.{side}", self.q(f"Eye.{side}", Z, yaw * 0.3) @ self.q(f"Eye.{side}", X, -pitch * 0.3))
        return self

    # ------------------------------------------------------------ motions
    def breathe(self, strength=1.0):
        for b, idx, amp, sc in (("Chest", 0, 0.012, 30), ("Neck", 2, 0.02, 40)):
            pb = self.pb[b]
            pb.rotation_mode = "QUATERNION"
        noise(self.arm, "location", 2, 0.006 * strength * self.scale, 35)
        return self

    def idle(self, t0, t1, seed=0):
        """Weight shifts, small head moves, relaxed arms."""
        rnd = random.Random(seed + len(self.name))
        t, k = t0, 0
        while t < t1:
            s = 1 if k % 2 == 0 else -1
            self.pose(t, armL=(rnd.uniform(-3, 6), 6), armR=(rnd.uniform(-3, 6), 6), elbowL=10, elbowR=10,
                      torso=(s * 3, 2, s * 2), head=(rnd.uniform(-8, 8), rnd.uniform(-3, 4), 0), hipz=0.0)
            t += rnd.uniform(0.9, 1.4); k += 1
        return self

    def _gait(self, t0, t1, rate, swing, arm, bob, lean, knee, elbow):
        step = 1.0 / (rate * 2)
        t, k = t0, 0
        while t <= t1 + 1e-4:
            s = 1 if k % 2 == 0 else -1
            self.pose(t, legL=(swing * s, 0), legR=(-swing * s, 0), kneeL=knee * (0.3 if s > 0 else 1.0),
                      kneeR=knee * (1.0 if s > 0 else 0.3), armL=(-arm * s, 8), armR=(arm * s, 8),
                      elbowL=elbow, elbowR=elbow, torso=(s * 6, lean, 0), hipz=0.0)
            if t + step / 2 <= t1:
                self.pose(t + step / 2, hipz=bob, kneeL=knee * 0.6, kneeR=knee * 0.6)
            t += step; k += 1
        return self

    def _travel(self, t0, t1, p0, p1):
        p0, p1 = Vector(p0), Vector(p1)
        d = p1 - p0
        yaw = math.degrees(math.atan2(d.x, -d.y))
        self.pose(t0, rot=yaw, loc=tuple(p0), interp="LINEAR")
        self.pose(t1, rot=yaw, loc=tuple(p1), interp="LINEAR")

    def walk(self, t0, t1, p0, p1, rate=1.9):
        self._travel(t0, t1, p0, p1)
        return self._gait(t0, t1, rate, 24, 22, 0.05 * self.scale, 4, 22, 14)

    def run(self, t0, t1, p0, p1, rate=2.8):
        self._travel(t0, t1, p0, p1)
        return self._gait(t0, t1, rate, 42, 48, 0.12 * self.scale, 14, 70, 85)

    def kick(self, t, side="R", power=1.0):
        """Wind-up, strike at t, follow-through. Returns the strike time."""
        o = "L" if side == "R" else "R"
        sg = 1 if side == "L" else -1
        self.pose(t - 0.45, **{f"leg{side}": (0, 0), f"knee{side}": 0, f"arm{o}": (0, 10), "torso": (0, 0, 0)})
        self.pose(t - 0.18, **{f"leg{side}": (-40 * power, 0), f"knee{side}": 85, f"arm{o}": (35, 30),
                               f"arm{side}": (-25, 20), "torso": (sg * 12, -6, sg * 6), f"knee{o}": 15})
        self.pose(t, **{f"leg{side}": (55 * power, 0), f"knee{side}": 10, f"arm{o}": (-10, 45),
                        f"arm{side}": (30, 25), "torso": (-sg * 15, 10, 0), f"knee{o}": 20})
        self.pose(t + 0.22, **{f"leg{side}": (75 * power, 0), f"knee{side}": 25, "torso": (-sg * 18, 14, 0)})
        self.pose(t + 0.6, **{f"leg{side}": (0, 0), f"knee{side}": 0, f"knee{o}": 0, f"arm{o}": (0, 6),
                              f"arm{side}": (0, 6), "torso": (0, 0, 0)})
        return t

    def jump(self, t, height=0.6, dur=0.55):
        z0 = self.arm.location.z
        p = Vector(self.arm.location)
        self.pose(t - 0.12, hipz=-0.12 * self.scale, kneeL=40, kneeR=40, legL=(20, 0), legR=(20, 0))
        self.pose(t, loc=tuple(p), hipz=0.0, kneeL=0, kneeR=0, legL=(0, 0), legR=(0, 0))
        self.pose(t + dur / 2, loc=(p.x, p.y, z0 + height * self.scale), kneeL=30, kneeR=30)
        self.pose(t + dur, loc=tuple(p), kneeL=0, kneeR=0)
        self.pose(t + dur + 0.1, hipz=-0.08 * self.scale, kneeL=30, kneeR=30, legL=(15, 0), legR=(15, 0))
        self.pose(t + dur + 0.3, hipz=0.0, kneeL=0, kneeR=0, legL=(0, 0), legR=(0, 0))
        return self

    def cheer(self, t0, t1, rate=2.4, jump=True):
        """Both fists pumping overhead, optional hops."""
        self.face(t0, "joy")
        t, k = t0, 0
        while t < t1:
            s = 1 if k % 2 == 0 else -1
            self.pose(t, armL=(10, 150 + 15 * s), armR=(10, 150 - 15 * s), elbowL=30 + 25 * s, elbowR=30 - 25 * s,
                      head=(0, -12, 0), torso=(0, -4, 0))
            t += 1 / rate; k += 1
        if jump and t1 - t0 > 1.0:
            self.jump(t0 + 0.2, 0.35, 0.45)
        return self

    def fall(self, t, back=True, dur=0.35):
        """Topple over (pivot at the feet) and land flat; arms flail on the way."""
        ang = -82 if back else 82
        self.rotk(t, "Root", self.q("Root", X, 0))
        self.pose(t, armL=(20, 30), armR=(20, 30))
        self.rotk(t + dur * 0.6, "Root", self.q("Root", X, ang * 0.7))
        self.pose(t + dur * 0.6, armL=(120, 60), armR=(120, 60), legL=(25, 0), legR=(10, 0), face=None)
        self.rotk(t + dur, "Root", self.q("Root", X, ang), "BEZIER")
        self.pose(t + dur, armL=(90, 70), armR=(90, 70), legL=(10, 8), legR=(0, 8))
        return self

    def point(self, t, side="R", up=10):
        return self.pose(t, **{f"arm{side}": (85, 10 + up), f"elbow{side}": 5})

    def facepalm(self, t, side="R"):
        self.face(t, "sad")
        return self.pose(t, **{f"arm{side}": (60, 20), f"elbow{side}": 130, "head": (0, 20, 0)})

    def shrug(self, t):
        return self.pose(t, armL=(20, 25), armR=(20, 25), elbowL=90, elbowR=90, head=(0, 0, 10))

    def set_visible(self, t, vis):
        f = F(t)
        for o in [self.arm] + self.meshes:
            o.hide_render = not vis
            o.keyframe_insert("hide_render", frame=f)
        return self


def player(key, t0, t1, expr="neutral", loc=(0, 0, 0), rot=0.0, blink=True, breathe=True, **kw):
    P = Player(key, loc=loc, rot=rot, **kw)
    P.rest(t0)
    P.face(t0, expr)
    if blink:
        P.blink(t0, t1)
    if breathe:
        P.breathe()
    return P


def lineup(t0, t1, keys=ORDER, gap=2.6, y=0.0, expr="smile", **kw):
    x0 = -gap * (len(keys) - 1) / 2
    return [player(k, t0, t1, expr, loc=(x0 + i * gap, y, 0), **kw) for i, k in enumerate(keys)]


def kick_ball(b, t, to, height=1.2, dur=0.7, spin=900, bounce=True):
    """Fly a ball object from where it is at time t to `to` in an arc (+ spin and one bounce)."""
    p0 = Vector(b.location); p1 = Vector(to)
    b.keyframe_insert("location", frame=F(t))
    b.rotation_mode = "XYZ"
    b.keyframe_insert("rotation_euler", frame=F(t))
    mid = (p0 + p1) / 2 + Vector((0, 0, height))
    b.location = mid; b.keyframe_insert("location", frame=F(t + dur / 2))
    b.location = p1; b.keyframe_insert("location", frame=F(t + dur))
    d = (p1 - p0)
    b.rotation_euler = (math.radians(spin) * (1 if d.y < 0 else -1), math.radians(spin) * (1 if d.x > 0 else -1) * 0.3, 0)
    b.keyframe_insert("rotation_euler", frame=F(t + dur))
    if bounce:
        p2 = p1 + d.normalized() * 1.5
        b.location = (p1 + p2) / 2 + Vector((0, 0, height * 0.25)); b.keyframe_insert("location", frame=F(t + dur * 1.3))
        b.location = p2; b.keyframe_insert("location", frame=F(t + dur * 1.6))
    return b
