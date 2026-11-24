"""Sculpted caricature head: one continuous skin surface (brow ridge, eye sockets, nose, cheekbones,
lips, jaw, chin) written as a radius field over directions, plus beard and hair as thickness
fields over the same field (so they hug the face and fade into the skin with no cut lines).

Head-local space: centre at 0, front = -Y, up = +Z. Directions are (az, el): az = 0 straight ahead,
az > 0 toward the character's left (+X), el = elevation in radians."""
import math, random
import bpy, bmesh
from mathutils import Vector
from .core import mat, hexc, sphere, empty, D

TAU = math.tau


def ss(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


def azel(d):
    return math.atan2(d.x, -d.y), math.asin(max(-1.0, min(1.0, d.z)))


def dir_of(az, el):
    return Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))


def G(az, el, a0, e0, sa, se):
    da = (az - a0 + math.pi) % TAU - math.pi
    return math.exp(-((da / sa) ** 2 + ((el - e0) / se) ** 2))


class HeadShape:
    """Radius field of the skin. P = per-character proportions (caricature knobs)."""
    def __init__(self, **P):
        self.P = dict(width=0.84, depth=0.92, height=1.06, jaw=0.2, chin=0.08, nose=1.0, nose_len=1.0,
                      brow=0.06, socket=0.08, cheek=0.04, eye_el=0.12, eye_az=0.37, lips=1.0, ears=1.0)
        self.P.update(P)

    def r(self, d):
        P = self.P
        az, el = azel(d)
        taper = 1 - P["jaw"] * ss(-0.05, -0.85, d.z)                  # jaw narrows toward the chin
        r = 1.0 / math.sqrt((d.x / (P["width"] * taper)) ** 2 + (d.y / P["depth"]) ** 2 + (d.z / P["height"]) ** 2)
        front = ss(1.3, 0.2, abs(az))
        r -= 0.03 * G(az, el, 0, P["eye_el"] + 0.06, 0.1, 0.06)                         # nasion dip
        for s in (-1, 1):
            r += P["brow"] * G(az, el, s * 0.34, P["eye_el"] + 0.19, 0.28, 0.08)          # brow ridge lobes
            r -= P["socket"] * G(az, el, s * P["eye_az"], P["eye_el"], 0.17, 0.11)      # eye sockets
            r += P["cheek"] * G(az, el, s * 0.6, -0.06, 0.2, 0.15)                       # cheekbones
            r -= 0.03 * G(az, el, s * 0.95, 0.32, 0.25, 0.2)                             # temples
            r += 0.07 * P["nose"] * G(az, el, s * 0.1, -0.15, 0.06, 0.05)                # nose wings
            r -= 0.02 * G(az, el, s * 0.24, -0.36, 0.08, 0.1)                            # mouth corners
        nl = P["nose_len"]
        r += 0.1 * P["nose"] * G(az, el, 0, -0.0, 0.065, 0.13 * nl)                      # bridge
        r += 0.17 * P["nose"] * G(az, el, 0, -0.1 * nl, 0.11, 0.085)                     # rounded tip
        r -= 0.03 * G(az, el, 0, -0.2, 0.06, 0.03)                                       # under the nose
        r += 0.035 * P["lips"] * G(az, el, 0, -0.33, 0.16, 0.04)                         # upper lip
        r += 0.04 * P["lips"] * G(az, el, 0, -0.44, 0.15, 0.045)                         # lower lip
        r -= 0.025 * G(az, el, 0, -0.39, 0.2, 0.018)                                     # lip line
        r += P["chin"] * G(az, el, 0, -0.68, 0.24, 0.14)                                 # chin
        return r

    def surf(self, az, el, off=0.0):
        d = dir_of(az, el)
        return d * (self.r(d) + off)


def field_mesh(name, r_fn, tint_fn=None, seg=192, parent=None, coll=None, m=None, subsurf=1, keep=None):
    me = D.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2, radius=1.0)
    if keep is not None:
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if not all(keep(v.co.normalized()) for v in f.verts)],
                         context="FACES")
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    dirs = []
    for v in bm.verts:
        d = v.co.normalized(); dirs.append(d)
        v.co = d * r_fn(d)
    bm.to_mesh(me); bm.free()
    if tint_fn is not None:
        ca = me.color_attributes.new("tint", "FLOAT_COLOR", "POINT")
        for i, v in enumerate(me.vertices):
            ca.data[i].color = (*tint_fn(v.co.normalized()), 1.0)
    for p in me.polygons:
        p.use_smooth = True
    ob = D.objects.new(name, me)
    (coll or bpy.context.scene.collection).objects.link(ob)
    ob.parent = parent
    if m:
        me.materials.append(m)
    if subsurf:
        md = ob.modifiers.new("sub", "SUBSURF"); md.levels = subsurf; md.render_levels = subsurf
    return ob


# ------------------------------------------------------------------ materials
def head_skin_mat(name, pore=0.12):
    """Skin coloured by the per-vertex 'tint' attribute (blush on nose/cheeks/ears), SSS, pores."""
    m = D.materials.get(name)
    if m:
        return m
    m = D.materials.new(name); m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links
    b = next(n for n in N if n.type == "BSDF_PRINCIPLED")
    at = N.new("ShaderNodeAttribute"); at.attribute_name = "tint"
    L.new(at.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.48
    for k, v in (("Subsurface Weight", 0.3), ("Subsurface Scale", 0.06), ("Specular IOR Level", 0.45)):
        try:
            b.inputs[k].default_value = v
        except KeyError:
            pass
    try:
        L.new(at.outputs["Color"], b.inputs["Subsurface Radius"]) if False else None
        b.inputs["Subsurface Radius"].default_value = (1.0, 0.4, 0.25)
    except KeyError:
        pass
    tc = N.new("ShaderNodeTexCoord")
    nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 160; nz.inputs["Detail"].default_value = 3
    L.new(tc.outputs["Object"], nz.inputs["Vector"])
    bp = N.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = pore; bp.inputs["Distance"].default_value = 0.004
    L.new(nz.outputs["Fac"], bp.inputs["Height"]); L.new(bp.outputs[0], b.inputs["Normal"])
    return m


def fur_mat(name, col, scale=40.0, along="Z", rough=0.6, bump=0.5, light=1.5, dark=0.45, distort=None):
    """Hair / beard: noise stretched along the strand axis (`along`), coloured dark..light around col."""
    m = D.materials.get(name)
    if m:
        return m
    m = D.materials.new(name); m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links
    b = next(n for n in N if n.type == "BSDF_PRINCIPLED")
    b.inputs["Roughness"].default_value = rough
    try:
        b.inputs["Sheen Weight"].default_value = 0.5
    except KeyError:
        pass
    tc = N.new("ShaderNodeTexCoord")
    sc = {"X": (scale * 0.12, scale, scale), "Y": (scale, scale * 0.12, scale), "Z": (scale, scale, scale * 0.12)}[along]
    mp = N.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = sc
    L.new(tc.outputs["Object"], mp.inputs[0])
    nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 1.0; nz.inputs["Detail"].default_value = 8
    nz.inputs["Roughness"].default_value = 0.65
    L.new(mp.outputs[0], nz.inputs["Vector"])
    cr = N.new("ShaderNodeValToRGB")
    c = hexc(col)
    cr.color_ramp.elements[0].position = 0.3
    cr.color_ramp.elements[0].color = (c[0] * dark, c[1] * dark, c[2] * dark, 1)
    cr.color_ramp.elements[1].position = 0.72
    cr.color_ramp.elements[1].color = (min(1, c[0] * light), min(1, c[1] * light), min(1, c[2] * light), 1)
    L.new(nz.outputs["Fac"], cr.inputs[0]); L.new(cr.outputs[0], b.inputs["Base Color"])
    bp = N.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = bump; bp.inputs["Distance"].default_value = 0.01
    L.new(nz.outputs["Fac"], bp.inputs["Height"]); L.new(bp.outputs[0], b.inputs["Normal"])
    m.diffuse_color = (*c, 1)
    return m


# ------------------------------------------------------------------ build
def build_head(ch, L):
    """Adds skull, ears, eyes (+ lids, lashes), brows, mouth, beard, hair under ch.head.
    Sets ch.eyes, ch.lids, ch.brows, ch.mouth, ch.shape."""
    n, h, cl = ch.name, ch.head, ch.coll
    H = ch.shape = HeadShape(**L.get("head", {}))
    skin = Vector(ch.skin_c)
    blush = Vector(hexc(L.get("blush", "#d9776a")))

    def tint(d):
        az, el = azel(d)
        k = 0.55 * G(az, el, 0, -0.1, 0.1, 0.1) + 0.3 * (G(az, el, 0.55, -0.1, 0.22, 0.14) + G(az, el, -0.55, -0.1, 0.22, 0.14))
        k += 0.4 * (G(az, el, 1.57, 0.02, 0.2, 0.25) + G(az, el, -1.57, 0.02, 0.2, 0.25))
        k += 0.75 * G(az, el, 0, -0.43, 0.15, 0.04) + 0.4 * G(az, el, 0, -0.35, 0.14, 0.03)
        dark = 0.12 * sum(G(az, el, s * H.P["eye_az"], H.P["eye_el"] - 0.08, 0.16, 0.06) for s in (-1, 1))
        c = skin.lerp(blush, min(0.6, k)) * (1 - dark)
        return tuple(c)
    Mskin = head_skin_mat(n + "_headskin")
    field_mesh(n + "_skull", H.r, tint, 192, h, cl, Mskin)
    # ears: flattened shells with an inner bowl
    Ms = ch.M_skin
    for s in (-1, 1):
        p = H.surf(s * 1.55, 0.02, -0.04)
        e = sphere(f"{n}_ear{s}", 0.23 * H.P["ears"], tuple(p), Ms, (0.32, 0.62, 1.0), parent=h, coll=cl, seg=24,
                   rot=(0, 0, s * 18))
        sphere(f"{n}_earin{s}", 0.145 * H.P["ears"], tuple(p + Vector((s * 0.05, -0.03, 0))), mat(n + "_earin", tuple(x * 0.75 for x in ch.skin_c), 0.6),
               (0.2, 0.5, 0.8), parent=h, coll=cl, seg=16, rot=(0, 0, s * 18))
    # eyes
    ER = L.get("eye_r", 0.165)
    Mw = mat("eye_white2", (0.93, 0.91, 0.88), 0.12, coat=0.8)
    Mi = iris_mat(n + "_iris", L.get("iris", "#5a3a1c"))
    Mp = mat("eye_pupil", (0.01, 0.01, 0.01), 0.1, coat=0.8)
    Mh = mat("eye_glint", (1, 1, 1), 0.1, emit=(1, 1, 1), estr=5.0)
    Mlash = mat(n + "_lash", hexc(L["hair"]) * 0.4 if False else tuple(x * 0.35 for x in hexc(L["hair"])), 0.6)
    ch.eyes, ch.lids, ch.brows = [], [], []
    from .toon import cut_sphere
    for s in (-1, 1):
        az = s * H.P["eye_az"]
        sp = H.surf(az, H.P["eye_el"])
        c = empty(f"{n}_eyec{s}", tuple(sp + Vector((0, ER * 0.62, 0))), h, cl)
        sphere(f"{n}_eyew{s}", ER, (0, 0, 0), Mw, (1.0, 1.0, 0.95), parent=c, coll=cl, seg=32)
        ir = empty(f"{n}_iris{s}", (0, 0, 0), c, cl)
        ir.rotation_euler = (0, 0, math.radians(s * 6))
        sphere(f"{n}_irism{s}", ER * 0.56, (0, -ER * 0.86, 0), Mi, (1, 0.42, 1), parent=ir, coll=cl, seg=32)
        sphere(f"{n}_pup{s}", ER * 0.26, (0, -ER * 1.06, 0), Mp, (1, 0.3, 1), parent=ir, coll=cl, seg=16)
        sphere(f"{n}_glint{s}", ER * 0.1, (ER * 0.22, -ER * 1.12, ER * 0.22), Mh, parent=ir, coll=cl, seg=8)
        ch.eyes.append(ir)
        lid = empty(f"{n}_lid{s}", (0, 0, 0), c, cl)
        cut_sphere(f"{n}_lidm{s}", ER * 1.1, (0, 0, 0), (1.04, 1.04, 1.0), [((0, 0, 0), (0, 0, -1))], Mskin_flat(ch), lid, cl, 40)
        cut_sphere(f"{n}_lash{s}", ER * 1.13, (0, 0, 0), (1.04, 1.06, 1.0),
                   [((0, 0, 0.0), (0, 0, -1)), ((0, 0, ER * 0.18), (0, 0, 1)), ((0, ER * 0.3, 0), (0, 1, 0))],
                   Mlash, lid, cl, 40)
        ch.lids.append(lid)
        lo = empty(f"{n}_lidlo{s}", (0, 0, 0), c, cl); lo.rotation_euler = (math.radians(-24), 0, 0)
        cut_sphere(f"{n}_lidlom{s}", ER * 1.08, (0, 0, 0), (1.04, 1.03, 1.0), [((0, 0, -ER * 0.5), (0, 0, 1))],
                   Mskin_flat(ch), lo, cl, 40)
        # brows: wrapped to the ridge (parent yaw), animated child (tilt + lift)
        bp = H.surf(s * (H.P["eye_az"] + 0.02), H.P["eye_el"] + 0.22, -0.02)
        bwp = empty(f"{n}_browbase{s}", tuple(bp), h, cl, rot=(0, 0, math.degrees(az)))
        bw = empty(f"{n}_browp{s}", (0, 0, 0), bwp, cl)
        Mb = fur_mat(n + "_browm", L["hair"], 60, "X", bump=0.4, light=1.2, dark=0.5)
        for k in range(5):                                   # tapered brow made of 5 blobs
            u = (k - 1.2) / 4.0
            sphere(f"{n}_brow{s}{k}", 0.07 * (1.25 - 0.45 * abs(u + 0.3)), (s * u * 0.3, 0, -0.015 * u * u),
                   Mb, (1.7, 0.5, 0.75), parent=bw, coll=cl, seg=12, rot=(0, -s * 8 * u, 0))
        ch.brows.append(bw)
    # mouth: dark cavity + teeth just inside the lip line
    mp = H.surf(0, -0.4, 0.0)
    ch.mouth = empty(n + "_mouthp", tuple(mp), h, cl)
    sphere(n + "_mouthm", 0.12, (0, 0, 0), mat("mouth_dark", hexc("#3a1210"), 0.6), (1.5, 0.3, 0.32),
           parent=ch.mouth, coll=cl, seg=24)
    sphere(n + "_teeth", 0.1, (0, -0.02, 0.02), mat("teeth", (0.95, 0.93, 0.88), 0.3), (1.35, 0.45, 0.16),
           parent=ch.mouth, coll=cl, seg=16)
    if L.get("beard"):
        build_beard(ch, L, H)
    build_hair(ch, L, H)


def Mskin_flat(ch):
    return ch.M_skin


def iris_mat(name, col):
    m = D.materials.get(name)
    if m:
        return m
    m = D.materials.new(name); m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links
    b = next(n for n in N if n.type == "BSDF_PRINCIPLED")
    b.inputs["Roughness"].default_value = 0.15
    try:
        b.inputs["Coat Weight"].default_value = 1.0
    except KeyError:
        pass
    tc = N.new("ShaderNodeTexCoord")
    gr = N.new("ShaderNodeTexGradient"); gr.gradient_type = "SPHERICAL"
    mp = N.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (9.0, 9.0, 9.0)
    L.new(tc.outputs["Object"], mp.inputs[0]); L.new(mp.outputs[0], gr.inputs[0])
    cr = N.new("ShaderNodeValToRGB")
    c = hexc(col)
    cr.color_ramp.elements[0].position = 0.0; cr.color_ramp.elements[0].color = (c[0] * 0.25, c[1] * 0.25, c[2] * 0.25, 1)
    cr.color_ramp.elements[1].position = 0.45; cr.color_ramp.elements[1].color = (min(1, c[0] * 1.6), min(1, c[1] * 1.5), min(1, c[2] * 1.3), 1)
    L.new(gr.outputs["Fac"], cr.inputs[0]); L.new(cr.outputs[0], b.inputs["Base Color"])
    return m


def build_beard(ch, L, H):
    n, h, cl = ch.name, ch.head, ch.coll
    T = L.get("beard_t", 0.075)

    def thick(d):
        az, el = azel(d)
        a = abs(az)
        if d.y > 0.25 and a > 1.7:
            return -0.01
        # upper boundary: low in the middle (under the nose), rising to the sideburns
        top = -0.28 + 0.08 * ss(0.2, 0.8, a) + 0.27 * ss(1.05, 1.4, a)
        m = ss(top + 0.03, top - 0.05, el) * ss(1.45, 1.3, a) * ss(-1.45, -1.2, el)
        t = T * m * (1 + 0.5 * ss(-0.5, -0.95, el))                       # fuller at the chin
        t *= 1 - G(az, el, 0, -0.42, 0.19, 0.065)                         # lips show
        t += 0.06 * G(az, el, 0, -0.27, 0.26, 0.045) * ss(0.4, 0.1, a) + 0.05 * G(az, el, 0, -0.27, 0.12, 0.04)  # moustache
        return t - 0.006
    Mbd = fur_mat(n + "_beardm", L["beard"], 45, "Z", rough=0.8, bump=0.7, light=1.4, dark=0.5)
    field_mesh(n + "_beard", lambda d: H.r(d) + thick(d), None, 192, h, cl, Mbd,
               keep=lambda d: d.z < 0.35 and d.y < 0.45)
    # soft points of the goatee
    sphere(n + "_chintip", 0.2, tuple(H.surf(0, -0.8, -0.05)), Mbd, (1.4, 0.8, 1.0), parent=h, coll=cl, seg=20)


def build_hair(ch, L, H):
    n, h, cl = ch.name, ch.head, ch.coll
    style = L.get("hairstyle", "pompadour")
    M = fur_mat(n + "_hairm", L["hair"], 40, "Y", rough=0.5, bump=0.5, light=1.7, dark=0.45)

    def hairline(a):
        return 0.5 - 0.12 * ss(0.3, 0.9, a) - 0.25 * ss(1.0, 1.4, a) - 0.95 * ss(1.75, 2.6, a)

    def thick(d):
        az, el = azel(d)
        a = abs(az)
        hl = hairline(a)
        m = ss(hl - 0.03, hl + 0.07, el)
        side = 0.035
        top = ss(0.35, 1.2, el)
        front = ss(1.4, 0.0, a)
        vol = side
        if style == "pompadour":
            vol += 0.2 * top * (0.35 + 0.65 * front) + 0.16 * G(az, el, 0, 0.85, 0.5, 0.22)
            # combed ridges running front-to-back, strongest on the quiff
            vol += 0.045 * top * (0.4 + 0.6 * front) * (0.5 + 0.5 * math.sin(d.x * 17 + 2.0 * d.y * d.x))
        sideburn = 0.03 * ss(0.15, 0.05, abs(a - 1.3)) * ss(-0.15, 0.0, el) * ss(0.6, 0.45, el)
        return max(m * vol, sideburn) - 0.006
    field_mesh(n + "_hair", lambda d: H.r(d) + thick(d), None, 192, h, cl, M, keep=lambda d: d.z > -0.75)
