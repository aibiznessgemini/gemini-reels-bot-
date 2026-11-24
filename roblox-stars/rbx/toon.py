"""Stylised 3D caricature footballers (big head, sculpted face from primitives, real limbs).

Toon has the same pivots as chars.Char (root/hip/neck/head/shL/shR/hpL/hpR, hip at z=2) so
Char.pose / walk / act / look / jump / run work unchanged. Faces are 3D: eyeballs + lids + brows +
mouth, driven by face(t, expr), blink(t0, t1), talk(t0, t1, words).

No crests, sponsors or maker logos: colours, stripes, number and name only."""
import math, random
import bpy, bmesh
from mathutils import Vector
from .core import mat, hexc, box, cyl, sphere, empty, poly_extrude, text, F, D, collection, noise, set_interp, fcurves
from . import chars

TOON_LOOKS = {
    "messi": dict(label="MESSI", num="10", skin="#e2a47e", hair="#2a1a10", beard="#7a3e1e",
                  shirt="#1b2a5e", stripe="#a5163a", sleeve="#1b2a5e", trim="#f1bf00", shorts="#1b2a5e",
                  socks="#1b2a5e", sock_stripe="#a5163a", boots="#f2f2f2", sole="#2a6fd6", numc="#f1bf00",
                  hairstyle="pompadour", armband="#f28c28", nose=1.15, brow_angle=-10, tattoo=True,
                  sculpt=True, iris="#6a4524", blush="#d07a68",
                  head=dict(eye_az=0.33, eye_el=0.1, width=0.84, depth=0.93, height=1.12, jaw=0.12, chin=0.06, nose=1.15,
                            nose_len=1.15, brow=0.07, socket=0.06, cheek=0.05)),
}

# expression -> (brow tilt deg (+ = angry, inner end down), brow lift, upper-lid close 0..1, mouth (w, h))
EXPR = {
    "neutral": (10, 0.0, 0.32, (1.0, 0.35)), "angry": (24, -0.04, 0.42, (1.0, 0.3)),
    "determined": (16, -0.02, 0.36, (0.9, 0.3)), "smile": (0, 0.02, 0.3, (1.4, 0.5)),
    "happy": (-6, 0.05, 0.25, (1.5, 0.9)), "joy": (-10, 0.07, 0.4, (1.6, 1.3)),
    "grin": (-4, 0.03, 0.35, (1.6, 0.7)), "smug": (12, 0.0, 0.5, (1.2, 0.35)),
    "shock": (-18, 0.12, 0.0, (0.9, 1.4)), "gasp": (-16, 0.1, 0.05, (0.7, 1.2)),
    "scared": (-22, 0.09, 0.05, (1.1, 0.8)), "worried": (-20, 0.05, 0.25, (0.9, 0.4)),
    "shout": (22, -0.03, 0.3, (1.3, 1.4)), "sad": (-24, 0.0, 0.45, (0.8, 0.3)),
    "talk": (6, 0.02, 0.3, (1.0, 0.8)),
}


# ------------------------------------------------------------------ helpers
def skin_mat(name, col):
    m = mat(name, col, 0.5, spec=0.4)
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    for k, v in (("Subsurface Weight", 0.25), ("Subsurface Scale", 0.08)):
        try:
            b.inputs[k].default_value = v
        except KeyError:
            pass
    try:
        b.inputs["Subsurface Radius"].default_value = (1.0, 0.35, 0.2)
    except KeyError:
        pass
    return m


def fuzzy_mat(name, col, scale=60.0, rough=0.85, dark=0.65):
    """Hair / beard: colour broken up by fine noise so it reads as strands, plus bump."""
    m = D.materials.get(name)
    if m:
        return m
    m = D.materials.new(name); m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links
    b = next(n for n in N if n.type == "BSDF_PRINCIPLED")
    b.inputs["Roughness"].default_value = rough
    tc = N.new("ShaderNodeTexCoord")
    mp = N.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (1.0, 1.0, 0.25)
    L.new(tc.outputs["Object"], mp.inputs[0])
    nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = scale; nz.inputs["Detail"].default_value = 8
    L.new(mp.outputs[0], nz.inputs["Vector"])
    cr = N.new("ShaderNodeValToRGB")
    c = hexc(col)
    cr.color_ramp.elements[0].color = (c[0] * dark, c[1] * dark, c[2] * dark, 1)
    cr.color_ramp.elements[1].color = (min(1, c[0] * 1.25), min(1, c[1] * 1.25), min(1, c[2] * 1.25), 1)
    L.new(nz.outputs["Fac"], cr.inputs[0]); L.new(cr.outputs[0], b.inputs["Base Color"])
    bp = N.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.6
    L.new(nz.outputs["Fac"], bp.inputs["Height"]); L.new(bp.outputs[0], b.inputs["Normal"])
    m.diffuse_color = (*c, 1)
    return m


def stripe_mat(name, a, b_, scale=2.4, direction="X"):
    m = D.materials.get(name)
    if m:
        return m
    m = D.materials.new(name); m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links
    b = next(n for n in N if n.type == "BSDF_PRINCIPLED")
    b.inputs["Roughness"].default_value = 0.6
    try:
        b.inputs["Sheen Weight"].default_value = 0.3
    except KeyError:
        pass
    tc = N.new("ShaderNodeTexCoord"); w = N.new("ShaderNodeTexWave")
    w.wave_type = "BANDS"; w.bands_direction = direction; w.inputs["Scale"].default_value = scale
    w.inputs["Distortion"].default_value = 0
    L.new(tc.outputs["Object"], w.inputs[0])
    cr = N.new("ShaderNodeValToRGB"); cr.color_ramp.interpolation = "CONSTANT"
    cr.color_ramp.elements[0].color = (*hexc(a), 1); cr.color_ramp.elements[1].position = 0.5
    cr.color_ramp.elements[1].color = (*hexc(b_), 1)
    L.new(w.outputs["Fac"], cr.inputs[0]); L.new(cr.outputs[0], b.inputs["Base Color"])
    m.diffuse_color = (*hexc(a), 1)
    return m


def shell(name, r, loc, scale, keep, m, parent, coll, seg=48, solid=0.0):
    """UV sphere with the vertices failing keep(co) removed (co in unscaled sphere space)."""
    me = D.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2, radius=r)
    dead = [v for v in bm.verts if not keep(v.co)]
    bmesh.ops.delete(bm, geom=dead, context="VERTS")
    bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = True
    ob = D.objects.new(name, me)
    (coll or bpy.context.scene.collection).objects.link(ob)
    ob.parent = parent; ob.location = loc; ob.scale = scale
    if m:
        me.materials.append(m)
    if solid:
        md = ob.modifiers.new("solid", "SOLIDIFY"); md.thickness = solid; md.offset = 1.0
    return ob


def cut_sphere(name, r, loc, scale, planes, m, parent, coll, seg=64, solid=0.0, rot=(0, 0, 0)):
    """UV sphere cut by planes [(point, normal)], removing the side the normal points to (clean edges)."""
    me = D.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2, radius=r)
    for co, no in planes:
        bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=co, plane_no=no,
                               clear_outer=True)
    bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = True
    ob = D.objects.new(name, me)
    (coll or bpy.context.scene.collection).objects.link(ob)
    ob.parent = parent; ob.location = loc; ob.scale = scale
    ob.rotation_euler = [math.radians(a) for a in rot]
    if m:
        me.materials.append(m)
    if solid:
        md = ob.modifiers.new("solid", "SOLIDIFY"); md.thickness = solid; md.offset = 1.0
    return ob


def _ss(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


def sculpt(name, planes, radius_fn, m, parent, coll, seg=96, rot=(0, 0, 0), loc=(0, 0, 0)):
    """Unit sphere cut by planes (clean edges), then every vertex pushed to radius_fn(direction)."""
    me = D.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2, radius=1.0)
    for co, no in planes:
        bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=co, plane_no=no,
                               clear_outer=True)
    for v in bm.verts:
        d = v.co.normalized()
        v.co = d * radius_fn(d)
    bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = True
    ob = D.objects.new(name, me)
    (coll or bpy.context.scene.collection).objects.link(ob)
    ob.parent = parent; ob.location = loc
    ob.rotation_euler = [math.radians(a) for a in rot]
    me.materials.append(m)
    md = ob.modifiers.new("solid", "SOLIDIFY"); md.thickness = 0.03; md.offset = -1.0
    return ob


def strand_mat(name, col, scale=3.5):
    """Combed hair: grooves running front-to-back (wave bands across X) + fine noise, with bump."""
    m = D.materials.get(name)
    if m:
        return m
    m = D.materials.new(name); m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links
    b = next(n for n in N if n.type == "BSDF_PRINCIPLED")
    b.inputs["Roughness"].default_value = 0.62
    tc = N.new("ShaderNodeTexCoord")
    wv = N.new("ShaderNodeTexWave"); wv.wave_type = "BANDS"; wv.bands_direction = "X"
    wv.inputs["Scale"].default_value = scale; wv.inputs["Distortion"].default_value = 2.0
    wv.inputs["Detail"].default_value = 3.0; wv.inputs["Detail Scale"].default_value = 1.5
    L.new(tc.outputs["Object"], wv.inputs["Vector"])
    nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 25; nz.inputs["Detail"].default_value = 4
    L.new(tc.outputs["Object"], nz.inputs["Vector"])
    mx = N.new("ShaderNodeMath"); mx.operation = "MULTIPLY"
    L.new(wv.outputs["Fac"], mx.inputs[0]); L.new(nz.outputs["Fac"], mx.inputs[1])
    cr = N.new("ShaderNodeValToRGB")
    c = hexc(col)
    cr.color_ramp.elements[0].color = (c[0] * 0.45, c[1] * 0.45, c[2] * 0.45, 1)
    cr.color_ramp.elements[1].position = 0.55
    cr.color_ramp.elements[1].color = (min(1, c[0] * 1.6), min(1, c[1] * 1.6), min(1, c[2] * 1.6), 1)
    L.new(mx.outputs[0], cr.inputs[0]); L.new(cr.outputs[0], b.inputs["Base Color"])
    bp = N.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.35; bp.inputs["Distance"].default_value = 0.02
    L.new(mx.outputs[0], bp.inputs["Height"]); L.new(bp.outputs[0], b.inputs["Normal"])
    m.diffuse_color = (*c, 1)
    return m


def tattoo_mat(name, skin, ink="#3b4656"):
    """Skin with a dense ink sleeve pattern."""
    m = D.materials.get(name)
    if m:
        return m
    m = skin_mat(name, skin).copy(); m.name = name
    N, L = m.node_tree.nodes, m.node_tree.links
    b = next(n for n in N if n.type == "BSDF_PRINCIPLED")
    tc = N.new("ShaderNodeTexCoord")
    vo = N.new("ShaderNodeTexVoronoi"); vo.feature = "DISTANCE_TO_EDGE"; vo.inputs["Scale"].default_value = 9.0
    nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 14; nz.inputs["Detail"].default_value = 5
    L.new(tc.outputs["Object"], vo.inputs["Vector"]); L.new(tc.outputs["Object"], nz.inputs["Vector"])
    a = N.new("ShaderNodeMath"); a.operation = "LESS_THAN"; a.inputs[1].default_value = 0.06
    L.new(vo.outputs["Distance"], a.inputs[0])
    b2 = N.new("ShaderNodeMath"); b2.operation = "GREATER_THAN"; b2.inputs[1].default_value = 0.58
    L.new(nz.outputs["Fac"], b2.inputs[0])
    mx = N.new("ShaderNodeMath"); mx.operation = "MAXIMUM"
    L.new(a.outputs[0], mx.inputs[0]); L.new(b2.outputs[0], mx.inputs[1])
    k = N.new("ShaderNodeMath"); k.operation = "MULTIPLY"; k.inputs[1].default_value = 0.8
    L.new(mx.outputs[0], k.inputs[0])
    mix = N.new("ShaderNodeMix"); mix.data_type = "RGBA"
    mix.inputs[6].default_value = (*skin, 1); mix.inputs[7].default_value = (*hexc(ink), 1)
    L.new(k.outputs[0], mix.inputs[0]); L.new(mix.outputs[2], b.inputs["Base Color"])
    return m


def spike(name, base, d, ln, r, m, parent, coll):
    d = Vector(d).normalized()
    c = cyl(name, r, ln, Vector(base) + d * (ln / 2), m, 16, parent=parent, coll=coll, r2=r * 0.15)
    c.rotation_mode = "QUATERNION"
    c.rotation_quaternion = d.to_track_quat("Z", "Y")
    for p in c.data.polygons:
        p.use_smooth = True
    return c


# ------------------------------------------------------------------ character
class Toon(chars.Char):
    def __init__(self, key, name=None, loc=(0, 0, 0), rot=0.0, coll=None, scale=1.0, **kw):
        L = dict(TOON_LOOKS[key]); L.update(kw)
        self.L = L
        n = self.name = name or key.capitalize()
        self.coll = cl = coll or collection("TOON_" + n)
        self.skin_c = hexc(L["skin"])
        self.expr_keys, self._eye_track, self._mouth_track = [], [], []
        Ms = self.M_skin = skin_mat(n + "_skin", self.skin_c)
        Mj = stripe_mat(n + "_jersey", L["shirt"], L["stripe"], 2.6)
        Msl = mat(n + "_sleeve", hexc(L["sleeve"]), 0.6)
        Mtr = mat(n + "_trim", hexc(L["trim"]), 0.5)
        Msh = mat(n + "_shorts", hexc(L["shorts"]), 0.55)
        Mso = stripe_mat(n + "_socks", L["socks"], L["sock_stripe"], 2.2, "Z")
        Mb = mat(n + "_boots", hexc(L["boots"]), 0.3, coat=0.4)
        Msole = mat(n + "_sole", hexc(L["sole"]), 0.4)

        self.root = empty(n + "_root", loc, None, cl, (0, 0, rot), 0.6)
        self.root.scale = (scale,) * 3
        self.hip = empty(n + "_hip", (0, 0, 2.0), self.root, cl)
        hip = self.hip
        # torso (jersey) + pelvis (shorts)
        self.torso = cut_sphere(n + "_torso", 1.0, (0, 0, 0.82), (0.92, 0.6, 1.0),
                                [((0, 0, -0.62), (0, 0, -1))], Mj, hip, cl, seg=48)
        sphere(n + "_pelvis", 1.0, (0, 0, -0.02), Msh, (0.74, 0.5, 0.34), parent=hip, coll=cl, seg=32)
        poly_extrude(n + "_vneck", [(-0.3, 0.0), (0.3, 0.0), (0.0, -0.34)], 0.04, (0, -0.53, 1.66), Msl,
                     rot=(78, 0, 0), parent=hip, coll=cl)
        text(n + "_numB", L["num"], (0, 0.6, 0.85), 0.85, mat(n + "_num", hexc(L["numc"]), 0.5),
             rot=(90, 0, 180), extrude=0.02, parent=hip, coll=cl)
        text(n + "_nameB", L["label"], (0, 0.57, 1.42), 0.24, mat(n + "_num", hexc(L["numc"]), 0.5),
             rot=(82, 0, 180), extrude=0.01, parent=hip, coll=cl)
        text(n + "_numS", L["num"], (0.4, -0.375, -0.42), 0.2, mat(n + "_num", hexc(L["numc"]), 0.5),
             rot=(90, 0, 0), extrude=0.01, parent=hip, coll=cl)
        # neck
        cyl(n + "_neckm", 0.26, 0.5, (0, 0.02, 1.78), Ms, 24, parent=hip, coll=cl)
        # arms
        self.shL = empty(n + "_shL", (0.8, 0, 1.45), hip, cl)
        self.shR = empty(n + "_shR", (-0.8, 0, 1.45), hip, cl)
        for piv, s in ((self.shL, 1), (self.shR, -1)):
            sphere(f"{n}_slv{s}", 0.38, (0, 0, -0.18), Msl, (1, 1, 1.2), parent=piv, coll=cl, seg=24)
            cyl(f"{n}_cuff{s}", 0.33, 0.09, (0, 0, -0.56), Msl, 24, parent=piv, coll=cl)
            Ma = tattoo_mat(n + "_tattoo", self.skin_c) if (s == -1 and L.get("tattoo")) else Ms
            cyl(f"{n}_arm{s}", 0.21, 1.0, (0, 0, -0.95), Ma, 24, parent=piv, coll=cl, r2=0.19)
            sphere(f"{n}_elbow{s}", 0.2, (0, 0.0, -0.98), Ma, parent=piv, coll=cl, seg=16)
            for k in range(4):
                sphere(f"{n}_knk{s}{k}", 0.075, ((k - 1.5) * 0.1, -0.2, -1.6), Ms, (1, 1, 0.9), parent=piv, coll=cl, seg=12)
            sphere(f"{n}_fist{s}", 0.27, (0, -0.02, -1.48), Ms, (0.95, 1.05, 1.05), parent=piv, coll=cl, seg=24)
            sphere(f"{n}_thumb{s}", 0.09, (-s * 0.12, -0.17, -1.4), Ms, (1, 1, 1.4), parent=piv, coll=cl, seg=12)
        if L.get("armband"):
            cyl(n + "_band", 0.345, 0.16, (0, 0, -0.42), stripe_mat(n + "_bandm", L["armband"], "#d01c1c", 9.0, "Z"),
                24, parent=self.shL, coll=cl)
        # legs
        self.hpL = empty(n + "_hpL", (0.34, 0, -0.05), hip, cl)
        self.hpR = empty(n + "_hpR", (-0.34, 0, -0.05), hip, cl)
        for piv, s in ((self.hpL, 1), (self.hpR, -1)):
            cyl(f"{n}_short{s}", 0.34, 0.62, (0, 0, -0.3), Msh, 28, parent=piv, coll=cl, r2=0.36)
            cyl(f"{n}_leg{s}", 0.22, 1.2, (0, 0, -0.95), Ms, 24, parent=piv, coll=cl, r2=0.2)
            cyl(f"{n}_sock{s}", 0.25, 0.78, (0, 0, -1.32), Mso, 24, parent=piv, coll=cl, r2=0.23)
            sphere(f"{n}_boot{s}", 0.3, (0, -0.14, -1.8), Mb, (0.85, 1.45, 0.62), parent=piv, coll=cl, seg=24)
            box(f"{n}_sole{s}", (0.48, 0.86, 0.08), (0, -0.14, -1.97), Msole, 0.03, parent=piv, coll=cl)
        # head
        self.neck = empty(n + "_neck", (0, 0, 1.8), hip, cl)
        self.head = empty(n + "_headc", (0, -0.02, 1.0), self.neck, cl)
        self._build_head(L)
        chars.CHARS[n] = self

    # ------------------------------------------------------------ head
    def _build_head(self, L):
        n, h, cl, Ms = self.name, self.head, self.coll, self.M_skin
        if L.get("sculpt"):
            from .toonhead import build_head
            build_head(self, L)
            self._brow_base = 0.0
            self.face(-10.0, "neutral")
            return
        self._brow_base = 0.36
        sphere(n + "_skull", 0.95, (0, 0, 0), Ms, (0.9, 0.95, 1.1), parent=h, coll=cl, seg=48)
        if not L.get("beard"):
            sphere(n + "_jaw", 0.7, (0, -0.25, -0.5), Ms, (1.0, 0.95, 0.8), parent=h, coll=cl, seg=32)
        for s in (-1, 1):                                   # ears
            sphere(f"{n}_ear{s}", 0.26, (s * 0.86, 0.08, 0.02), Ms, (0.38, 0.7, 1.05), parent=h, coll=cl, seg=20)
        ns = L.get("nose", 1.0)                             # nose: bridge + bulb
        sphere(n + "_nbridge", 0.12, (0, -0.86, 0.1), Ms, (0.85, 1.0, 1.9), parent=h, coll=cl, seg=20)
        sphere(n + "_nose", 0.17 * ns, (0, -0.98, -0.08), Ms, (0.85, 1.0, 0.9), parent=h, coll=cl, seg=24)
        for s in (-1, 1):
            sphere(f"{n}_nost{s}", 0.08 * ns, (s * 0.12, -0.92, -0.12), Ms, parent=h, coll=cl, seg=12)
        for s in (-1, 1):                                   # cheekbones
            sphere(f"{n}_cheek{s}", 0.2, (s * 0.42, -0.58, -0.1), Ms, (1.0, 0.7, 0.65), parent=h, coll=cl, seg=20)
        # eyes
        Mw = mat("eye_white", (0.95, 0.94, 0.92), 0.15, coat=0.6)
        Mi = mat(n + "_iris", hexc(L.get("iris", "#4a2a16")), 0.2, coat=0.8)
        Mp = mat("eye_pupil", (0.01, 0.01, 0.01), 0.1, coat=0.8)
        Mh = mat("eye_glint", (1, 1, 1), 0.1, emit=(1, 1, 1), estr=4.0)
        self.eyes, self.lids, self.brows = [], [], []
        for s in (-1, 1):
            c = empty(f"{n}_eyec{s}", (s * 0.31, -0.74, 0.16), h, cl)
            sphere(f"{n}_eyew{s}", 0.15, (0, 0, 0), Mw, (1.05, 1.0, 0.85), parent=c, coll=cl, seg=24)
            ir = empty(f"{n}_iris{s}", (0, 0, 0), c, cl)
            sphere(f"{n}_irism{s}", 0.088, (0, -0.118, 0), Mi, (1, 0.5, 1), parent=ir, coll=cl, seg=20)
            sphere(f"{n}_pup{s}", 0.045, (0, -0.152, 0), Mp, (1, 0.5, 1), parent=ir, coll=cl, seg=16)
            sphere(f"{n}_glint{s}", 0.017, (0.03, -0.168, 0.03), Mh, parent=ir, coll=cl, seg=8)
            self.eyes.append(ir)
            lid = empty(f"{n}_lid{s}", (0, 0, 0), c, cl)
            shell(f"{n}_lidm{s}", 0.168, (0, 0, 0), (1.07, 1.03, 0.92), lambda co: co.z > -0.01, Ms, lid, cl, 32)
            self.lids.append(lid)
            lo = shell(f"{n}_lidlo{s}", 0.165, (0, 0, 0), (1.06, 1.02, 0.9), lambda co: co.z < -0.1, Ms, c, cl, 32)
            bw = empty(f"{n}_browp{s}", (s * 0.31, -0.84, 0.36), h, cl)
            sphere(f"{n}_brow{s}", 0.16, (0, 0, 0), fuzzy_mat(n + "_browm", L["hair"], 90), (1.45, 0.42, 0.36),
                   parent=bw, coll=cl, seg=16)
            self.brows.append(bw)
        # mouth (dark cavity + lip) sits in front of the beard
        self.mouth = empty(n + "_mouthp", (0, -0.95, -0.42), h, cl)
        sphere(n + "_mouthm", 0.13, (0, 0, 0), mat("mouth_dark", hexc("#3a1210"), 0.6), (1.3, 0.45, 0.35),
               parent=self.mouth, coll=cl, seg=20)
        sphere(n + "_teeth", 0.1, (0, -0.02, 0.025), mat("teeth", (0.95, 0.93, 0.88), 0.3), (1.2, 0.4, 0.18),
               parent=self.mouth, coll=cl, seg=16)
        if L.get("beard"):
            Mbd = fuzzy_mat(n + "_beardm", L["beard"], 70)
            sphere(n + "_jawskin", 0.68, (0, -0.2, -0.5), Ms, (1.0, 0.95, 0.8), parent=h, coll=cl, seg=32)
            cut_sphere(n + "_beard", 0.72, (0, -0.22, -0.5), (1.02, 0.98, 0.84),
                       [((0, -0.72, 0.36), (0, -0.25, 1.44)), ((0, 0.4, 0), (0, 1, 0))], Mbd, h, cl)
            sphere(n + "_chin", 0.36, (0, -0.58, -0.92), Mbd, (1.15, 0.85, 0.9), parent=h, coll=cl, seg=24)
            for s in (-1, 1):
                sphere(f"{n}_must{s}", 0.13, (s * 0.12, -0.99, -0.27), Mbd, (1.5, 0.7, 0.5), parent=h, coll=cl,
                       seg=16, rot=(0, s * 18, 0))
        self._hair(L)
        self.face(-10.0, "neutral")

    def _hair(self, L):
        n, h, cl = self.name, self.head, self.coll
        M = strand_mat(n + "_hairm", L["hair"])
        a, b, c = 0.95 * 0.9, 0.95 * 0.95, 0.95 * 1.1          # skull ellipsoid radii

        def skull_r(d):
            return 1.0 / math.sqrt((d.x / a) ** 2 + (d.y / b) ** 2 + (d.z / c) ** 2)

        style = L.get("hairstyle", "pompadour")

        def radius(d):
            top = _ss(0.05, 0.85, d.z)
            front = _ss(0.3, -0.85, d.y)
            side = _ss(0.55, 0.9, abs(d.x)) * (1 - _ss(0.35, 0.7, d.z))
            vol = 0.035 + (0.5 if style == "pompadour" else 0.2) * top * (0.35 + 0.65 * front)
            quiff = 0.3 * _ss(0.35, 0.75, d.z) * _ss(-0.3, -0.85, d.y)      # forward roll at the hairline
            return skull_r(d) + vol + quiff - 0.02 * side
        # hairline: forehead (tilted, rising toward the front), nape, and the face/ear opening on each side
        planes = [((0, -0.8, 0.6), (0, -0.55, -0.83)), ((0, 0, -0.55), (0, 0, -1))]
        sculpt(n + "_hair", planes, radius, M, h, cl)
        if style == "pompadour":                             # textured tufts on the quiff
            rnd = random.Random(11)
            for i in range(14):
                el = math.radians(rnd.uniform(48, 78)); az = math.radians(rnd.uniform(-38, 38))
                d = Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))
                base = d * (radius(d) - 0.12)
                out = Vector((d.x * 0.6, 0.95 + rnd.uniform(-0.1, 0.15), 0.85)).normalized()
                spike(f"{n}_tuft{i}", base, out, rnd.uniform(0.38, 0.55), rnd.uniform(0.16, 0.21), M, h, cl)
        for s in (-1, 1):                                    # neat sideburns down to the beard
            sphere(f"{n}_sideb{s}", 0.14, (s * 0.8, -0.22, -0.02), M, (0.4, 1.0, 2.0), parent=h, coll=cl, seg=16)

    # ------------------------------------------------------------ face animation
    def face(self, t, expr="neutral", eyes=None, mouth=None):
        if expr not in EXPR:
            expr = "neutral"
        tilt, lift, lid, (mw, mh) = EXPR[expr]
        tilt += self.L.get("brow_angle", 0) * 0.3
        f = F(t)
        for s, bw in zip((-1, 1), self.brows):
            bw.rotation_euler = (0, math.radians(-s * tilt), 0)
            if self._brow_base == 0.0:                        # sculpted head: slide along the forehead
                bw.location = (0, lift * 0.35, lift * 0.6)
                bw.keyframe_insert("location", frame=f)
            else:
                bw.location[2] = self._brow_base + lift
                bw.keyframe_insert("location", index=2, frame=f)
            bw.keyframe_insert("rotation_euler", frame=f)
        self._lid(t, lid)
        self.mouth.scale = (mw, 1, mh)
        self.mouth.keyframe_insert("scale", frame=f)
        self._cur = (lid, mw, mh)
        self.expr_keys.append((t, expr))
        return self

    def _lid(self, t, close):
        # lid cap rotates around X: -25 deg = wide open, +95 = shut
        a = math.radians(-58 + 150 * close ** 1.5)
        for lid in self.lids:
            lid.rotation_euler = (a, 0, 0)
            lid.keyframe_insert("rotation_euler", frame=F(t))

    def blink(self, t0, t1, every=(2.0, 3.8), seed=None):
        rnd = random.Random(seed if seed is not None else hash(self.name) & 0xffff)
        t = t0 + rnd.uniform(0.4, 1.2)
        while t < t1 - 0.25:
            base = self._lid_at(t)
            self._lid(t - 0.02, base); self._lid(t + 0.06, 1.0); self._lid(t + 0.16, base)
            t += rnd.uniform(*every)
        return self

    def _lid_at(self, t):
        cur = "neutral"
        for tt, e in sorted(self.expr_keys):
            if tt <= t:
                cur = e
        return EXPR.get(cur, EXPR["neutral"])[2]

    def talk(self, t0, t1, words=None, syll=0.12, **kw):
        base = self._cur
        ts = [w["start"] for w in (words or [])] or [t0 + i * syll * 2 for i in range(int((t1 - t0) / (syll * 2)))]
        for k, ts_ in enumerate(ts):
            if ts_ >= t1:
                break
            self.mouth.scale = (base[1] * 1.05, 1, max(base[2], 0.6) * (1.8 if k % 2 == 0 else 1.3))
            self.mouth.keyframe_insert("scale", frame=F(ts_))
            self.mouth.scale = (base[1], 1, base[2])
            self.mouth.keyframe_insert("scale", frame=F(ts_ + syll))
        return self

    def look_eyes(self, t, yaw=0, pitch=0):
        for e in self.eyes:
            e.rotation_euler = (math.radians(pitch), 0, math.radians(yaw))
            e.keyframe_insert("rotation_euler", frame=F(t))
        return self

    def breathe(self, strength=1.0):
        noise(self.hip, "rotation_euler", 0, 0.012 * strength, 40)
        noise(self.neck, "rotation_euler", 2, 0.03 * strength, 30)
        noise(self.neck, "rotation_euler", 0, 0.015 * strength, 34)
        return self


def toon(key, t0, t1, expr="neutral", loc=(0, 0, 0), rot=0.0, blink=True, **kw):
    ch = Toon(key, loc=loc, rot=rot, **kw)
    ch.pose(t0, loc=loc, rot=rot)
    ch.face(t0, expr); ch.breathe(0.8)
    if blink:
        ch.blink(t0, t1)
    return ch


def studio(color=(0.93, 0.93, 0.92)):
    """White cyclorama with soft key/fill/rim, like a product shot."""
    from .core import world, plane, light
    world(color, 1.0)
    plane("cyc_floor", 80, 80, (0, 0, 0), mat("cyc", (0.98, 0.98, 0.97), 0.8))
    from .core import mat as _m
    disc = cyl("grass_disc", 2.2, 0.08, (0, 0, 0.04), mat("grass_disc", hexc("#4f8f2f"), 0.9), 48)
    light("key", "AREA", (-6, -6, 9), 1800, (1, 0.96, 0.9), 5, target=(0, 0, 4))
    light("fill", "AREA", (7, -6, 5), 220, (0.9, 0.95, 1), 6, target=(0, 0, 4))
    light("rim", "AREA", (3, 7, 9), 1300, (1, 1, 1), 4, target=(0, 0, 5))
    return disc
