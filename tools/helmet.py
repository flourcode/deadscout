"""The boot-card helmet, two ways, at the game's grain and in the Halcyon palette.
A: the original (skull in the visor).  B: the empty visor (stars, the glare, HALCYON reflected).
Usage: helmet.py <src.png> <outdir>"""
import sys, math, random
from PIL import Image, ImageDraw

SRC, OUT = sys.argv[1], sys.argv[2]
N = 64                                            # the grid: 64 x 64, shown at whole-pixel scale
PAL = {                                           # the Halcyon set (game.css, the cast sheets)
 'ink0': (0x0b, 0x0e, 0x11), 'ink1': (0x14, 0x18, 0x1c), 'ink2': (0x29, 0x2a, 0x31), 'ink3': (0x2e, 0x31, 0x34),
 'grey1': (0x6b, 0x6a, 0x6e), 'grey2': (0x9a, 0x98, 0x97),
 'suit0': (0x4e, 0x42, 0x3c), 'suit1': (0x90, 0x77, 0x63), 'suit2': (0xc6, 0xab, 0x92), 'suit3': (0xe9, 0xd7, 0xc2), 'suit4': (0xf6, 0xef, 0xe4),
 'blue0': (0x22, 0x4a, 0x5b), 'blue1': (0x44, 0x6d, 0x75), 'blue2': (0x28, 0x95, 0xa8), 'cyan': (0x7e, 0xe3, 0xe5),
 'or0': (0x8d, 0x40, 0x12), 'or1': (0xc1, 0x5c, 0x15), 'or2': (0xe4, 0x7a, 0x1e), 'amber': (0xff, 0xb0, 0x4a)}
P = list(PAL.values())

def lab(c):                                       # a cheap perceptual distance: weighted RGB, a little hue care
    r, g, b = c; return (r * .30, g * .59, b * .11, (r - g) * .25, (b - g) * .25)
LP = [lab(c) for c in P]
def nearest(c):
    l = lab(c); return P[min(range(len(P)), key=lambda i: sum((a - b) ** 2 for a, b in zip(l, LP[i])))]

src = Image.open(SRC).convert('RGB')
W = src.size[0]
# reduce by box (area average) so each cell is the mean of what it covers, then snap each cell to the palette
small = src.resize((N, N), Image.BOX)
px = small.load()
alpha = Image.new('L', (N, N), 0); ap = alpha.load()
for y in range(N):
    for x in range(N):
        c = px[x, y]
        if max(c) < 14: continue                  # the black field is transparent
        ap[x, y] = 255; px[x, y] = nearest(c)
def despeckle(img, al, passes=2):
    p = img.load(); a = al.load()
    for _ in range(passes):
        ch = []
        for y in range(1, N - 1):
            for x in range(1, N - 1):
                if not a[x, y]: continue
                nb = [p[x + i, y + j] for i, j in ((1, 0), (-1, 0), (0, 1), (0, -1)) if a[x + i, y + j]]
                if len(nb) == 4 and p[x, y] not in nb:
                    best = max(set(nb), key=nb.count)
                    if nb.count(best) >= 3: ch.append((x, y, best))
        for x, y, c in ch: p[x, y] = c
despeckle(small, alpha)
A = small.copy()

# the visor, measured on the source (centre and radii in source pixels) -> grid cells
VC, VR = (742 / W * N, 620 / W * N), (288 / W * N, 318 / W * N)
inside = lambda x, y: ((x + .5 - VC[0]) / VR[0]) ** 2 + ((y + .5 - VC[1]) / VR[1]) ** 2 < 1

def outline(img, al):
    """the game's one-pixel #0b0e11 line around the silhouette"""
    p = img.load(); a = al.load(); add = []
    for y in range(N):
        for x in range(N):
            if a[x, y]: continue
            if any(0 <= x + i < N and 0 <= y + j < N and a[x + i, y + j] for i, j in ((1, 0), (-1, 0), (0, 1), (0, -1))): add.append((x, y))
    for q in add: p[q] = PAL['ink0']; a[q] = 255

# B: repaint the visor's glass. Keep the rim and the glare the source already has; the rest is deep glass with stars
A0 = A.copy()
B = A.copy(); bp = B.load(); random.seed(5)
glass = lambda x, y, k=1.0: ((x + .5 - VC[0]) / (VR[0] * k)) ** 2 + ((y + .5 - VC[1]) / (VR[1] * k)) ** 2 < 1
G0 = .9                                              # the glass inside the rim
for y in range(N):
    for x in range(N):
        if not glass(x, y, G0): continue
        u = (y + .5 - (VC[1] - VR[1] * G0)) / (2 * VR[1] * G0)
        d = (x + y) % 2                              # a two-step dither where bands meet
        c = PAL['blue0'] if u < .16 or (u < .24 and d) else PAL['ink3'] if u < .42 or (u < .5 and d) else PAL['ink2'] if u < .72 or (u < .8 and d) else PAL['ink1']
        if u > .88: c = PAL['blue0'] if d else PAL['ink1']          # the lower rim catching light
        bp[x, y] = c
# the glare: a curved band near the top-right of the glass, as the source has it
for y in range(N):
    for x in range(N):
        if not glass(x, y, G0): continue
        dx, dy = (x + .5 - VC[0]) / VR[0], (y + .5 - VC[1]) / VR[1]; r = math.hypot(dx, dy); ang = math.degrees(math.atan2(dy, dx))
        if -78 < ang < -18 and .62 < r < .8: bp[x, y] = PAL['suit3'] if -66 < ang < -30 else PAL['grey2']
        if -60 < ang < -40 and .66 < r < .74: bp[x, y] = PAL['suit4']
for gx, gy in ((9, -11), (11, -12), (10, -13)):     # a separate small glint
    X, Y = int(VC[0] + gx), int(VC[1] + gy)
    if glass(X, Y, G0): bp[X, Y] = PAL['suit4']
GLASS = B.copy()   # the glass and glare, before the stars: what the ghost fades into
# stars in the dark of the glass
for _ in range(40):
    X, Y = random.randint(0, N - 1), random.randint(0, N - 1)
    if glass(X, Y, .82) and bp[X, Y] in (PAL['ink1'], PAL['ink2'], PAL['ink3']): bp[X, Y] = random.choice([PAL['suit3'], PAL['grey2'], PAL['grey1'], PAL['grey1']])
# A, the ghost: inside the glass, each cell is a third skull, two thirds glass (with a little dither so it shimmers rather than bands)
ap_, gp_, a0 = A.load(), GLASS.load(), A0.load()
for y in range(N):
    for x in range(N):
        if not glass(x, y, G0): continue
        g = gp_[x, y]
        if g in (PAL['suit3'], PAL['suit4'], PAL['grey2']): ap_[x, y] = g; continue      # the glare stays crisp
        k = .36 if (x + y) % 2 else .28
        c = a0[x, y] if a0[x, y] != PAL['ink0'] else g
        ap_[x, y] = nearest(tuple(int(g[i] * (1 - k) + c[i] * k) for i in range(3)))
aA, aB = alpha.copy(), alpha.copy()
for al, img in ((aA, A), (aB, B)):                   # the visor is glass, not a hole: every cell inside the rim is opaque
    a_ = al.load(); p_ = img.load()
    for y in range(N):
        for x in range(N):
            if inside(x, y) and not a_[x, y]: a_[x, y] = 255; p_[x, y] = PAL['ink0'] if img is A else p_[x, y]
outline(A, aA); outline(B, aB)
for name, img, al in (('A', A, aA), ('B', B, aB)):
    rgba = img.convert('RGBA'); rgba.putalpha(al); rgba.save(f'{OUT}/helmet-{name}.png')
    rgba.resize((N * 8, N * 8), Image.NEAREST).save(f'{OUT}/helmet-{name}-8x.png')
print('ok')
