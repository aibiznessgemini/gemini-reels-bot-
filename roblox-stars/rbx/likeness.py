"""Per-player likeness pass for the rigged footballers.

The six newer models share one generic head. This pass reshapes it per player with a smooth
warp field (face length, jaw, chin, cheekbones, nose, lips, eyes, brows) applied to every head
part at once (skin, jaw, lips, teeth, eyes, brows, ears, hair), so everything stays aligned and
keeps its skin weights. Hair and facial hair are rebuilt as shells grown from a copy of the head
mesh (same vertex groups + armature modifier, so they follow the rig).

Armature space (model units, metres): faces -Y, up +Z, head centre ~ (0, 0, 1.40), eyes at z 1.43,
mouth at z 1.30, chin bottom ~1.17."""
import math
import bpy
from mathutils import Vector
from .core import mat, hexc, sphere, cyl

EYE_Z, MOUTH = 1.43, Vector((0, -0.165, 1.296))


def clear_custom_normals(o):
    """Imported glTF meshes keep their original normals; after reshaping we want fresh ones."""
    me = o.data
    a = me.attributes.get("custom_normal")
    if a is not None:
        me.attributes.remove(a)
        return
    try:
        with bpy.context.temp_override(object=o, active_object=o, selected_objects=[o]):
            bpy.ops.mesh.customdata_custom_splitnormals_clear()
    except Exception as e:
        print("normals", o.name, e)


def ss(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


def g(p, c, r):
    return math.exp(-((p - Vector(c)).length_squared) / (r * r))


LOOKS = {
    "ronaldo": dict(face_len=1.12, width=0.97, jaw=1.1, chin=(0.03, 0.02), cheek=0.014, nose=(0.78, 0.65, 0.95),
                    lips=0.75, eye=1.08, brow=0.004, brow_thick=0.55, brow_tilt=-6, hair="quiff",
                    hair_color="#1a1210", skin_mul=1.0),
    "mbappe": dict(face_len=0.96, width=1.08, jaw=1.06, chin=(0.008, 0.0), cheek=0.022, nose=(1.35, 0.72, 0.9),
                   lips=1.25, eye=1.0, brow=0.003, brow_thick=0.65, forehead=1.06, hair="buzz", hair_color="#120d0b",
                   ears=1.12),
    "vinijr": dict(face_len=1.08, width=0.93, jaw=0.9, chin=(0.012, 0.01), cheek=0.016, nose=(1.2, 0.72, 1.0),
                   lips=1.28, eye=1.02, brow_thick=0.7, hair=None),
    "haaland": dict(face_len=1.16, width=0.97, jaw=1.12, chin=(0.03, 0.024), cheek=0.008, nose=(0.9, 0.72, 1.15),
                    lips=0.75, eye=0.94, brow=0.005, brow_thick=0.55, forehead=1.03, hair="bun",
                    hair_color="#d9b46a"),
    "neymar": dict(face_len=1.05, width=0.97, jaw=0.96, chin=(0.016, 0.01), cheek=0.01, nose=(0.95, 0.72, 1.02),
                   lips=1.0, eye=1.04, brow_thick=0.75, brow_tilt=-4, hair=None, beard="neymar",
                   beard_color="#24170f"),
    "yamal": dict(face_len=0.98, width=0.94, jaw=0.93, chin=(0.004, 0.0), cheek=0.006, nose=(0.92, 0.7, 0.9),
                  lips=1.08, eye=1.12, brow_thick=0.7, hair=None, beard="fuzz", beard_color="#2a1c12"),
}

HEAD_PARTS = ("Head_And_Nose", "Chin_Jaw", "Ear_", "Earring_", "Eye_", "Eyebrow_", "Eyelid_", "Lip_",
              "Mouth_", "Teeth_", "Hair_Sculpt", "yct")


def warp_fn(L):
    fl = L.get("face_len", 1.0); w = L.get("width", 1.0); jw = L.get("jaw", 1.0)
    cf, cd = L.get("chin", (0, 0)); ck = L.get("cheek", 0.0); fh = L.get("forehead", 1.0)
    nx, ny, nz = L.get("nose", (1, 1, 1)); lp = L.get("lips", 1.0); ey = L.get("eye", 1.0)
    br = L.get("brow", 0.0); ears = L.get("ears", 1.0)
    nose_base = Vector((0, -0.17, 1.37))

    def f(p):
        p = Vector(p)
        # nose: scale around its root, weighted to the nose region (front of the face only)
        wn = g(p, (0, -0.205, 1.365), 0.045) * ss(-0.15, -0.19, p.y)
        if wn > 1e-4:
            q = nose_base + Vector(((p - nose_base).x * nx, (p - nose_base).y * ny, (p - nose_base).z * nz))
            p = p.lerp(q, wn)
        # lips fullness
        wl = g(p, MOUTH, 0.035) * ss(-0.12, -0.15, p.y)
        if wl > 1e-4:
            q = MOUTH + (p - MOUTH) * lp * 0.85 + Vector((0, 0.008, 0))
            p = p.lerp(q, wl)
        # eye size
        for s in (-1, 1):
            c = Vector((s * 0.056, -0.155, EYE_Z))
            we = g(p, c, 0.03)
            if we > 1e-4:
                p = p.lerp(c + (p - c) * ey, we)
        # ears
        for s in (-1, 1):
            c = Vector((s * 0.15, -0.005, 1.385))
            wr = g(p, c, 0.05) * ss(0.11, 0.14, s * p.x)
            if wr > 1e-4:
                p = p.lerp(c + (p - c) * ears, wr)
        # brow ridge forward
        for s in (-1, 1):
            p.y -= br * g(p, (s * 0.06, -0.17, 1.47), 0.035)
        # cheekbones out + forward
        for s in (-1, 1):
            k = ck * g(p, (s * 0.115, -0.13, 1.37), 0.045)
            p.x += s * k; p.y -= k * 0.6
        # jaw width (below the cheekbones) and overall width
        p.x *= w * (1 + (jw - 1) * ss(1.37, 1.22, p.z))
        # chin forward / down
        wc = g(p, (0, -0.12, 1.21), 0.06)
        p.y -= cf * wc; p.z -= cd * wc
        # face length below the eyes, forehead above
        if p.z < EYE_Z:
            p.z = EYE_Z + (p.z - EYE_Z) * fl
        elif p.z > 1.5:
            p.z = 1.5 + (p.z - 1.5) * fh
        return p
    return f


def _is_head(o):
    return o.type == "MESH" and any(o.name.startswith(h) for h in HEAD_PARTS)


def warp_head(P, L):
    f = warp_fn(L)
    for o in P.meshes:
        if not _is_head(o):
            continue
        M = o.matrix_world.copy(); Mi = M.inverted()
        for v in o.data.vertices:
            v.co = Mi @ f(M @ v.co)
        o.data.update()
        clear_custom_normals(o)


def _brows(P, L):
    bt = L.get("brow_thick"); tilt = L.get("brow_tilt", 0)
    for o in P.meshes:
        if o.name.startswith("Eyebrow_"):
            vs = [o.matrix_world @ v.co for v in o.data.vertices]
            c = sum(vs, Vector()) / len(vs)
            s = 1 if c.x > 0 else -1
            Mi = o.matrix_world.inverted()
            for v, w in zip(o.data.vertices, vs):
                d = w - c
                if bt:
                    d.z *= bt * 0.75
                    d.y *= 0.7
                d.z += 0.006 * (1 - (2 * d.x / 0.09) ** 2)              # gentle arch
                if tilt:                                         # outer end up/down
                    d.z += math.tan(math.radians(tilt)) * d.x * s
                v.co = Mi @ (c + d)
            o.data.update()


CENTER = Vector((0, 0.0, 1.39))


def head_radius_fn(P):
    """Outer head surface radius along a direction from CENTER (ray cast against skin + jaw)."""
    from mathutils.bvhtree import BVHTree
    dg = bpy.context.evaluated_depsgraph_get()
    trees = []
    for o in P.meshes:
        if o.name.startswith("Head_And_Nose") or o.name.startswith("Chin_Jaw") or o.name.startswith("Ear_"):
            trees.append((BVHTree.FromObject(o, dg), o.matrix_world.copy()))
    cache = {}

    def r(d):
        k = (round(d.x, 4), round(d.y, 4), round(d.z, 4))
        if k in cache:
            return cache[k]
        best = 0.12
        for t, M in trees:
            Mi = M.inverted()
            o = Mi @ (CENTER + d * 0.6); dd = (Mi.to_3x3() @ (-d)).normalized()
            hit = t.ray_cast(o, dd, 0.6)
            if hit[0] is not None:
                best = max(best, ((M @ hit[0]) - CENTER).length)
        cache[k] = best
        return best
    return r


def shell(P, name, mask, thick, m, inset=0.004, keep=None, seg=160):
    """Shell over the outer head surface: radius = head + thick*mask (inside the skin where mask=0),
    parented to the Head bone."""
    from .toonhead import field_mesh
    R = P._head_r if hasattr(P, "_head_r") else head_radius_fn(P)
    P._head_r = R

    def rad(d):
        p = CENTER + d * R(d)
        mk = mask(p)
        return R(d) + thick(p) * mk - inset * (1 - mk)
    ob = field_mesh(P.name + "_" + name, rad, None, seg, None, P.coll, m, 1,
                    keep=keep or (lambda d: d.z > -0.55))
    ob.location = CENTER
    return _bone_prop(P, ob, "Head")


def _az(p):
    return abs(math.atan2(p.x, -p.y))


def hairline_z(a, front=1.535, temple=1.505, side=1.455, nape=1.31):
    return front - (front - temple) * ss(0.25, 0.8, a) - (temple - side) * ss(0.9, 1.4, a) - (side - nape) * ss(1.7, 2.6, a)


def _nosheen(m):
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    try:
        b.inputs["Sheen Weight"].default_value = 0.0
    except KeyError:
        pass
    return m


def build_hair(P, L):
    from .toonhead import fur_mat
    style = L.get("hair")
    if not style:
        return
    for o in list(P.meshes):
        if o.name.startswith("Hair_Sculpt") or o.name.startswith("yct"):
            P.meshes.remove(o); bpy.data.objects.remove(o)
    col = L.get("hair_color", "#1a1210")
    M = _nosheen(fur_mat(P.name + "_hairL", col, 120, "Y", rough=0.5, bump=0.4, light=1.5, dark=0.55))
    cz = 1.40
    if style == "buzz":
        mask = lambda p: ss(hairline_z(_az(p), 1.545, 1.51) - 0.006, hairline_z(_az(p), 1.545, 1.51) + 0.006, p.z)
        thick = lambda p: 0.0045
        M = _nosheen(fur_mat(P.name + "_hairB", col, 260, "Z", rough=0.8, bump=0.6, light=1.3, dark=0.6))
    elif style == "quiff":
        def thick(p):
            a = _az(p)
            top = ss(1.5, 1.6, p.z)
            front = ss(1.2, 0.0, a)
            return 0.006 + 0.016 * top * (0.3 + 0.7 * front) + 0.028 * g(p, (0, -0.13, 1.56), 0.07)
        mask = lambda p: ss(hairline_z(_az(p)) - 0.006, hairline_z(_az(p)) + 0.008, p.z)
    elif style == "bun":
        def thick(p):
            return 0.014 + 0.01 * ss(1.45, 1.6, p.z)
        mask = lambda p: ss(hairline_z(_az(p), 1.545, 1.51, 1.44, 1.27) - 0.006,
                            hairline_z(_az(p), 1.545, 1.51, 1.44, 1.27) + 0.008, p.z)
    else:
        return
    shell(P, "hair", mask, thick, M)
    if style == "bun":
        _bone_prop(P, sphere(P.name + "_bun", 0.05, (0, 0.13, 1.6), M, (1.0, 0.9, 0.95), seg=24), "Head")
        _bone_prop(P, cyl(P.name + "_bunband", 0.035, 0.018, (0, 0.105, 1.585), mat("hairband", hexc("#1a1a1a"), 0.5), 20,
                          rot=(-55, 0, 0)), "Head")


def _bone_prop(P, ob, bone):
    """Parent a prop (built in armature space) to a bone, keeping its place."""
    for c in list(ob.users_collection):
        c.objects.unlink(ob)
    P.coll.objects.link(ob)
    bpy.context.view_layer.update()
    W = ob.matrix_world.copy()
    ob.parent = P.arm; ob.parent_type = "BONE"; ob.parent_bone = bone
    bpy.context.view_layer.update()
    ob.matrix_world = P.arm.matrix_world @ W
    P.meshes.append(ob)
    return ob


def build_beard(P, L):
    from .toonhead import fur_mat
    kind = L.get("beard")
    if not kind:
        return
    col = L.get("beard_color", "#24170f")
    M = _nosheen(fur_mat(P.name + "_beardL", col, 220, "Z", rough=0.85, bump=0.6, light=1.4, dark=0.55))
    lips = lambda p: g(p, MOUTH + Vector((0, -0.01, 0)), 0.028)
    if kind == "neymar":
        def mask(p):
            a = _az(p)
            jaw = ss(1.31, 1.28, p.z) * ss(0.075, 0.1, abs(p.x)) * ss(1.5, 1.3, a)   # thin strap on the jaw sides
            must = g(p, (0, -0.172, 1.318), 0.022)                                       # moustache
            goatee = g(p, (0, -0.15, 1.235), 0.026) + 0.8 * g(p, (0, -0.12, 1.2), 0.03)
            return max(0.0, min(1.0, max(jaw * 0.9, must, goatee) - lips(p) * 0.9))
        thick = lambda p: 0.007 + 0.005 * g(p, (0, -0.15, 1.23), 0.03)
    else:                                                                                # young fuzz
        mask = lambda p: max(0.0, g(p, (0, -0.175, 1.322), 0.016) - lips(p)) * 0.6
        thick = lambda p: 0.004
    shell(P, "beard", mask, thick, M, inset=0.004, keep=lambda d: d.z < 0.2 and d.y < 0.3)


def apply(P):
    L = LOOKS.get(P.key)
    if not L:
        return
    warp_head(P, L)
    _brows(P, L)
    build_hair(P, L)
    build_beard(P, L)


def flatten_face(P, a=0.158, b=0.19, c=0.235, cz=1.40):
    """Photo-face heads: pull every front bump (sculpted nose, muzzle, lips) back onto a smooth egg so the
    painted features read without a second, misplaced 3D nose."""
    for o in P.meshes:
        if not o.name.startswith("Head_And_Nose"):
            continue
        M = o.matrix_world; Mi = M.inverted()
        for v in o.data.vertices:
            p = M @ v.co
            if p.y >= 0:
                continue
            e = (p.x / a) ** 2 + ((p.z - cz) / c) ** 2
            if e >= 1:
                continue
            yf = -b * math.sqrt(1 - e)
            if p.y < yf * 0.45:                 # outer front surface: snap bumps AND dents onto the egg
                p.y = yf
                v.co = Mi @ p
        o.data.update()
        clear_custom_normals(o)


def reproject_face_uv(P):
    """Photo-face heads: the shipped UVs map the muzzle/under-nose to the wrong part of the photo.
    Fit the front projection from the well-mapped forehead/eye region and re-project the whole front."""
    import numpy as np
    for o in P.meshes:
        if not o.name.startswith("Head_And_Nose"):
            continue
        me = o.data
        uv = me.uv_layers.active
        if uv is None:
            continue
        M = o.matrix_world
        pos = [M @ v.co for v in me.vertices]
        rows, us, vs = [], [], []
        for li, lp in enumerate(me.loops):
            p = pos[lp.vertex_index]
            if p.y < -0.12 and 1.43 < p.z < 1.53 and abs(p.x) < 0.11:
                rows.append((p.x, p.z, 1.0)); us.append(uv.data[li].uv[0]); vs.append(uv.data[li].uv[1])
        if len(rows) < 20:
            continue
        A = np.array(rows)
        cu = np.linalg.lstsq(A, np.array(us), rcond=None)[0]
        cv = np.linalg.lstsq(A, np.array(vs), rcond=None)[0]
        for li, lp in enumerate(me.loops):
            p = pos[lp.vertex_index]
            if p.y < 0.02:
                uv.data[li].uv = (cu[0] * p.x + cu[1] * p.z + cu[2], cv[0] * p.x + cv[1] * p.z + cv[2])
        print("face uv fit", P.key, [round(x, 3) for x in cu], [round(x, 3) for x in cv])
