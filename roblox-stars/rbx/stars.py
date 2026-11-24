"""Football star cast: blocky R6 caricatures of Ronaldo, Messi, Neymar, Mbappe, Vini, Haaland, Yamal.

Fan-parody look only: national-team colours, shirt number + surname, signature hair. No club or
federation crests, no sponsor logos, no real voices.

In videos/<slug>/shots.py (after `from rbx.story import *`):
    from rbx import stars
    from rbx.stars import ronaldo, messi, neymar, mbappe, vini, haaland, yamal, ball, pitch
    R = ronaldo(t0, t1, "smug", loc=(0, 0, 0), rot=0)
    b = ball("b1", (1.2, -1.0, 0.45))
    P = pitch()                       # stadium set, centre spot at (0,0,0)

Each cast function = Char + blinks + breathing (like story.eddie). The underlying preset builder
is star(key, ...) and STARS[key] holds its look, so new players are one dict entry."""
import math, random
import bpy
from mathutils import Vector
from .core import mat, hexc, box, cyl, sphere, text, plane, light, D, collection
from . import chars, story

# ------------------------------------------------------------------ looks
# shirt, shirt2 (stripes / trim), shorts, socks, boots, number colour
STARS = {
    "ronaldo": dict(label="RONALDO", num="7", skin="#d6a079", hair="quiff", hair_color="#1b1410",
                    shirt="#c8102e", trim="#1f7a3a", shorts="#1f7a3a", socks="#c8102e", boots="#f2f2f2",
                    numc="#f4d03f", face="hero"),
    "messi": dict(label="MESSI", num="10", skin="#e8c09c", hair="side", hair_color="#4a2f1c",
                  shirt="#79b8e8", stripes="#f7f7f7", trim="#1d2a5c", shorts="#1d1d24", socks="#f7f7f7",
                  boots="#e2b93b", numc="#1d2a5c", beard="#3e2717", face="hero"),
    "neymar": dict(label="NEYMAR JR", num="10", skin="#c48a62", hair="undercut", hair_color="#e9d27a",
                   hair2="#2a1d16", shirt="#f5d10c", trim="#1e8a45", shorts="#1c3f94", socks="#f7f7f7",
                   boots="#ff5ab0", numc="#1e8a45", face="kid"),
    "mbappe": dict(label="MBAPPE", num="10", skin="#7a4e33", hair="bald", hair_color="#1a1210",
                   shirt="#1c2b5a", trim="#e03a3e", shorts="#f7f7f7", socks="#c8102e", boots="#f28c28",
                   numc="#f7f7f7", face="hero"),
    "vini": dict(label="VINI JR", num="7", skin="#6b4430", hair="hightop", hair_color="#14100e",
                 shirt="#f5d10c", trim="#1e8a45", shorts="#1c3f94", socks="#f7f7f7", boots="#33d6c4",
                 numc="#1e8a45", face="kid"),
    "haaland": dict(label="HAALAND", num="9", skin="#f3d6c2", hair="manbun", hair_color="#e8cf8a",
                    shirt="#d0102a", trim="#1b2f6b", shorts="#f7f7f7", socks="#1b2f6b", boots="#7fe03a",
                    numc="#f7f7f7", face="villain", scale=1.12),
    "yamal": dict(label="YAMAL", num="19", skin="#a8714a", hair="curly", hair_color="#17110d",
                  shirt="#c60b1e", trim="#f1bf00", shorts="#1c2b5a", socks="#1c2b5a", boots="#f2f2f2",
                  numc="#f1bf00", face="kid", scale=0.96),
}
ORDER = ["ronaldo", "messi", "neymar", "mbappe", "vini", "haaland", "yamal"]


# ------------------------------------------------------------------ hair (head-local, head top z=0.6)
def _hair(ch, kind, col, col2=None, seed=1):
    n, h, cl = ch.name, ch.head, ch.coll
    M = mat(n + "_hairS", hexc(col), rough=0.4, coat=0.25)
    rnd = random.Random(seed)
    if kind == "bald":                       # shaved: thin dark shadow cap
        sphere(n + "_cap", 0.635, (0, 0.04, 0.36), M, (1.0, 1.0, 0.42), parent=h, coll=cl, seg=32)
        return
    if kind == "quiff":                      # short sides, tall swept-up front
        sphere(n + "_cap", 0.68, (0, 0.08, 0.5), M, (1.0, 1.0, 0.42), parent=h, coll=cl, seg=32)
        sphere(n + "_quiff", 0.5, (0.04, -0.22, 0.78), M, (1.05, 0.72, 0.5), parent=h, coll=cl, seg=24, rot=(-22, 0, -6))
        sphere(n + "_quiff2", 0.36, (0.18, -0.38, 0.86), M, (1.0, 0.7, 0.55), parent=h, coll=cl, seg=20, rot=(-30, 0, 0))
    elif kind == "side":                     # neat side part
        sphere(n + "_cap", 0.71, (0, 0.08, 0.5), M, (1.0, 1.0, 0.52), parent=h, coll=cl, seg=32)
        sphere(n + "_sweep", 0.4, (-0.12, -0.34, 0.6), M, (1.5, 0.55, 0.3), parent=h, coll=cl, seg=24, rot=(0, -12, 0))
        for side in (-1, 1):
            box(f"{n}_burn{side}", (0.1, 0.34, 0.4), (side * 0.61, -0.05, 0.25), M, 0.05, parent=h, coll=cl)
    elif kind == "undercut":                 # dark shaved sides, bleached messy top
        M2 = mat(n + "_hairD", hexc(col2 or "#2a1d16"), rough=0.6)
        sphere(n + "_cap", 0.665, (0, 0.06, 0.4), M2, (1.0, 1.0, 0.5), parent=h, coll=cl, seg=32)
        for i in range(9):
            a = i / 9 * math.tau
            r = 0.22 + 0.1 * (i % 2)
            sphere(f"{n}_tp{i}", 0.26, (math.sin(a) * r, math.cos(a) * r + 0.02, 0.74 + rnd.uniform(0, 0.08)),
                   M, (1, 1, 0.75), parent=h, coll=cl, seg=16)
        sphere(n + "_tpc", 0.3, (0, -0.05, 0.86), M, (1, 1, 0.7), parent=h, coll=cl, seg=16)
    elif kind in ("hightop", "curly"):       # tight curls; hightop = taller block on top
        tall = kind == "hightop"
        sphere(n + "_cap", 0.665, (0, 0.06, 0.42), M, (1.0, 1.0, 0.5), parent=h, coll=cl, seg=32)
        rows = [(0.0, 0.5, 9), (0.35, 0.3, 6), (0.62, 0.0, 1)] if not tall else \
               [(0.0, 0.5, 9), (0.22, 0.46, 9), (0.44, 0.32, 7), (0.62, 0.0, 1)]
        for j, (dz, r, k) in enumerate(rows):
            for i in range(k):
                a = i / k * math.tau + j * 0.4
                sphere(f"{n}_cu{j}_{i}", 0.17 + rnd.uniform(-0.02, 0.03),
                       (math.sin(a) * r, math.cos(a) * r + 0.06, 0.6 + dz * (1.0 if tall else 0.6)),
                       M, parent=h, coll=cl, seg=12)
    elif kind == "manbun":                   # long hair pulled back + bun
        sphere(n + "_cap", 0.72, (0, 0.12, 0.42), M, (1.02, 1.05, 0.66), parent=h, coll=cl, seg=32)
        sphere(n + "_bun", 0.3, (0, 0.5, 0.86), M, parent=h, coll=cl, seg=20)
        cyl(n + "_tie", 0.2, 0.1, (0, 0.38, 0.78), mat("hairtie_black", hexc("#151515"), 0.4), 16,
            rot=(-50, 0, 0), parent=h, coll=cl)
        for side in (-1, 1):
            sphere(f"{n}_strand{side}", 0.16, (side * 0.6, -0.2, 0.2), M, (0.5, 1, 2.0), parent=h, coll=cl, seg=12)


def _beard(ch, col):
    """Short jaw-line beard + light moustache that stays clear of the mouth cell."""
    M = mat(ch.name + "_beardS", hexc(col), 0.8)
    for i in range(19):
        a = math.radians(-88 + 176 * i / 18)
        x, y = math.sin(a) * 0.6, -math.cos(a) * 0.6
        z = -0.52 + abs(math.sin(a)) * 0.36
        sphere(f"{ch.name}_bd{i}", 0.09, (x, y, z), M, (1, 0.6, 0.9), parent=ch.head, coll=ch.coll, seg=10)


# ------------------------------------------------------------------ kit
def _kit(ch, L):
    n, cl, hip = ch.name, ch.coll, ch.hip
    numc = mat(n + "_num", hexc(L["numc"]), 0.5)
    trim = mat(n + "_trim", hexc(L["trim"]), 0.5)
    # collar ring + sleeve cuffs
    box(n + "_collar", (0.9, 0.06, 0.12), (0, -0.52, 1.95), trim, 0.03, parent=hip, coll=cl)
    for piv, s in ((ch.shL, 1), (ch.shR, -1)):
        box(f"{n}_cuff{s}", (1.03, 1.03, 0.14), (0, 0, -0.56), trim, 0.03, parent=piv, coll=cl)
    # number: small on chest, big on back with surname
    text(n + "_numF", L["num"], (0.45, -0.52, 1.45), 0.42, numc, rot=(90, 0, 0), extrude=0.01, parent=hip, coll=cl)
    text(n + "_numB", L["num"], (0, 0.52, 0.9), 1.0, numc, rot=(90, 0, 180), extrude=0.015, parent=hip, coll=cl)
    sz = 0.26 if len(L["label"]) <= 7 else 0.2
    text(n + "_nameB", L["label"], (0, 0.52, 1.62), sz, numc, rot=(90, 0, 180), extrude=0.01, parent=hip, coll=cl)
    # legs rebuilt: shorts / skin / socks / boots
    for nm in ("_legL", "_legR"):
        ob = D.objects.get(n + nm)
        if ob:
            D.objects.remove(ob, do_unlink=True)
    Ms = mat(n + "_shortsS", hexc(L["shorts"]), 0.55)
    Msk = mat(n + "_skinL", ch.skin_c, 0.42)
    Mso = mat(n + "_socks", hexc(L["socks"]), 0.6)
    Mb = mat(n + "_boots", hexc(L["boots"]), 0.3)
    for piv, nm in ((ch.hpL, "_legL"), (ch.hpR, "_legR")):
        box(n + nm, (0.98, 1, 2), (0, 0, -1.0), None, 0.09, parent=piv, coll=cl,
            cuts_z=[-0.78, 0.02, 0.22], mats=[(-0.78, Mb), (0.02, Mso), (0.22, Msk), (5, Ms)])
        box(n + nm + "_stud", (1.0, 1.25, 0.26), (0, -0.12, -1.9), Mb, 0.08, parent=piv, coll=cl)


def star(key, name=None, coll=None, loc=(0, 0, 0), rot=0.0, scale=None, **kw):
    """Build one player (no acting keys). kw overrides any look field."""
    L = dict(STARS[key]); L.update(kw)
    name = name or key.capitalize()
    ch = chars.Char(name, skin=L["skin"], shirt=L["shirt"], pants=L["shorts"], hair="none",
                    face=L.get("face", "hero"), sleeves="short",
                    shirt_kind="stripes" if L.get("stripes") else None, shirt_c2=L.get("stripes"),
                    loc=loc, rot=rot, coll=coll, scale=scale or L.get("scale", 1.0))
    _hair(ch, L["hair"], L["hair_color"], L.get("hair2"), seed=len(key))
    if L.get("beard"):
        _beard(ch, L["beard"])
    _kit(ch, L)
    ch.star = key
    return ch


def _cast(key):
    def make(t0, t1, expr="neutral", loc=(0, 0, 0), rot=0.0, **kw):
        ch = star(key, loc=loc, rot=rot, **kw)
        ch.pose(t0, loc=loc, rot=rot)
        return story._live(ch, t0, t1, expr)
    make.__name__ = key
    make.__doc__ = f"{STARS[key]['label']} #{STARS[key]['num']} with blinks + breathing."
    return make


ronaldo, messi, neymar, mbappe, vini, haaland, yamal = (_cast(k) for k in ORDER)
CAST = dict(zip(ORDER, (ronaldo, messi, neymar, mbappe, vini, haaland, yamal)))


def lineup(t0, t1, keys=ORDER, gap=3.3, y=0.0, expr="smile"):
    """All players side by side facing the camera (-Y), centred on x=0."""
    out = []
    x0 = -gap * (len(keys) - 1) / 2
    for i, k in enumerate(keys):
        out.append(CAST[k](t0, t1, expr, loc=(x0 + i * gap, y, 0)))
    return out


# ------------------------------------------------------------------ props + set
def ball(name="ball", loc=(0, 0, 0.45), r=0.45, coll=None, parent=None):
    """Classic black/white patch ball (procedural Voronoi patches)."""
    m = D.materials.get("football_mat")
    if m is None:
        m = D.materials.new("football_mat"); m.use_nodes = True
        N, Lk = m.node_tree.nodes, m.node_tree.links
        b = next(x for x in N if x.type == "BSDF_PRINCIPLED")
        b.inputs["Roughness"].default_value = 0.35
        tc = N.new("ShaderNodeTexCoord"); vo = N.new("ShaderNodeTexVoronoi")
        vo.inputs["Scale"].default_value = 4.0
        Lk.new(tc.outputs["Object"], vo.inputs["Vector"])
        sep = N.new("ShaderNodeSeparateColor"); Lk.new(vo.outputs["Color"], sep.inputs[0])
        cr = N.new("ShaderNodeValToRGB"); cr.color_ramp.interpolation = "CONSTANT"
        cr.color_ramp.elements[0].color = (0.92, 0.92, 0.92, 1)
        cr.color_ramp.elements[1].position = 0.62; cr.color_ramp.elements[1].color = (0.03, 0.03, 0.035, 1)
        Lk.new(sep.outputs[0], cr.inputs[0]); Lk.new(cr.outputs[0], b.inputs["Base Color"])
    return sphere(name, r, loc, m, parent=parent, coll=coll, seg=32)


def pitch(coll=None, crowd=True, night=False, seed=3):
    """Stadium: striped grass, white lines, a goal at +Y, low stands with a blocky crowd, floodlights."""
    from . import world as W
    cl = coll or collection("Pitch")
    if night:
        story.world((0.02, 0.03, 0.08), 0.4)
    else:
        W.sky(1.0); W.sun(3.5, rot=(50, 0, 25), coll=cl)
    g1 = mat("grass_a", hexc("#2f8f3a"), 0.85); g2 = mat("grass_b", hexc("#3aa346"), 0.85)
    for i in range(-10, 10):
        plane(f"grass{i}", 120, 6, (0, i * 6 + 3, 0), g1 if i % 2 else g2, coll=cl)
    wl = mat("line_white", (0.95, 0.95, 0.95), 0.6)
    box("halfway", (90, 0.25, 0.02), (0, 0, 0.011), wl, 0.0, coll=cl)
    for i in range(48):                                    # centre circle from short segments
        a = i / 48 * math.tau
        box(f"cc{i}", (1.2, 0.25, 0.02), (math.cos(a) * 9, math.sin(a) * 9, 0.011), wl, 0.0,
            rot=(0, 0, math.degrees(a) + 90), coll=cl)
    cyl("spot", 0.35, 0.02, (0, 0, 0.012), wl, 24, coll=cl)
    # box + goal at y = +50
    gy = 50
    for (sx, sy, x, y) in ((40, 0.25, 0, gy - 16), (0.25, 16, -20, gy - 8), (0.25, 16, 20, gy - 8),
                           (18, 0.25, 0, gy - 6), (0.25, 6, -9, gy - 3), (0.25, 6, 9, gy - 3), (90, 0.25, 0, gy)):
        box(f"ln{x}_{y}_{sx}", (sx, sy, 0.02), (x, y, 0.011), wl, 0.0, coll=cl)
    post = mat("goal_post", (0.97, 0.97, 0.97), 0.3)
    for x in (-7.3, 7.3):
        cyl(f"post{x}", 0.22, 4.9, (x, gy, 2.45), post, 16, coll=cl)
    cyl("crossbar", 0.22, 14.6, (0, gy, 4.9), post, 16, rot=(0, 90, 0), coll=cl)
    net = mat("goal_net", (0.9, 0.9, 0.92), 0.8, alpha=0.35)
    box("net_back", (14.6, 0.05, 4.9), (0, gy + 3.0, 2.45), net, 0.0, coll=cl)
    box("net_top", (14.6, 3.0, 0.05), (0, gy + 1.5, 4.9), net, 0.0, coll=cl)
    # stands + crowd
    st = mat("stand_grey", hexc("#3b4150"), 0.7)
    stands = [((0, 62, 0), (130, 10, 1)), ((0, -62, 0), (130, 10, 1)), ((62, 0, 90), (130, 10, 1)), ((-62, 0, 90), (130, 10, 1))]
    rnd = random.Random(seed)
    shirt_cols = ["#c8102e", "#f5d10c", "#79b8e8", "#1c2b5a", "#f7f7f7", "#1e8a45", "#ff8c1a"]
    for j, ((x, y, rz), _) in enumerate(stands):
        for k in range(6):
            off = 4 + k * 2.2
            d = Vector((x, y, 0)).normalized() if (x or y) else Vector((0, 1, 0))
            c = Vector((x, y, 0)) + d * (k * 2.2)
            box(f"stand{j}_{k}", (130 if rz == 0 else 2.4, 2.4 if rz == 0 else 130, 1.6 + k * 1.6),
                (c.x, c.y, (1.6 + k * 1.6) / 2), st, 0.02, coll=cl)
            if crowd:
                for m_ in range(26):
                    t = -60 + m_ * 4.7 + rnd.uniform(-1, 1)
                    px, py = (t, c.y) if rz == 0 else (c.x, t)
                    col = mat("fan_" + shirt_cols[(m_ + k + j) % len(shirt_cols)], hexc(shirt_cols[(m_ + k + j) % len(shirt_cols)]), 0.7)
                    box(f"fan{j}_{k}_{m_}", (1.0, 1.0, 1.4), (px, py, 1.6 + k * 1.6 + 0.7), col, 0.08, coll=cl)
    # floodlights
    for i, (x, y) in enumerate(((-58, -58), (58, -58), (-58, 58), (58, 58))):
        cyl(f"mast{i}", 0.4, 30, (x, y, 15), st, 12, coll=cl)
        box(f"lamp{i}", (5, 0.6, 3), (x, y, 31), mat("lamp_glow", (1, 1, 0.95), 0.3, emit=(1, 1, 0.95), estr=6.0),
            0.05, coll=cl)
        if night:
            light(f"flood{i}", "SPOT", (x, y, 31), 60000, (1, 0.98, 0.92), 1.0, target=(0, 0, 0), coll=cl, spot=70)
    return dict(coll=cl, goal=(0, gy, 0))
