"""Original island illustrations for the ocean map and journey islands (docs/PATHS.md, D-041).

Writes src/paths/islands/art/<id>.svg (viewBox 480x300, flat style like Monster Island), home.svg, fog.svg and
src/paths/islands/islands.json: each island's stop band (a polyline in 0..1 island coordinates, checked here to stay
on grass and clear of trees, signs and buildings for 5..8 stops) and two character spots.
Run: python3 scripts/gen_islands.py   (standard library only; deterministic)
"""
import json
import math
import os
import random

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
ART = os.path.join(ROOT, "src", "paths", "islands", "art")

W, H = 480, 300
INK = "#2B2140"


def blob(cx, cy, rx, ry, seed, amp=0.07, n=72, square=1.0, extra=None):
    rnd = random.Random(seed)
    harm = [(k, rnd.uniform(0.3, 1) * amp / k ** 0.6, rnd.uniform(0, 6.28)) for k in range(2, 7)]
    pts = []
    for i in range(n):
        t = 2 * math.pi * i / n
        r = 1 + sum(a * math.sin(k * t + p) for k, a, p in harm)
        if extra:
            r += extra(t)
        c, s = math.cos(t), math.sin(t)
        if square != 1.0:  # superellipse
            m = (abs(c) ** square + abs(s) ** square) ** (-1 / square)
            c, s = c * m, s * m
        pts.append((cx + rx * r * c, cy + ry * r * s))
    return pts


def scale(pts, f, cx=W / 2, cy=H / 2 + 6):
    return [(cx + (x - cx) * f, cy + (y - cy) * f) for x, y in pts]


def path(pts):
    n = len(pts)
    d = f"M{pts[0][0]:.1f} {pts[0][1]:.1f}"
    for i in range(n):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f" C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}"
    return d + "Z"


def inside(pts, x, y):
    c = False
    for i in range(len(pts)):
        (x1, y1), (x2, y2) = pts[i - 1], pts[i]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            c = not c
    return c


OBS = []


def tree(x, y, s=1.0, c="#5FAE5F", d="#4E9A50"):
    OBS.append((x, y + 6 * s, 22 * s, "tree"))
    return (f'<ellipse cx="{x}" cy="{y + 30 * s}" rx="{16 * s}" ry="{5 * s}" fill="{INK}" opacity="0.1"/>'
            f'<rect x="{x - 4 * s}" y="{y + 6 * s}" width="{8 * s}" height="{24 * s}" rx="{4 * s}" fill="#8B5A3C"/>'
            f'<circle cx="{x}" cy="{y}" r="{18 * s}" fill="{c}"/><circle cx="{x + 5 * s}" cy="{y + 5 * s}" r="{11 * s}" fill="{d}" opacity="0.5"/>'
            f'<circle cx="{x - 6 * s}" cy="{y - 6 * s}" r="{5 * s}" fill="#fff" opacity="0.25"/>')


def pine(x, y, s=1.0):
    OBS.append((x, y, 20 * s, "tree"))
    return (f'<ellipse cx="{x}" cy="{y + 26 * s}" rx="{13 * s}" ry="{4 * s}" fill="{INK}" opacity="0.1"/>'
            f'<rect x="{x - 3 * s}" y="{y + 14 * s}" width="{6 * s}" height="{12 * s}" fill="#8B5A3C"/>'
            f'<path d="M{x} {y - 26 * s} L{x + 16 * s} {y + 16 * s} L{x - 16 * s} {y + 16 * s}Z" fill="#3F8F4F"/>'
            f'<path d="M{x} {y - 26 * s} L{x + 16 * s} {y + 16 * s} L{x} {y + 16 * s}Z" fill="#2F7A40" opacity="0.6"/>')


def palm(x, y, s=1.0, flip=1):
    f = flip
    OBS.append((x, y + 12 * s, 22 * s, "tree"))
    return (f'<ellipse cx="{x}" cy="{y + 34 * s}" rx="{14 * s}" ry="{4 * s}" fill="{INK}" opacity="0.1"/>'
            f'<path d="M{x} {y + 34 * s} Q{x + 6 * f * s} {y + 14 * s} {x + 2 * f * s} {y - 4 * s}" stroke="#9A6A45" stroke-width="{6 * s}" fill="none" stroke-linecap="round"/>'
            + "".join(f'<path d="M{x + 2 * f * s} {y - 4 * s} Q{x + (2 + dx * 0.6) * f * s} {y + (dy - 10) * s} {x + (2 + dx) * f * s} {y + dy * s}" stroke="#4FA85A" stroke-width="{7 * s}" fill="none" stroke-linecap="round"/>'
                      for dx, dy in [(-20, 4), (20, 6), (-14, -14), (16, -12), (2, -20)])
            + f'<circle cx="{x + 2 * f * s}" cy="{y}" r="{3.5 * s}" fill="#8B5A3C"/>')


def cloud(x, y, s=1.0, o=0.95):
    return (f'<g opacity="{o}"><ellipse cx="{x}" cy="{y}" rx="{30 * s}" ry="{13 * s}" fill="#fff"/>'
            f'<circle cx="{x - 12 * s}" cy="{y - 8 * s}" r="{12 * s}" fill="#fff"/><circle cx="{x + 8 * s}" cy="{y - 12 * s}" r="{15 * s}" fill="#fff"/></g>')


def svg(body, w=W, h=H):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">{body}</svg>'


def base(land_pts, grass, halo="#BDE8F7"):
    return (f'<path d="{path(scale(land_pts, 1.10))}" fill="{halo}" opacity="0.8"/>'
            f'<path d="{path(scale(land_pts, 1.03))}" fill="#F6E3A8"/>'
            f'<path d="{path(scale(land_pts, 0.995))}" fill="#EBD28E" opacity="0.6"/>'
            f'<path d="{path(scale(land_pts, 0.9))}" fill="{grass}"/>')


def clear_band(land, pad=0.88):
    return scale(land, pad)


islands = {}
obstacles = {}

# --- Word Woods (English): round island with a bay, forest rim, lanterns and letter signposts
land = blob(240, 156, 205, 118, seed=3, amp=0.06, extra=lambda t: -0.2 * math.exp(-((t - 2.2) / 0.22) ** 2) + 0.08 * math.exp(-((t - 5.5) / 0.4) ** 2))
b = base(land, "#9FD88E")
trees = [(70, 120, .9), (98, 92, 1), (140, 72, 1.1), (190, 62, .9), (300, 62, 1), (345, 74, 1.1), (392, 98, .9), (414, 132, .8),
         (86, 204, .9), (118, 236, 1), (360, 232, 1), (400, 200, .9), (250, 58, .8)]
b += "".join(tree(x, y, s) for x, y, s in trees)
b += pine(160, 240, .9) + pine(330, 246, .8)
for x, y in [(220, 236), (280, 96)]:  # lantern posts
    b += (f'<rect x="{x - 2}" y="{y - 18}" width="4" height="30" fill="#5A4636"/><circle cx="{x}" cy="{y - 22}" r="11" fill="#FFE27A" opacity="0.5"/>'
          f'<rect x="{x - 6}" y="{y - 28}" width="12" height="12" rx="3" fill="#FFD43B" stroke="{INK}" stroke-width="2"/>')
for x, y, ch in [(220, 62, "A"), (300, 236, "b")]:
    OBS.append((x, y - 10, 20, "sign"))
     # letter signposts
    b += (f'<rect x="{x - 2}" y="{y - 4}" width="4" height="22" fill="#8B5A3C"/><rect x="{x - 14}" y="{y - 26}" width="28" height="24" rx="6" fill="#fff" stroke="{INK}" stroke-width="2.5"/>'
          f'<text x="{x}" y="{y - 8}" font-family="Arial Rounded MT Bold, Arial, sans-serif" font-weight="700" font-size="17" text-anchor="middle" fill="#1F6B2B">{ch}</text>')
islands["word-woods"] = (svg(b), land)
obstacles["word-woods"] = OBS[:]
OBS.clear()

# --- Number Hill (Maths): taller island with terraced hills at the back and number-block towers
land = blob(240, 160, 200, 120, seed=11, amp=0.08, extra=lambda t: 0.12 * max(0, -math.sin(t)) ** 3)
b = base(land, "#C9E59A")
for x, w, h, c in [(150, 110, 70, "#A9D47E"), (300, 140, 96, "#9ACB6E"), (390, 90, 56, "#B3D98A")]:
    y = 116
    b += f'<path d="M{x - w / 2} {y} Q{x} {y - h * 2} {x + w / 2} {y}Z" fill="{c}"/>'
    for k in (0.35, 0.6):
        b += f'<path d="M{x - w / 2 * (1 - k)} {y - h * k * 1.25} Q{x} {y - h * k * 1.25 - 6} {x + w / 2 * (1 - k)} {y - h * k * 1.25}" stroke="#86B85E" stroke-width="3" fill="none" stroke-linecap="round"/>'
b += f'<rect x="298" y="10" width="3" height="22" fill="{INK}"/><path d="M301 11 L320 17 L301 23Z" fill="#FF9F43"/>'
cols = ["#FF9F43", "#FFD43B", "#2EC4B6"]
for bx, n in [(60, 1), (82, 2), (104, 3)]:
    for k in range(n):
        b += f'<rect x="{bx}" y="{232 - 20 * k}" width="19" height="19" rx="4" fill="{cols[k]}" stroke="{INK}" stroke-width="2"/>'
for bx, n in [(368, 3), (390, 2), (412, 1)]:
    for k in range(n):
        b += f'<rect x="{bx}" y="{236 - 20 * k}" width="19" height="19" rx="4" fill="{cols[k]}" stroke="{INK}" stroke-width="2"/>'
b += tree(70, 150, .8) + tree(420, 150, .8) + tree(230, 250, .7)
islands["number-hill"] = (svg(b), land)
obstacles["number-hill"] = OBS[:]
OBS.clear()

# --- Sky School (Pilot): long flat island, runway down the middle, tower, hangar, windsock, clouds
land = blob(240, 162, 215, 112, seed=21, amp=0.05)
b = base(land, "#B8E59C")
b += '<rect x="96" y="126" width="290" height="44" rx="22" fill="#8C93A8"/>'
b += "".join(f'<rect x="{x}" y="146" width="18" height="4" rx="2" fill="#fff"/>' for x in range(120, 370, 30))
b += f'<rect x="58" y="90" width="22" height="56" rx="3" fill="#E9EEF5" stroke="{INK}" stroke-width="2.5"/><rect x="50" y="76" width="38" height="20" rx="5" fill="#9DD6F5" stroke="{INK}" stroke-width="2.5"/><rect x="66" y="66" width="6" height="10" fill="{INK}"/>'
b += f'<path d="M330 120 Q360 72 390 120Z" fill="#E5484D" stroke="{INK}" stroke-width="2.5"/><rect x="348" y="102" width="24" height="18" rx="2" fill="#5A2730"/>'
b += f'<rect x="420" y="96" width="3" height="40" fill="{INK}"/><path d="M423 98 L448 102 L446 110 L423 112Z" fill="#E5484D"/><path d="M430 99 L436 100 L436 111 L430 111Z" fill="#fff"/>'
b += tree(110, 214, .8) + tree(380, 214, .8) + tree(210, 92, .6)
b += cloud(120, 40, .9) + cloud(380, 30, 1.1) + cloud(260, 20, .7)
islands["sky-school"] = (svg(b), land)
obstacles["sky-school"] = OBS[:]
OBS.clear()

# --- Fizz Lab (Science): rocky island with a bubbling volcano and crystals
land = blob(240, 160, 195, 118, seed=37, amp=0.09, extra=lambda t: 0.16 * math.exp(-((t - 5.2) / 0.35) ** 2) - 0.12 * math.exp(-((t - 1.6) / 0.25) ** 2))
b = base(land, "#A9D78E", halo="#C3EAF7")
b += f'<path d="M300 130 L345 40 L372 40 L420 130Z" fill="#A0806A"/><path d="M345 40 L372 40 L362 60 L352 56Z" fill="#FF6B6B"/>'
b += f'<path d="M300 130 L345 40 L352 56 L330 130Z" fill="#8A6B57" opacity="0.6"/>'
for x, y, r, c in [(356, 26, 8, "#FF8FB1"), (370, 12, 6, "#8E6CEF"), (346, 8, 5, "#2EC4B6"), (362, -2, 4, "#FF8FB1")]:
    b += f'<circle cx="{x}" cy="{y + 8}" r="{r}" fill="{c}" stroke="{INK}" stroke-width="2"/>'
for x, y in [(80, 200), (98, 214), (400, 220)]:
    b += f'<path d="M{x} {y} L{x + 7} {y - 22} L{x + 14} {y}Z" fill="#B79CFF" stroke="{INK}" stroke-width="2"/>'
b += f'<ellipse cx="110" cy="110" rx="34" ry="16" fill="#B6A28C"/><ellipse cx="104" cy="104" rx="20" ry="9" fill="#C9B79C"/>'
b += tree(180, 70, .8) + tree(250, 250, .8) + tree(340, 236, .7)
islands["fizz-lab"] = (svg(b), land)
obstacles["fizz-lab"] = OBS[:]
OBS.clear()

# --- Code Garden (CS): squarish island with tidy garden beds and square stepping tiles
land = blob(240, 158, 196, 112, seed=5, amp=0.03, square=4.5)
b = base(land, "#BCE384")
for x, y in [(70, 78), (130, 78), (300, 74), (360, 74), (80, 210), (330, 214), (390, 210)]:
    b += f'<rect x="{x}" y="{y}" width="50" height="34" rx="6" fill="#8DC45C"/>' + "".join(
        f'<rect x="{x + 6}" y="{y + 6 + 9 * k}" width="38" height="4" rx="2" fill="#6EA845"/>' for k in range(3))
b += f'<rect x="196" y="60" width="44" height="44" rx="8" fill="#FFD43B" stroke="{INK}" stroke-width="2.5"/><path d="M210 76 L204 82 L210 88 M226 76 L232 82 L226 88" stroke="{INK}" stroke-width="3" fill="none" stroke-linecap="round"/>'
b += tree(420, 140, .8) + tree(60, 150, .7)
islands["code-garden"] = (svg(b), land)
obstacles["code-garden"] = OBS[:]
OBS.clear()

# --- Wild Shore (Nature): island with a lagoon on one side, palms, coral and a turtle
land = blob(240, 158, 205, 116, seed=44, amp=0.07)
b = base(land, "#A6DC93", halo="#B5EFE0")
b += f'<ellipse cx="392" cy="214" rx="54" ry="30" fill="#F6E3A8"/><ellipse cx="392" cy="214" rx="44" ry="22" fill="#8EE3C8"/>'
b += "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#FF8FB1"/>' for x, y, r in [(376, 218, 5), (384, 212, 4), (404, 222, 5), (412, 210, 3)])
b += palm(80, 110, .9) + palm(120, 70, 1, -1) + palm(330, 60, 1) + palm(410, 110, .9, -1) + palm(100, 200, .9)
b += f'<ellipse cx="230" cy="250" rx="16" ry="11" fill="#5FAE5F" stroke="{INK}" stroke-width="2"/><circle cx="248" cy="248" r="6" fill="#7CCB7C" stroke="{INK}" stroke-width="2"/>'
b += tree(220, 66, .8)
islands["wild-shore"] = (svg(b), land)
obstacles["wild-shore"] = OBS[:]
OBS.clear()


# --- Generic island (paths without their own island yet): meadow, a few trees and rocks
land = blob(240, 158, 200, 114, seed=17, amp=0.07)
b = base(land, "#A9DB91")
b += "".join(tree(x, y, s) for x, y, s in [(90, 100, .9), (140, 74, .8), (330, 70, .9), (390, 104, .8), (100, 214, .8), (380, 220, .8)])
b += f'<ellipse cx="240" cy="246" rx="24" ry="10" fill="#B6A28C"/><ellipse cx="236" cy="242" rx="14" ry="6" fill="#C9B79C"/>'
obstacles_extra_generic = [(240, 246, 24)]
islands["generic"] = (svg(b), land)
obstacles["generic"] = OBS[:]
OBS.clear()

# --- Home islet (Monster Island): the monster's little house and a dock
land = blob(120, 80, 90, 46, seed=9, amp=0.05)
hb = (f'<path d="{path(scale(land, 1.12, 120, 82))}" fill="#BDE8F7" opacity="0.8"/><path d="{path(land)}" fill="#F6E3A8"/>'
      f'<path d="{path(scale(land, 0.75, 120, 82))}" fill="#A6DC93"/>'
      f'<rect x="180" y="86" width="56" height="10" rx="3" fill="#B98A5E"/>' + "".join(f'<rect x="{x}" y="94" width="5" height="14" fill="#8B5A3C"/>' for x in (186, 206, 226))
      + f'<rect x="96" y="58" width="42" height="34" rx="4" fill="#FFF4D6" stroke="{INK}" stroke-width="2.5"/><path d="M90 60 L117 36 L144 60Z" fill="#8E6CEF" stroke="{INK}" stroke-width="2.5" stroke-linejoin="round"/>'
      f'<rect x="111" y="72" width="12" height="20" rx="5" fill="#8B5A3C"/>' + palm(62, 44, .7))
OBS.clear()

fog = "".join(cloud(x, y, s, o) for x, y, s, o in [(120, 150, 2.4, .92), (260, 120, 2.8, .95), (380, 170, 2.2, .92), (220, 210, 2.6, .9), (340, 90, 1.8, .9), (110, 230, 1.8, .85), (400, 240, 1.7, .85)])

grass = {k: scale(land, 0.84) for k, (s, land) in islands.items()}
obs = obstacles
extra = {
 "word-woods": [(220, 230, 16), (280, 90, 16)],
 "number-hill": [(x, 105, 12) for x in range(100, 441, 20)] + [(80, 230, 30), (400, 230, 30)],  # hills: everything above y=116
 "sky-school": [(69, 110, 26), (360, 105, 28), (432, 112, 16)],
 "fizz-lab": [(360, 95, 45), (330, 120, 25), (395, 120, 25), (110, 110, 30), (90, 205, 20), (407, 210, 14)],
 "code-garden": [(95, 95, 28), (155, 95, 28), (325, 91, 28), (385, 91, 28), (105, 227, 28), (355, 231, 28), (415, 227, 28), (218, 82, 26)],
 "wild-shore": [(392, 214, 50), (235, 250, 20)],
 "generic": [(240, 246, 24)],
}
lines = {
 "word-woods": [(108, 168), (160, 142), (215, 168), (268, 192), (322, 170), (372, 150)],
 "number-hill": [(104, 172), (160, 150), (220, 178), (280, 198), (338, 176), (382, 166)],
 "sky-school": [(112, 148), (372, 148)],
 "fizz-lab": [(112, 172), (170, 152), (230, 176), (290, 192), (342, 172), (378, 170)],
 "code-garden": [(102, 166), (160, 146), (220, 170), (280, 190), (334, 168), (372, 160)],
 "wild-shore": [(122, 162), (180, 142), (240, 166), (298, 186), (344, 160), (372, 150)],
 "generic": [(110, 166), (168, 146), (228, 170), (288, 186), (344, 166), (376, 156)],
}
def inside(pts, x, y):
    c = False
    for i in range(len(pts)):
        (x1, y1), (x2, y2) = pts[i - 1], pts[i]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1: c = not c
    return c
def sample(line, n):
    seg = [math.dist(a, b) for a, b in zip(line, line[1:])]; L = sum(seg); out = []
    for i in range(n):
        d = L * i / (n - 1); j = 0
        while j < len(seg) - 1 and d > seg[j]: d -= seg[j]; j += 1
        t = d / seg[j]; a, b = line[j], line[j + 1]; out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
    return out
# Geometry in art units, checked at the smallest journey stage (960 px wide = 2 px per unit; bigger stages only shrink
# the fixed-size pieces): stops of 56–88 px, the monster (~92 px) standing on the current stop, and the people
# (92 px art + name tag, 104 px wide) who stand on the island.
R = 16  # stop radius used against trees and the shore (the generator's spacing rule keeps stops 36+ apart)
PX = 2.0
MON_W, MON_H = 46 / 2 * 2, 48  # monster box, units (46 wide)
FIG_W, FIG_H = 52, 59  # person box, units

def stop_r(gap):
    return min(44 / PX, 0.43 * gap)

def circle_rect(cx, cy, r, x0, y0, x1, y1):
    nx, ny = max(x0, min(cx, x1)), max(y0, min(cy, y1))
    return math.hypot(cx - nx, cy - ny) < r

def rects_hit(a, b):
    return a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3]

prefs = {  # where we'd like the host (first) and a friend (second) to stand; the nearest clear spot is used
 "word-woods": [(236, 122), (180, 236)],
 "number-hill": [(236, 150), (250, 250)],
 "sky-school": [(262, 136), (232, 230)],
 "fizz-lab": [(210, 128), (176, 236)],
 "code-garden": [(272, 130), (220, 246)],
 "wild-shore": [(262, 124), (176, 230)],
 "generic": [(240, 128), (180, 236)],
}
problems = []
data = {}
for k, line in lines.items():
    # what the monster and people must not cover: the letter signs (meaningful, and look wrong half-hidden). Standing
    # in front of trees, hills, beds or buildings is fine (they are drawn in front of the art).
    solid = [o for o in obs[k] if len(o) > 3 and o[3] == "sign"]
    monsters, stopcircles = [], []
    for n in (5, 6, 7, 8):
        st = sample(line, n)
        gap = min(math.dist(a, b) for a, b in zip(st, st[1:]))
        if gap < 2 * R + 4:
            problems.append(f"{k}: {n} stops are only {gap:.0f} apart")
        r = stop_r(gap)
        for i, (x, y) in enumerate(st):
            ok = all(inside(grass[k], x + dx, y + dy) for dx, dy in [(R, 0), (-R, 0), (0, R), (0, -R)])
            hit = [o for o in obs[k] + extra[k] if math.dist((x, y), o[:2]) < R + o[2] - 4]
            if not ok or hit:
                problems.append(f"{k}: stop {i + 1}/{n} at ({x:.0f},{y:.0f}) {'leaves the grass' if not ok else 'hits ' + str(hit[0][:3])}")
            m = (x - MON_W / 2, y - r - MON_H + 6, x + MON_W / 2, y - r + 6)
            for o in solid:
                if circle_rect(o[0], o[1], o[2] - 4, *m):
                    problems.append(f"{k}: the monster on stop {i + 1}/{n} at ({x:.0f},{y:.0f}) hits {tuple(round(v) for v in o[:3])}")
            monsters.append(m)
            stopcircles.append((x, y, r))
    # people: the clear spot nearest each preferred position (grid search)
    def clear(x, y, taken):
        fig = (x - FIG_W / 2, y - FIG_H, x + FIG_W / 2, y)
        if not all(inside(grass[k], px_, py_) for px_, py_ in [(x - FIG_W / 2 + 6, y), (x + FIG_W / 2 - 6, y), (x, y - FIG_H / 2)]):
            return False
        if any(circle_rect(cx, cy, cr + 4, *fig) for cx, cy, cr in stopcircles):
            return False
        if any(circle_rect(o[0], o[1], o[2] - 4, *fig) for o in solid):
            return False
        if any(rects_hit(fig, m) for m in monsters) or any(rects_hit(fig, t) for t in taken):
            return False
        return True
    chosen, taken = [], []
    for px_, py_ in prefs[k]:
        best = None
        for gx in range(40, 441, 4):
            for gy in range(60, 291, 4):
                if clear(gx, gy, taken):
                    d = math.hypot(gx - px_, gy - py_)
                    if best is None or d < best[0]:
                        best = (d, gx, gy)
        if best is None:
            problems.append(f"{k}: no clear spot for a character near {(px_, py_)}")
            continue
        chosen.append((best[1], best[2]))
        taken.append((best[1] - FIG_W / 2, best[2] - FIG_H, best[1] + FIG_W / 2, best[2]))
    data[k] = {"line": [[round(x / W, 4), round(y / H, 4)] for x, y in line], "spots": [[round(x / W, 4), round(y / H, 4)] for x, y in chosen]}
if problems:
    raise SystemExit("island layout problems:\n  " + "\n  ".join(problems))

os.makedirs(ART, exist_ok=True)
for k, (s, _land) in islands.items():
    open(os.path.join(ART, f"{k}.svg"), "w").write(s + "\n")
open(os.path.join(ART, "home.svg"), "w").write(svg(hb, 240, 160) + "\n")
open(os.path.join(ART, "fog.svg"), "w").write(svg(fog) + "\n")
json.dump(data, open(os.path.join(ROOT, "src", "paths", "islands", "islands.json"), "w"), indent=1)
print(f"wrote {len(islands)} islands + home + fog to {os.path.relpath(ART, ROOT)}")
