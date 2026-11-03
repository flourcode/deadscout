"""A walk cycle for the commander sheet (also DeadScout's): the sheet's own upper body, new legs.
Eight poses of a textbook walk (contact, recoil, passing, push-off, each side), two-bone IK legs drawn in the sheet's
suit ramp with its grey boots and #0b0e11 outline, a one-pixel body bob. A sneak cycle the same way, lower and shorter.
Frames are appended to the sheet; the animation tables are pointed at them. Usage: walk.py <sprites dir> <out png>"""
import sys, math
from PIL import Image, ImageDraw

SRC = sys.argv[1] + '/commander.png'
OUT = sys.argv[2]
W, H = 54, 64
OUTLINE = (0x0b, 0x0e, 0x11, 255)
D, M, L = (0x4e, 0x42, 0x3c, 255), (0x90, 0x77, 0x63, 255), (0xc6, 0xab, 0x92, 255)
G, GG, Q = (0x2e, 0x31, 0x34, 255), (0x14, 0x18, 0x1c, 255), (0x29, 0x2a, 0x31, 255)
sheet = Image.open(SRC).convert('RGBA')
body = sheet.crop((4 * W, 0, 5 * W, 44))  # walk frame 4's upper body: arms at the sides, a walking lean

GROUND = 59          # the sole's row
HIP_Y = 43           # where the leg leaves the belt
L1, L2 = 8.5, 8.5    # thigh, shin

def ik(hip, ankle):
    """knee for a two-bone leg, bent forward (+x) as a walking knee is"""
    hx, hy = hip; ax, ay = ankle
    dx, dy = ax - hx, ay - hy
    d = max(1e-3, min(math.hypot(dx, dy), L1 + L2 - .3))
    a = math.acos(max(-1, min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))))
    base = math.atan2(dy, dx)
    # two candidates; the knee is the one further forward (+x)
    k1 = (hx + L1 * math.cos(base - a), hy + L1 * math.sin(base - a))
    k2 = (hx + L1 * math.cos(base + a), hy + L1 * math.sin(base + a))
    return k1 if k1[0] > k2[0] else k2

def leg_mask(hip, ankle, thigh_w, shin_w):
    m = Image.new('L', (W, H), 0); dr = ImageDraw.Draw(m)
    k = ik(hip, ankle)
    dr.line([hip, k], fill=255, width=thigh_w)
    dr.line([k, ankle], fill=255, width=shin_w)
    # round the knee and the hip a little
    dr.ellipse([k[0] - thigh_w / 2 + .5, k[1] - thigh_w / 2 + .5, k[0] + thigh_w / 2 - .5, k[1] + thigh_w / 2 - .5], fill=255)
    return m

def boot_mask(ankle, heel_up):
    """a boot under the ankle, toe forward; heel_up lifts the heel for push-off"""
    ax, ay = ankle
    m = Image.new('L', (W, H), 0); dr = ImageDraw.Draw(m)
    x0, x1 = int(round(ax)) - 4, int(round(ax)) + 3
    y1 = int(round(ay)) + 2
    dr.rectangle([x0, y1 - 4, x1, y1], fill=255)
    dr.rectangle([x1 + 1, y1 - 1, x1 + 2, y1], fill=255)   # the toe
    if heel_up:
        dr.rectangle([x0, y1, x0 + 1, y1], fill=0)          # the heel leaves the floor
    return m

def shade(canvas, mask, tones, far):
    """paint a mask in a tone ramp: a one-pixel lit band on the leading edge, dark on the trailing edge, base between"""
    px = canvas.load(); mp = mask.load()
    base, lit, dark = tones
    for y in range(H):
        for x in range(W):
            if not mp[x, y]: continue
            front = x + 1 >= W or not mp[x + 1, y]
            back = x - 1 < 0 or not mp[x - 1, y]
            px[x, y] = lit if front else (dark if back else base)

def ring(canvas, mask):
    """an outline just outside a mask, drawn only where it lands on something already painted (the near leg over the far)"""
    px = canvas.load(); mp = mask.load()
    for y in range(H):
        for x in range(W):
            if mp[x, y] or not px[x, y][3]: continue
            if any(0 <= x + a < W and 0 <= y + b < H and mp[x + a, y + b] for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                px[x, y] = OUTLINE

def render(poses, bob, sneak=False):
    frames = []
    for i, (near, far) in enumerate(poses):
        cv = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        hy = HIP_Y + bob[i] + (2 if sneak else 0)
        tw, sw = (8, 6)
        for (dx, lift, heel), isfar in ((far, True), (near, False)):
            hip = (25.5 if isfar else 28.5, hy)
            ankle = (hip[0] + dx, GROUND - 3 - lift)
            lm = leg_mask(hip, ankle, tw, sw)
            bm = boot_mask(ankle, heel)
            if not isfar:
                both = Image.eval(lm, lambda v: v); both.paste(255, None, bm)
                ring(cv, both)                      # the near leg is cut out of the far one
            # far leg: a darker ramp; near leg: the suit ramp; boots the sheet's brown-grey
            shade(cv, lm, (D, M, Q) if isfar else (M, L, D), isfar)
            shade(cv, bm, (Q, D, GG) if isfar else (D, M, GG), isfar)
            # the sole: one dark row
            bp = bm.load(); px = cv.load()
            for y in range(H):
                for x in range(W):
                    if bp[x, y] and (y + 1 >= H or not bp[x, y + 1]): px[x, y] = GG
        # the body over the hips, bobbing
        cv.alpha_composite(body, (0, bob[i] + (2 if sneak else 0)))
        # outline: every transparent pixel that touches the figure
        px = cv.load(); add = []
        for y in range(H):
            for x in range(W):
                if px[x, y][3]: continue
                for ddx, ddy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + ddx, y + ddy
                    if 0 <= nx < W and 0 <= ny < H and px[nx, ny][3] and px[nx, ny][:3] != OUTLINE[:3]:
                        add.append((x, y)); break
        for x, y in add: px[x, y] = OUTLINE
        # two dark pixels of contact under the boots stay the engine's job
        frames.append(cv)
    return frames

# (ankle dx from hip, lift off the floor, heel up) for one leg over eight frames; the other leg is four frames behind
S = 9   # half a step, in sprite pixels: 18 per step, 36 per cycle, which is what 58 world px/s at 2x and 1.25 s wants
cycle = [(S, 0, False), (S * .55, 0, False), (0, 0, False), (-S * .6, 0, True), (-S, 2, True), (-S * .5, 4, False), (S * .15, 4, False), (S * .8, 1, False)]
poses = [(cycle[i], cycle[(i + 4) % 8]) for i in range(8)]
bob = [0, 0, -1, -1, 0, 0, -1, -1]
walk = render(poses, bob)
Ss = 6
sneak_cycle = [(Ss, 0, False), (Ss * .5, 0, False), (0, 0, False), (-Ss * .6, 0, True), (-Ss, 1, True), (-Ss * .5, 3, False), (0, 3, False), (Ss * .8, 1, False)]
sneak = render([(sneak_cycle[i], sneak_cycle[(i + 4) % 8]) for i in range(8)], [0, 0, 0, 0, 0, 0, 0, 0], sneak=True)

n0 = sheet.size[0] // W
out = Image.new('RGBA', (sheet.size[0] + 16 * W, H), (0, 0, 0, 0))
out.paste(sheet, (0, 0))
for i, f in enumerate(walk + sneak): out.paste(f, ((n0 + i) * W, 0))
out.save(OUT)
print('frames', n0, '->', out.size[0] // W, 'walk', list(range(n0, n0 + 8)), 'sneak', list(range(n0 + 8, n0 + 16)))

# a preview strip
K = 4
pv = Image.new('RGBA', (8 * (W + 2) * K, 2 * (H + 2) * K), (30, 34, 40, 255))
for r, fr in enumerate((walk, sneak)):
    for i, f in enumerate(fr):
        pv.paste(f.resize((W * K, H * K), Image.NEAREST), (i * (W + 2) * K, r * (H + 2) * K), f.resize((W * K, H * K), Image.NEAREST))
pv.save(OUT.replace('.png', '-preview.png'))
