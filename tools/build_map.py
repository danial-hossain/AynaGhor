#!/usr/bin/env python3
"""AynaGhor map pipeline.

Reads tools/data/mirpur10.osm.gz (OpenStreetMap export, ODbL) and writes
  assets/mirpur.glb   city geometry merged by material
  assets/mirpur.json  collision footprints, roads, lamps, signs, props

World space (Three.js, right-handed): +X = east, +Y = up, -Z = north, metres.
Origin = Mirpur 10 golchottor (where the main road passes under MRT Line 6).

Run:  python3 tools/build_map.py
"""
import gzip, json, math, os, random, struct, xml.etree.ElementTree as ET
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(HERE, "data", "mirpur10.osm.gz")

root = ET.parse(gzip.open(SRC)).getroot()
b = root.find("bounds")
minlat, minlon, maxlat, maxlon = (float(b.get(k)) for k in ("minlat", "minlon", "maxlat", "maxlon"))
lat0, lon0 = (minlat + maxlat) / 2, (minlon + maxlon) / 2
KX, KY = 111320.0 * math.cos(math.radians(lat0)), 110574.0

def proj(lat, lon):
    return ((lon - lon0) * KX, (lat - lat0) * KY)

nodes, node_tags = {}, {}
for n in root.iter("node"):
    nodes[n.get("id")] = proj(float(n.get("lat")), float(n.get("lon")))
    t = {x.get("k"): x.get("v") for x in n.findall("tag")}
    if t: node_tags[n.get("id")] = t
ways = {}
for w in root.iter("way"):
    refs = [nd.get("ref") for nd in w.findall("nd")]
    t = {x.get("k"): x.get("v") for x in w.findall("tag")}
    ways[w.get("id")] = ([nodes[r] for r in refs if r in nodes], t, refs[0] == refs[-1] and len(refs) > 3)
for r in root.iter("relation"):
    t = {x.get("k"): x.get("v") for x in r.findall("tag")}
    if t.get("type") != "multipolygon": continue
    for m in r.findall("member"):
        if m.get("type") == "way" and m.get("role") == "outer" and m.get("ref") in ways:
            pts, wt, closed = ways[m.get("ref")]
            if closed:
                merged = dict(t); merged.update(wt); merged.pop("type", None)
                ways["r" + m.get("ref")] = (pts, merged, True)

# ---------- find the golchottor: metro line x primary road, nearest the export centre ----------
def seg_x(p, q, r, s):
    d1 = (q[0]-p[0], q[1]-p[1]); d2 = (s[0]-r[0], s[1]-r[1])
    den = d1[0]*d2[1] - d1[1]*d2[0]
    if abs(den) < 1e-9: return None
    t = ((r[0]-p[0])*d2[1] - (r[1]-p[1])*d2[0]) / den
    u = ((r[0]-p[0])*d1[1] - (r[1]-p[1])*d1[0]) / den
    if 0 <= t <= 1 and 0 <= u <= 1: return (p[0]+t*d1[0], p[1]+t*d1[1])
    return None

metro_lines = [pts for (pts, t, c) in ways.values() if t.get("railway") == "subway"]
prim = [pts for (pts, t, c) in ways.values() if t.get("highway") == "primary"]
cands = []
for ml in metro_lines:
    for a, c in zip(ml, ml[1:]):
        for pr in prim:
            for r_, s_ in zip(pr, pr[1:]):
                x = seg_x(a, c, r_, s_)
                if x: cands.append(x)
J = min(cands, key=lambda p: p[0]**2 + p[1]**2) if cands else (0.0, 0.0)

def sh(p): return (p[0] - J[0], p[1] - J[1])
nodes = {k: sh(v) for k, v in nodes.items()}
ways = {k: ([sh(p) for p in pts], t, c) for k, (pts, t, c) in ways.items()}
metro_lines = [[sh(p) for p in ml] for ml in metro_lines]
XMIN, YMIN = sh(proj(minlat, minlon)); XMAX, YMAX = sh(proj(maxlat, maxlon))

# ---------- helpers ----------
def area2(p): return sum(p[i][0]*p[(i+1) % len(p)][1] - p[(i+1) % len(p)][0]*p[i][1] for i in range(len(p)))
def clean(p):
    if len(p) > 1 and p[0] == p[-1]: p = p[:-1]
    q = []
    for v in p:
        if not q or abs(v[0]-q[-1][0]) > 1e-3 or abs(v[1]-q[-1][1]) > 1e-3: q.append(v)
    return q
def earclip(poly):
    idx = list(range(len(poly))); tris = []
    cr = lambda o, a, c: (a[0]-o[0])*(c[1]-o[1]) - (a[1]-o[1])*(c[0]-o[0])
    guard = 0
    while len(idx) > 3 and guard < 5000:
        guard += 1; found = False; m = len(idx)
        for i in range(m):
            ia, ib, ic = idx[i-1], idx[i], idx[(i+1) % m]
            a, bb, c = poly[ia], poly[ib], poly[ic]
            if cr(a, bb, c) <= 1e-9: continue
            if any(j not in (ia, ib, ic) and cr(a, bb, poly[j]) >= 0 and cr(bb, c, poly[j]) >= 0 and cr(c, a, poly[j]) >= 0 for j in idx):
                continue
            tris.append((ia, ib, ic)); idx.pop(i); found = True; break
        if not found:
            tris += [(idx[0], idx[k], idx[k+1]) for k in range(1, len(idx)-1)]; return tris
    if len(idx) == 3: tris.append(tuple(idx))
    return tris
def clip_poly(p):
    def clip(pts, inside, inter):
        out = []
        for i in range(len(pts)):
            cur, prev = pts[i], pts[i-1]
            if inside(cur):
                if not inside(prev): out.append(inter(prev, cur))
                out.append(cur)
            elif inside(prev): out.append(inter(prev, cur))
        return out
    ix = lambda x0: (lambda a, c: (x0, a[1] + (c[1]-a[1])*(x0-a[0])/(c[0]-a[0])))
    iy = lambda y0: (lambda a, c: (a[0] + (c[0]-a[0])*(y0-a[1])/(c[1]-a[1]), y0))
    for ins, it in ((lambda q: q[0] >= XMIN, ix(XMIN)), (lambda q: q[0] <= XMAX, ix(XMAX)),
                    (lambda q: q[1] >= YMIN, iy(YMIN)), (lambda q: q[1] <= YMAX, iy(YMAX))):
        if not p: break
        p = clip(p, ins, it)
    return p
def clip_line(pts):
    pieces, cur = [], []
    for a, c in zip(pts, pts[1:]):
        t0, t1 = 0.0, 1.0; dx, dy = c[0]-a[0], c[1]-a[1]; ok = True
        for pp, q in ((-dx, a[0]-XMIN), (dx, XMAX-a[0]), (-dy, a[1]-YMIN), (dy, YMAX-a[1])):
            if pp == 0:
                if q < 0: ok = False; break
            else:
                t = q / pp
                if pp < 0: t0 = max(t0, t)
                else: t1 = min(t1, t)
        if not ok or t0 > t1:
            if len(cur) > 1: pieces.append(cur)
            cur = []; continue
        s = (a[0]+t0*dx, a[1]+t0*dy); e = (a[0]+t1*dx, a[1]+t1*dy)
        if not cur: cur = [s]
        cur.append(e)
        if t1 < 1.0: pieces.append(cur); cur = []
    if len(cur) > 1: pieces.append(cur)
    return pieces
def offset_line(pts, half):
    L, R = [], []; n = len(pts)
    for i in range(n):
        if i == 0: d = (pts[1][0]-pts[0][0], pts[1][1]-pts[0][1])
        elif i == n-1: d = (pts[-1][0]-pts[-2][0], pts[-1][1]-pts[-2][1])
        else:
            d1 = (pts[i][0]-pts[i-1][0], pts[i][1]-pts[i-1][1]); d2 = (pts[i+1][0]-pts[i][0], pts[i+1][1]-pts[i][1])
            l1, l2 = math.hypot(*d1) or 1, math.hypot(*d2) or 1
            d = (d1[0]/l1 + d2[0]/l2, d1[1]/l1 + d2[1]/l2)
        l = math.hypot(*d) or 1; nx, ny = -d[1]/l, d[0]/l; sc = 1.0
        if 0 < i < n-1:
            d1 = (pts[i][0]-pts[i-1][0], pts[i][1]-pts[i-1][1]); l1 = math.hypot(*d1) or 1
            sc = min(1 / max(abs(nx*(-d1[1]/l1) + ny*(d1[0]/l1)), 1e-3), 2.5)
        L.append((pts[i][0]+nx*half*sc, pts[i][1]+ny*half*sc)); R.append((pts[i][0]-nx*half*sc, pts[i][1]-ny*half*sc))
    return L, R

# ---------- mesh groups ----------
class Group:
    def __init__(self, uv=False, col=False):
        self.pos, self.idx = [], []; self.uv = [] if uv else None; self.col = [] if col else None
    def v(self, e, y, n, uv=None, col=None):
        self.pos.append((e, y, -n))
        if self.uv is not None: self.uv.append(uv or (0, 0))
        if self.col is not None: self.col.append(col or (255, 255, 255, 255))
        return len(self.pos) - 1
    def tri(self, a, bq, c, want):
        P = [np.array(self.pos[i]) for i in (a, bq, c)]
        n = np.cross(P[1]-P[0], P[2]-P[0])
        if n[0]*want[0] + n[1]*want[1] + n[2]*want[2] < 0: bq, c = c, bq
        self.idx += [a, bq, c]
G = {}
def grp(name, **kw):
    if name not in G: G[name] = Group(**kw)
    return G[name]
UP, DOWN = (0, 1, 0), (0, -1, 0)

def flat(name, poly, y):
    poly = clean(poly)
    if len(poly) < 3: return
    if area2(poly) < 0: poly = poly[::-1]
    g = grp(name); ids = [g.v(p[0], y, p[1]) for p in poly]
    for a, bq, c in earclip(poly): g.tri(ids[a], ids[bq], ids[c], UP)
def strip(name, piece, w, y, caps=True):
    L, R = offset_line(piece, w / 2); g = grp(name)
    li = [g.v(p[0], y, p[1]) for p in L]; ri = [g.v(p[0], y, p[1]) for p in R]
    for i in range(len(piece) - 1):
        g.tri(ri[i], ri[i+1], li[i+1], UP); g.tri(ri[i], li[i+1], li[i], UP)
    if caps:
        for c in (piece[0], piece[-1]):
            ci = g.v(c[0], y, c[1]); ring = [g.v(c[0] + math.cos(k*math.pi/4)*w/2, y, c[1] + math.sin(k*math.pi/4)*w/2) for k in range(8)]
            for k in range(8): g.tri(ci, ring[k], ring[(k+1) % 8], UP)
def box(name, poly, y0, y1, bottom=False):
    poly = clean(poly)
    if area2(poly) < 0: poly = poly[::-1]
    g = grp(name)
    top = [g.v(p[0], y1, p[1]) for p in poly]
    for a, bq, c in earclip(poly): g.tri(top[a], top[bq], top[c], UP)
    if bottom:
        bt = [g.v(p[0], y0, p[1]) for p in poly]
        for a, bq, c in earclip(poly): g.tri(bt[a], bt[bq], bt[c], DOWN)
    for i in range(len(poly)):
        p, q = poly[i], poly[(i+1) % len(poly)]
        out = (q[1]-p[1], 0, (q[0]-p[0]))   # world-space outward normal of a CCW (east,north) edge
        A = g.v(p[0], y0, p[1]); B = g.v(q[0], y0, q[1]); C = g.v(q[0], y1, q[1]); D = g.v(p[0], y1, p[1])
        g.tri(A, B, C, out); g.tri(A, C, D, out)
def box_along(name, p, q, half_w, y0, y1):
    dx, dz = q[0]-p[0], q[1]-p[1]; L = math.hypot(dx, dz) or 1; nx, nz = -dz/L*half_w, dx/L*half_w
    box(name, [(p[0]-nx, p[1]-nz), (q[0]-nx, q[1]-nz), (q[0]+nx, q[1]+nz), (p[0]+nx, p[1]+nz)], y0, y1, bottom=True)

# ground
M = 350
flat("ground", [(XMIN-M, YMIN-M), (XMAX+M, YMIN-M), (XMAX+M, YMAX+M), (XMIN-M, YMAX+M)], 0.0)

# parks / water
GREEN = {"park", "playground", "pitch", "garden", "stadium", "meadow", "grass", "grassland", "wood", "cemetery"}
stadium = None
for wid, (pts, t, closed) in ways.items():
    if not closed or "building" in t: continue
    kind = t.get("leisure") or t.get("landuse") or t.get("natural")
    if kind in GREEN or kind in ("water", "swimming_pool"):
        poly = clip_poly(clean(pts))
        if len(poly) < 3: continue
        if kind == "stadium" and (stadium is None or abs(area2(poly)) > stadium[0]):
            stadium = (abs(area2(poly)), sum(p[0] for p in poly)/len(poly), sum(p[1] for p in poly)/len(poly))
        flat("water" if kind in ("water", "swimming_pool") else ("pitch" if kind in ("pitch", "stadium") else "grass"), poly, 0.03)

# roads
WIDTH = {"primary": 14, "secondary": 11, "tertiary": 9, "primary_link": 8, "secondary_link": 7, "tertiary_link": 6,
         "residential": 6, "unclassified": 5.5, "living_street": 4.5, "service": 4, "pedestrian": 4,
         "footway": 2.5, "path": 2, "steps": 2.5, "cycleway": 2.5, "track": 3}
RANK = {"primary": 4, "secondary": 4, "tertiary": 3, "primary_link": 3, "secondary_link": 3, "tertiary_link": 3,
        "residential": 2, "unclassified": 2, "living_street": 2, "service": 1, "pedestrian": 1}
roads = []   # dict(t, w, rank, p)
for wid, (pts, t, closed) in sorted(ways.items()):
    h = t.get("highway")
    if h not in WIDTH or t.get("area") == "yes": continue
    for piece in clip_line(pts):
        piece = clean(piece)
        if len(piece) >= 2: roads.append({"t": h, "w": WIDTH[h], "rank": RANK.get(h, 0), "p": piece, "name": t.get("name:bn") or t.get("name") or ""})
for r in sorted(roads, key=lambda r: r["rank"]):
    if r["rank"] >= 2: strip("sidewalk", r["p"], r["w"] + 3.6, 0.06)
for r in sorted(roads, key=lambda r: r["rank"]):
    if r["rank"] >= 3: strip("road_main", r["p"], r["w"], 0.16)
    elif r["rank"] >= 1: strip("road", r["p"], r["w"], 0.12)
    else: strip("path", r["p"], r["w"], 0.09)

# buildings
PAL = [(236, 226, 198), (232, 232, 226), (176, 180, 184), (236, 198, 168), (182, 208, 228), (228, 188, 192), (208, 188, 158), (188, 216, 184), (214, 206, 190), (198, 170, 150)]
buildings = []   # (h, poly)
for wid, (pts, t, closed) in sorted(ways.items()):
    if "building" not in t or not closed: continue
    poly = clean(pts)
    if len(poly) < 3: continue
    if area2(poly) < 0: poly = poly[::-1]
    cx = sum(p[0] for p in poly)/len(poly); cz = sum(p[1] for p in poly)/len(poly)
    if not (XMIN <= cx <= XMAX and YMIN <= cz <= YMAX): continue
    rnd = random.Random(wid); area = abs(area2(poly)) / 2
    lv = None
    try: lv = max(1, round(float(t["height"].split()[0]) / 3)) if "height" in t else int(float(t.get("building:levels", "")))
    except ValueError: lv = None
    if lv is None:
        if area < 40: lv = rnd.choice([1, 1, 2])
        elif area < 120: lv = rnd.choice([2, 3, 4, 5, 6])
        elif area < 600: lv = rnd.choice([5, 6, 6, 7, 7, 8])
        else: lv = rnd.choice([4, 6, 8, 10])
    lv = max(1, min(lv, 25)); h = lv * 3.0
    col = PAL[rnd.randrange(len(PAL))] if lv > 1 or area >= 60 else (150, 156, 160)
    sh_ = rnd.uniform(0.82, 1.0); col = tuple(int(c * sh_) for c in col) + (255,)
    g = grp("walls", uv=True, col=True); u = rnd.randrange(50) * 1.0
    for i in range(len(poly)):
        p, q = poly[i], poly[(i+1) % len(poly)]; L = math.hypot(q[0]-p[0], q[1]-p[1])
        u1 = u + max(1, round(L / 3.0))   # whole number of window bays per wall
        out = (q[1]-p[1], 0, (q[0]-p[0]))
        A = g.v(p[0], 0, p[1], (u, 0), col); B = g.v(q[0], 0, q[1], (u1, 0), col)
        C = g.v(q[0], h, q[1], (u1, lv), col); D = g.v(p[0], h, p[1], (u, lv), col)
        g.tri(A, B, C, out); g.tri(A, C, D, out); u = u1 + 7
    g = grp("roofs"); ids = [g.v(p[0], h, p[1]) for p in poly]
    for a, bq, c in earclip(poly): g.tri(ids[a], ids[bq], ids[c], UP)
    buildings.append((h, poly))

# metro viaduct, pillars, station
DECK_TOP, DECK_TH = 13.0, 1.4
pillars = []
for pts in metro_lines:
    for piece in clip_line(pts):
        piece = clean(piece); acc = 0.0
        for p, q in zip(piece, piece[1:]):
            box_along("concrete", p, q, 2.8, DECK_TOP - DECK_TH, DECK_TOP)
            box_along("rail", p, q, 0.9, DECK_TOP, DECK_TOP + 0.25)
            L = math.hypot(q[0]-p[0], q[1]-p[1]); s = (30 - acc) % 30
            while s < L:
                f = s / L; c = (p[0] + f*(q[0]-p[0]), p[1] + f*(q[1]-p[1]))
                if not any(math.hypot(c[0]-o[0], c[1]-o[1]) < 12 for o in pillars):
                    pillars.append(c)
                    box("concrete", [(c[0]-0.9, c[1]-0.9), (c[0]+0.9, c[1]-0.9), (c[0]+0.9, c[1]+0.9), (c[0]-0.9, c[1]+0.9)], 0.0, DECK_TOP - DECK_TH)
                s += 30
            acc = (acc + L) % 30
station = None
for nid, t in node_tags.items():
    if t.get("railway") == "station" and (t.get("station") == "subway" or t.get("subway") == "yes"):
        sx, sz = nodes[nid]
        if not (XMIN <= sx <= XMAX and YMIN <= sz <= YMAX): continue
        best = None
        for pts in metro_lines:
            for p, q in zip(pts, pts[1:]):
                d = math.hypot((p[0]+q[0])/2 - sx, (p[1]+q[1])/2 - sz)
                if best is None or d < best[0]: best = (d, p, q)
        _, p, q = best; L = math.hypot(q[0]-p[0], q[1]-p[1]) or 1; ux, uz = (q[0]-p[0])/L, (q[1]-p[1])/L
        a = (sx - ux*75, sz - uz*75); c = (sx + ux*75, sz + uz*75)
        box_along("station", a, c, 12, 7.0, 9.0)
        box_along("station_roof", a, c, 13, 19.0, 20.0)
        for k in range(-70, 71, 20):       # station columns down to the street on both sides
            for side in (-11, 11):
                cc = (sx + ux*k - uz*side, sz + uz*k + ux*side)
                box("station", [(cc[0]-0.6, cc[1]-0.6), (cc[0]+0.6, cc[1]-0.6), (cc[0]+0.6, cc[1]+0.6), (cc[0]-0.6, cc[1]+0.6)], 0.0, 19.0)
                pillars.append(cc)
        station = {"x": sx, "z": -sz, "dx": ux, "dz": -uz, "name": t.get("name:bn") or "মিরপুর ১০"}

# ---------- spatial queries ----------
CELL = 25.0
bgrid = {}
for i, (h, poly) in enumerate(buildings):
    xs = [p[0] for p in poly]; ys = [p[1] for p in poly]
    for gx in range(int(min(xs) // CELL), int(max(xs) // CELL) + 1):
        for gy in range(int(min(ys) // CELL), int(max(ys) // CELL) + 1):
            bgrid.setdefault((gx, gy), []).append(i)
def pip(p, poly):
    c = False; j = len(poly) - 1
    for i in range(len(poly)):
        a, bq = poly[i], poly[j]
        if (a[1] > p[1]) != (bq[1] > p[1]) and p[0] < (bq[0]-a[0]) * (p[1]-a[1]) / (bq[1]-a[1]) + a[0]: c = not c
        j = i
    return c
def in_building(p):
    return any(pip(p, buildings[i][1]) for i in bgrid.get((int(p[0] // CELL), int(p[1] // CELL)), []))
SA, SB, SW, SR = [], [], [], []
for r in roads:
    for a, c in zip(r["p"], r["p"][1:]):
        SA.append(a); SB.append(c); SW.append(r["w"] / 2); SR.append(r["rank"])
SA, SB, SW, SR = np.array(SA), np.array(SB), np.array(SW), np.array(SR)
SD = SB - SA; SL2 = (SD ** 2).sum(1) + 1e-9
def road_clear(p, min_rank=0):
    """Signed distance from p to the nearest road surface (negative = on a road)."""
    P = np.array(p); t = np.clip(((P - SA) * SD).sum(1) / SL2, 0, 1)
    d = np.hypot(*(SA + SD * t[:, None] - P).T) - SW
    if min_rank: d = d[SR >= min_rank]
    return float(d.min()) if len(d) else 1e9
def walk(poly, step, start):
    acc = start
    for a, c in zip(poly, poly[1:]):
        L = math.hypot(c[0]-a[0], c[1]-a[1])
        if L < 1e-6: continue
        d = ((c[0]-a[0]) / L, (c[1]-a[1]) / L)
        while acc < L:
            yield (a[0] + d[0]*acc, a[1] + d[1]*acc), d
            acc += step
        acc -= L

R = lambda v: round(v, 2)
rnd = random.Random(10)
lamps, poles_chains, props, signs = [], [], [], []
ZONE, LAMP_ZONE = 260, 430
inz = lambda p, z: abs(p[0]) <= z and abs(p[1]) <= z
for ri, r in enumerate(roads):
    if r["rank"] < 2: continue
    side = 1 if ri % 2 else -1; w = r["w"]
    for k, (p, d) in enumerate(walk(r["p"], 32.0, 8.0 + (ri * 7) % 20)):
        if not inz(p, LAMP_ZONE): continue
        s = side if k % 2 else -side; nrm = (-d[1] * s, d[0] * s)
        q = (p[0] + nrm[0] * (w/2 + 0.9), p[1] + nrm[1] * (w/2 + 0.9))
        if in_building(q) or road_clear(q) < 0.4: continue
        if any((q[0]-l[0])**2 + (q[1]+l[1])**2 < 14**2 for l in lamps[-60:]): continue
        lamps.append([R(q[0]), R(-q[1]), R(-nrm[0]), R(nrm[1])])      # x, z, dir to road (x, z)
    if r["rank"] in (2, 3):
        chain = []
        for p, d in walk(r["p"], 38.0, 15.0):
            if not inz(p, ZONE + 60): continue
            nrm = (-d[1] * -side, d[0] * -side)
            q = (p[0] + nrm[0] * (w/2 + 0.7), p[1] + nrm[1] * (w/2 + 0.7))
            if in_building(q) or road_clear(q) < 0.3:
                if len(chain) > 1: poles_chains.append(chain)
                chain = []; continue
            chain.append([R(q[0]), R(-q[1])])
        if len(chain) > 1: poles_chains.append(chain)
    if w >= 5.5:
        for p, d in walk(r["p"], 21.0, rnd.uniform(5, 20)):
            if not inz(p, ZONE) or rnd.random() > 0.5: continue
            s = rnd.choice((-1, 1)); nrm = (-d[1] * s, d[0] * s)
            kind = rnd.choice(["rickshaw", "rickshaw", "rickshaw", "cng", "van"])
            if rnd.random() < 0.16:
                kind = "tea"; q = (p[0] + nrm[0] * (w/2 + 1.3), p[1] + nrm[1] * (w/2 + 1.3))
                if any(in_building((q[0] + ox, q[1] + oz)) for ox in (-1.1, 0, 1.1) for oz in (-1.1, 0, 1.1)) or road_clear(q) < 0.6: continue
                face = (-nrm[0], -nrm[1])
            else:
                q = (p[0] + nrm[0] * (w/2 - 1.1), p[1] + nrm[1] * (w/2 - 1.1))
                if math.hypot(*q) < 16 or road_clear(q, 3) < -5.5: continue    # keep the middle of main roads and the circle clear
                face = (d[0] * s, d[1] * s)
            if any((q[0]-o["x"])**2 + (q[1]+o["z"])**2 < 4.5**2 for o in props): continue
            props.append({"k": kind, "x": R(q[0]), "z": R(-q[1]), "r": R(math.atan2(face[0], -face[1]))})

# shop fronts: building edges that face a street inside the playable zone
for h, poly in buildings:
    if h < 3 or not any(inz(p, ZONE) for p in poly): continue
    for i in range(len(poly)):
        p, q = poly[i], poly[(i+1) % len(poly)]; L = math.hypot(q[0]-p[0], q[1]-p[1])
        if L < 3.2: continue
        d = ((q[0]-p[0]) / L, (q[1]-p[1]) / L); out = (d[1], -d[0])
        mid = ((p[0]+q[0]) / 2, (p[1]+q[1]) / 2); probe = (mid[0] + out[0]*2.5, mid[1] + out[1]*2.5)
        if not inz(mid, ZONE) or road_clear(probe, 2) > 3.5 or in_building(probe): continue
        n = max(1, int(L // 4.2)); wd = L / n
        for k in range(n):
            c = (p[0] + d[0] * wd * (k + 0.5), p[1] + d[1] * wd * (k + 0.5))
            if in_building((c[0] + out[0]*0.6, c[1] + out[1]*0.6)): continue
            signs.append([R(c[0] + out[0]*0.08), R(-(c[1] + out[1]*0.08)), R(out[0]), R(-out[1]), R(wd - 0.25)])

# spawn: on the footpath of the main road, ~45 m from the circle
spawn = {"x": 30.0, "z": 0.0, "yaw": 0.0}
best = None
for r in roads:
    if r["t"] != "primary": continue
    for p, d in walk(r["p"], 3.0, 0.0):
        dist = math.hypot(*p)
        if 40 < dist < 55:
            for s in (-1, 1):
                q = (p[0] - d[1]*s*(r["w"]/2 + 0.9), p[1] + d[0]*s*(r["w"]/2 + 0.9))
                if not in_building(q) and road_clear(q) > 0.2 and (best is None or q[0] > best[0]):
                    best = q
if best: spawn = {"x": R(best[0]), "z": R(-best[1]), "yaw": R(math.atan2(-best[0], best[1]))}

# ---------- write JSON ----------
data = {
    "bounds": [R(XMIN), R(-YMAX), R(XMAX), R(-YMIN)],          # minX, minZ, maxX, maxZ
    "zone": ZONE,
    "spawn": spawn,
    "buildings": [[R(h)] + [R(v) for p in poly for v in (p[0], -p[1])] for h, poly in buildings],
    "roads": [{"t": r["t"], "w": r["w"], "k": r["rank"], "p": [R(v) for p in r["p"] for v in (p[0], -p[1])]} for r in roads],
    "pillars": [[R(p[0]), R(-p[1])] for p in pillars],
    "lamps": lamps, "poles": poles_chains, "props": props, "signs": signs,
    "landmarks": {"golchottor": [0, 0], "station": station,
                  "stadium": [R(stadium[1]), R(-stadium[2])] if stadium else None},
}
os.makedirs(os.path.join(ROOT, "assets"), exist_ok=True)
with open(os.path.join(ROOT, "assets", "mirpur.json"), "w", encoding="utf-8") as f:
    json.dump(data, f, separators=(",", ":"), ensure_ascii=False)

# ---------- write GLB ----------
bin_ = bytearray(); views, accs, meshes, nodes_ = [], [], [], []
def add_view(arr, target):
    while len(bin_) % 4: bin_.append(0)
    views.append({"buffer": 0, "byteOffset": len(bin_), "byteLength": arr.nbytes, "target": target})
    bin_.extend(arr.tobytes()); return len(views) - 1
for name, g in G.items():
    pos = np.array(g.pos, np.float32); idx = np.array(g.idx, np.uint32 if len(g.pos) > 65535 else np.uint16)
    attrs = {}
    accs.append({"bufferView": add_view(pos, 34962), "componentType": 5126, "count": len(pos), "type": "VEC3",
                 "min": pos.min(0).tolist(), "max": pos.max(0).tolist()}); attrs["POSITION"] = len(accs) - 1
    if g.uv is not None:
        accs.append({"bufferView": add_view(np.array(g.uv, np.float32), 34962), "componentType": 5126, "count": len(pos), "type": "VEC2"})
        attrs["TEXCOORD_0"] = len(accs) - 1
    if g.col is not None:
        accs.append({"bufferView": add_view(np.array(g.col, np.uint8), 34962), "componentType": 5121, "normalized": True, "count": len(pos), "type": "VEC4"})
        attrs["COLOR_0"] = len(accs) - 1
    accs.append({"bufferView": add_view(idx, 34963), "componentType": 5125 if idx.dtype == np.uint32 else 5123, "count": len(idx), "type": "SCALAR"})
    meshes.append({"name": name, "primitives": [{"attributes": attrs, "indices": len(accs) - 1}]})
    nodes_.append({"name": name, "mesh": len(meshes) - 1})
while len(bin_) % 4: bin_.append(0)
gltf = {"asset": {"version": "2.0", "generator": "AynaGhor build_map.py", "copyright": "Map data (c) OpenStreetMap contributors, ODbL"},
        "scene": 0, "scenes": [{"nodes": list(range(len(nodes_)))}], "nodes": nodes_, "meshes": meshes,
        "accessors": accs, "bufferViews": views, "buffers": [{"byteLength": len(bin_)}]}
js = json.dumps(gltf, separators=(",", ":")).encode()
js += b" " * (-len(js) % 4)
with open(os.path.join(ROOT, "assets", "mirpur.glb"), "wb") as f:
    f.write(struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(bin_)))
    f.write(struct.pack("<II", len(js), 0x4E4F534A)); f.write(js)
    f.write(struct.pack("<II", len(bin_), 0x004E4942)); f.write(bin_)

print("junction offset", [round(v, 1) for v in J], "| buildings", len(buildings), "roads", len(roads),
      "lamps", len(lamps), "pole chains", len(poles_chains), "props", len(props), "signs", len(signs),
      "pillars", len(pillars), "| spawn", spawn, "| station", station)
print({k: len(g.pos) for k, g in G.items()})
for fn in ("mirpur.glb", "mirpur.json"):
    print(fn, round(os.path.getsize(os.path.join(ROOT, "assets", fn)) / 1e6, 2), "MB")
