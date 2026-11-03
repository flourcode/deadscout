"""Crew frames (release 33): the pilot and the systems tech climb, and the pilot sits.
CLIMB: the commander's four back-view climb frames (the suit from behind, arms and legs alternating), with the helmet
replaced by each person's head from behind: the pilot's brown hair and bun, the tech's dark curls, a little neck, and
the pilot's orange shoulder patches. Centred on each sheet's own anchor.
SIT: the pilot's own torso, lowered to seat height, with new seated legs (thigh forward, shin down, the orange knee
patch, boots). Two frames, the second with the hands a pixel forward, so 'typing' can alternate them.
Usage: crew.py <commander.png> <pilot.png> <systems.png> <outdir>"""
import sys, math
from PIL import Image, ImageDraw
CMD, PIL_, SYS, OUT = sys.argv[1:5]
O = (0x0b, 0x0e, 0x11, 255)
def C(h): h = h.lstrip('#'); return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)
HAIR = {'pilot': [C('3a2014'), C('4d2613'), C('7b3f1c'), C('99623b')], 'systems': [C('14181c'), C('292a31'), C('2e3134'), C('4e423c')]}
SKIN = {'pilot': [C('c37b43'), C('e39754')], 'systems': [C('3a2014'), C('99623b')]}
ORANGE = [C('c15c15'), C('e47a1e')]
SUIT = [C('4e423c'), C('907763'), C('c6ab92'), C('e9d7c2')]

cmd = Image.open(CMD).convert('RGBA'); CW = 54; H = 64

def outline(img):
    px = img.load(); w, h = img.size; add = []
    for y in range(h):
        for x in range(w):
            if px[x, y][3]: continue
            for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                X, Y = x + a, y + b
                if 0 <= X < w and 0 <= Y < h and px[X, Y][3] and px[X, Y][:3] != O[:3]: add.append((x, y)); break
    for p in add: px[p] = O

def head_swap(fr, who):
    """replace the helmet (rows 0-9, x 19-37) with a head from behind"""
    px = fr.load()
    for y in range(0, 10):
        for x in range(19, 38): px[x, y] = (0, 0, 0, 0)
    hr = HAIR[who]; sk = SKIN[who]
    cx, cy, rx, ry = 27.5, 5.0, 5.2, 4.8
    for y in range(0, 11):
        for x in range(19, 38):
            d = ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2
            if d < 1:
                u = (x + .5 - (cx - rx)) / (2 * rx)
                c = hr[3] if (u < .3 and y < cy) else hr[2] if u < .55 else hr[1] if u < .85 else hr[0]
                if who == 'systems' and (x + y) % 3 == 0 and d > .45: c = hr[0]        # curls: a broken texture at the edge
                px[x, y] = c
    if who == 'systems':
        for (x, y) in [(22, 1), (25, 0), (29, 0), (32, 1), (34, 3), (21, 3), (35, 6)]: px[x, y] = hr[1]   # curls past the outline
    if who == 'pilot':
        for y in range(0, 3):                                          # the bun
            for x in range(25, 31):
                if ((x + .5 - 28) / 2.6) ** 2 + ((y + .5 - 1.2) / 1.6) ** 2 < 1: px[x, y] = hr[2] if x < 28 else hr[1]
        px[26, 1] = hr[3]
    for x in range(25, 31): px[x, 9] = sk[0]; px[x, 10] = sk[1] if 26 <= x <= 29 else sk[0]   # the neck under the hair
    for x in range(21, 35): px[x, 11] = px[x, 11] if px[x, 11][3] else SUIT[1]              # the collar edge
    if who == 'pilot':                                                 # the orange shoulder patches
        for (x, y) in [(19, 11), (20, 11), (19, 12), (20, 12), (34, 11), (35, 11), (34, 12), (35, 12)]:
            if px[x, y][3] and px[x, y][:3] != O[:3]: px[x, y] = ORANGE[1] if y == 11 else ORANGE[0]
    outline(fr)
    return fr

def fit(fr, W, ax):
    """centre a 54-wide commander frame (anchor x 27) on a sheet W wide with anchor ax"""
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0)); out.alpha_composite(fr, (ax - 27, 0)); return out

climb = [cmd.crop((i * CW, 0, (i + 1) * CW, H)) for i in (29, 30, 31, 32)]
pil = Image.open(PIL_).convert('RGBA'); PW = 48
sysim = Image.open(SYS).convert('RGBA'); SW = 64
p_climb = [fit(head_swap(f.copy(), 'pilot'), PW, 24) for f in climb]
s_climb = [fit(head_swap(f.copy(), 'systems'), SW, 32) for f in climb]

# ---------- the pilot, seated ----------
stand = pil.crop((0, 0, PW, H))
def seated(hands):
    """her own torso cut at the belt and lowered to the seat; then the legs in front of it: thigh forward, shin down"""
    img = Image.new('RGBA', (PW, H), (0, 0, 0, 0))
    CUTY, drop = 41, 9; hip = CUTY + drop                    # the belt line, and where it sits
    torso = stand.crop((0, 0, PW, CUTY))
    if hands: t2 = torso.copy(); t2.paste(torso.crop((27, 28, 40, CUTY)), (28, 28)); torso = t2   # the hands a pixel forward
    img.alpha_composite(torso, (0, drop))
    d = ImageDraw.Draw(img)
    for far, (hx, kx, fx) in ((True, (18, 34, 35)), (False, (20, 37, 38))):
        base, lit, dark = (SUIT[1], SUIT[2], SUIT[0]) if far else (SUIT[2], SUIT[3], SUIT[1])
        top, bot = hip - 4 + (0 if far else 1), hip + 2 + (0 if far else 1)
        d.rectangle([hx, top, kx, bot], fill=base); d.line([(hx, top), (kx, top)], fill=lit); d.line([(hx, bot), (kx, bot)], fill=dark)   # thigh
        d.polygon([(kx - 4, bot - 1), (kx + 1, top + 1), (fx + 1, 56), (fx - 4, 56)], fill=base); d.line([(kx + 1, top + 1), (fx + 1, 56)], fill=lit)  # shin
        if not far: d.rectangle([kx - 3, top + 1, kx, top + 4], fill=ORANGE[1]); d.line([(kx - 3, top + 4), (kx, top + 4)], fill=ORANGE[0])          # knee patch
        d.polygon([(fx - 5, 56), (fx + 2, 56), (fx + 5, 59), (fx - 5, 59)], fill=C('2e3134') if far else C('4e423c'))                             # boot
        d.line([(fx - 5, 59), (fx + 5, 59)], fill=C('14181c'))
    px = img.load()                                           # her suit's texture on the new legs: seams and folds from her own palette
    for y in range(hip - 4, 57):
        for x in range(17, 43):
            c = px[x, y]
            if c[:3] in (SUIT[2][:3], SUIT[3][:3]) and ((x * 7 + y * 13) % 11 == 0): px[x, y] = C('907763')
            elif c[:3] == SUIT[1][:3] and ((x * 5 + y * 3) % 9 == 0): px[x, y] = C('4e423c')
    for x in range(30, 34): px[x, hip - 1] = C('907763')     # a fold behind the knee
    outline(img)
    return img
p_sit = [seated(False), seated(True)]

def append(sheet, W, frames):
    n0 = sheet.size[0] // W; out = Image.new('RGBA', ((n0 + len(frames)) * W, H), (0, 0, 0, 0)); out.paste(sheet, (0, 0))
    for i, f in enumerate(frames): out.paste(f, ((n0 + i) * W, 0))
    return out, n0
pil2, pn = append(pil, PW, p_climb + p_sit); pil2.save(OUT + '/pilot-r33.png')
sys2, sn = append(sysim, SW, s_climb); sys2.save(OUT + '/systems-r33.png')
print('pilot climb', list(range(pn, pn + 4)), 'sit', [pn + 4, pn + 5], '| systems climb', list(range(sn, sn + 4)))
K = 6; tiles = p_climb + p_sit + s_climb
pv = Image.new('RGBA', (sum(t.size[0] + 4 for t in tiles) * K, H * K), (30, 34, 40, 255)); x = 0
for t in tiles: b = t.resize((t.size[0] * K, H * K), Image.NEAREST); pv.paste(b, (x, 0), b); x += (t.size[0] + 4) * K
pv.save(OUT + '/crew-r33-preview.png')
