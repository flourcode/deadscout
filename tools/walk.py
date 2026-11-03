"""DeadScout walk cycle, second pass (release 27).

The commander sheet's upper body (cut at the belt, so no seam), new legs:
  * leg lengths chosen so the standing leg goes straight at passing and only flexes at contact (r25's legs were too
    long for the hip height, so every pose was a half-crouch: the 'hobble');
  * thigh and shin are tapered quads drawn at 4x and reduced by majority vote, so the silhouette is clean pixel art
    with no round knee blob (the 'malformed calf');
  * shaded with the suit's own ramp across each limb (shadow at the back, light on the front, a darker rim), the far
    leg one step darker; boots in the sheet's brown-grey with a dark sole;
  * a heel strike at contact (toe up), toe-off at the back (heel up), the swing foot carried low and level;
  * the hips bob two pixels: lowest at contact, highest at passing.
Usage: walk2.py <commander.png> <out.png>
"""
import sys, math
from PIL import Image, ImageDraw

SRC, OUT = sys.argv[1], sys.argv[2]
W, H = 54, 64
OUT_C = (0x0b, 0x0e, 0x11, 255)
# the suit ramp, dark to light, as the sheet uses it
R0, R1, R2, R3, R4 = (0x29, 0x2a, 0x31, 255), (0x4e, 0x42, 0x3c, 255), (0x90, 0x77, 0x63, 255), (0xc6, 0xab, 0x92, 255), (0xe9, 0xd7, 0xc2, 255)
BOOT = [(0x14, 0x18, 0x1c, 255), (0x2e, 0x31, 0x34, 255), (0x4e, 0x42, 0x3c, 255), (0x90, 0x77, 0x63, 255)]
sheet = Image.open(SRC).convert('RGBA')
BASE = 4                                     # the stand frame the body is taken from (walk frame 4 of the original)
CUT = 39                                     # the belt and the hand end at row 38
body = sheet.crop((BASE * W, 0, (BASE + 1) * W, CUT))

GROUND = 59                                  # the sole's row
HIP_Y = 39                                   # where the legs leave the belt
ANKLE_ABOVE = 4                              # ankle height above the sole
L1, L2 = 8.6, 8.4                            # thigh, shin: 17 = straight at passing with the hips up a pixel
SS = 4                                       # supersampling

def ik(hip, ankle):
    hx, hy = hip; ax, ay = ankle
    dx, dy = ax - hx, ay - hy
    d = math.hypot(dx, dy)
    if d >= L1 + L2 - 1e-3:                  # straight: the knee on the line
        u = L1 / (L1 + L2); return (hx + dx * u, hy + dy * u)
    a = math.acos(max(-1, min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))))
    b = math.atan2(dy, dx)
    k1 = (hx + L1 * math.cos(b - a), hy + L1 * math.sin(b - a))
    k2 = (hx + L1 * math.cos(b + a), hy + L1 * math.sin(b + a))
    return k1 if k1[0] > k2[0] else k2       # knees bend forward

def quad(p, q, wp, wq):
    (x0, y0), (x1, y1) = p, q
    dx, dy = x1 - x0, y1 - y0; n = math.hypot(dx, dy) or 1
    nx, ny = -dy / n, dx / n
    return [(x0 + nx * wp, y0 + ny * wp), (x1 + nx * wq, y1 + ny * wq), (x1 - nx * wq, y1 - ny * wq), (x0 - nx * wp, y0 - ny * wp)]

def reduce(big):
    """4x mask -> 1x by majority, so edges are clean pixels"""
    small = Image.new('L', (W, H), 0); bp = big.load(); sp = small.load()
    for y in range(H):
        for x in range(W):
            s = 0
            for j in range(SS):
                for i in range(SS): s += bp[x * SS + i, y * SS + j] > 0
            sp[x, y] = 255 if s * 2 >= SS * SS else 0
    return small

def leg_masks(hip, ankle_x, lift, foot):
    """masks for the limb and the boot. foot: 0 flat, 1 heel up (toe-off), -1 toe up (heel strike)"""
    ankle = (ankle_x, GROUND - ANKLE_ABOVE - lift)
    knee = ik(hip, ankle)
    S = lambda p: (p[0] * SS, p[1] * SS)
    lb = Image.new('L', (W * SS, H * SS), 0); d = ImageDraw.Draw(lb)
    d.polygon([S(p) for p in quad(hip, knee, 4.1, 3.5)], fill=255)      # thigh, tapering
    d.polygon([S(p) for p in quad(knee, ankle, 3.5, 3.0)], fill=255)    # shin, tapering to the boot cuff
    d.ellipse([S((knee[0] - 3.4, knee[1] - 3.4)), S((knee[0] + 3.4, knee[1] + 3.4))], fill=255)  # the joint, same width as the limb
    bb = Image.new('L', (W * SS, H * SS), 0); e = ImageDraw.Draw(bb)
    ax, ay = ankle
    heel, toe = (ax - 3.8, ay + ANKLE_ABOVE), (ax + 5.2, ay + ANKLE_ABOVE)    # the sole line, flat
    if foot == 1: heel, toe = (ax - 2.6, ay + ANKLE_ABOVE - 2.2), (ax + 4.2, ay + ANKLE_ABOVE)
    if foot == -1: heel, toe = (ax - 3.2, ay + ANKLE_ABOVE), (ax + 4.0, ay + ANKLE_ABOVE - 1.8)
    top_b, top_f = (ax - 3.2, ay - 1.6), (ax + 3.0, ay - 1.6)               # the cuff
    e.polygon([S(top_b), S(top_f), S((toe[0] - .6, toe[1] - 2.2)), S(toe), S(heel)], fill=255)
    return reduce(lb), reduce(bb)

def paint_limb(px, m, far):
    """shade each row across the limb: shadow at the back (left), light on the front, a darker rim at the very front"""
    ramp = [R1, R1, R2, R2] if far else [R1, R2, R3, R4]
    mp = m.load()
    for y in range(H):
        xs = [x for x in range(W) if mp[x, y]]
        if not xs: continue
        x0, x1 = xs[0], xs[-1]; w = x1 - x0 + 1
        for x in xs:
            t = (x - x0 + .5) / w
            c = ramp[0] if t < .22 else ramp[1] if t < .5 else ramp[2] if t < .82 else ramp[3]
            if x == x1 and w >= 4 and not far: c = R3        # a rim one step down from the highlight
            px[x, y] = c

def paint_boot(px, m, far):
    mp = m.load(); ramp = BOOT[:3] if far else BOOT[1:]
    ys = [y for y in range(H) if any(mp[x, y] for x in range(W))]
    for y in ys:
        xs = [x for x in range(W) if mp[x, y]]
        x0, x1 = xs[0], xs[-1]; w = x1 - x0 + 1
        bottom = not any(mp[x, y + 1] for x in xs) if y + 1 < H else True
        for x in xs:
            t = (x - x0 + .5) / w
            c = ramp[0] if (bottom or t < .25) else ramp[1] if t < .7 else ramp[2]
            if y == ys[0]: c = ramp[0]                     # the cuff seam
            px[x, y] = c

def ring(px, m):
    """the near leg's outline where it lies over the far leg"""
    mp = m.load()
    for y in range(H):
        for x in range(W):
            if mp[x, y] or not px[x, y][3]: continue
            if any(0 <= x + a < W and 0 <= y + b < H and mp[x + a, y + b] for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                px[x, y] = OUT_C

def outline(img):
    px = img.load(); add = []
    for y in range(H):
        for x in range(W):
            if px[x, y][3]: continue
            for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                X, Y = x + a, y + b
                if 0 <= X < W and 0 <= Y < H and px[X, Y][3] and px[X, Y][:3] != OUT_C[:3]: add.append((x, y)); break
    for p in add: px[p] = OUT_C

def frame(near, far, bob, crouch=0):
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0)); px = img.load()
    hy = HIP_Y + bob + crouch
    for (dx, lift, foot), isfar in ((far, True), (near, False)):
        hip = (23.0 if isfar else 27.5, hy)
        lm, bm = leg_masks(hip, hip[0] + dx, lift, foot)
        if not isfar:
            both = lm.copy(); both.paste(255, None, bm); ring(px, both)
        paint_limb(px, lm, isfar); paint_boot(px, bm, isfar)
    img.alpha_composite(body, (0, bob + crouch))
    outline(img)
    return img

def cycle(S, lift):
    """one leg over eight frames; the other is four behind. Stance (0-4) moves the foot back at a constant rate, so it stays planted."""
    return [( S,       0,        -1),     # 0 contact: heel strike
            ( S * .5,  0,         0),     # 1 loading
            ( 0,       0,         0),     # 2 passing: standing leg straight
            (-S * .5,  0,         0),     # 3
            (-S,       0,         1),     # 4 toe-off: heel up
            (-S * .45, lift * .8, 1),     # 5 the foot leaves the floor, knee forward
            ( S * .15, lift,      0),     # 6 passing, carried low
            ( S * .75, lift * .4, -1)]    # 7 reaching

def cycle_frames(S, lift, bob, crouch=0):
    c = cycle(S, lift)
    return [frame(c[i], c[(i + 4) % 8], bob[i], crouch) for i in range(8)]

walk = cycle_frames(6.5, 3.2, [1, 0, -1, 0, 1, 0, -1, 0])
sneak = cycle_frames(4.6, 2.2, [1, 1, 0, 1, 1, 1, 0, 1], crouch=1)

n0 = 39                                      # frames 0-38 are the original sheet; 39-54 are replaced
out = Image.new('RGBA', ((n0 + 16) * W, H), (0, 0, 0, 0))
out.paste(sheet.crop((0, 0, n0 * W, H)), (0, 0))
for i, f in enumerate(walk + sneak): out.paste(f, ((n0 + i) * W, 0))
out.save(OUT)

K = 6
pv = Image.new('RGBA', (8 * W * K, 2 * H * K), (30, 34, 40, 255))
for r, fr in enumerate((walk, sneak)):
    for i, f in enumerate(fr):
        big = f.resize((W * K, H * K), Image.NEAREST); pv.paste(big, (i * W * K, r * H * K), big)
pv.save(OUT.replace('.png', '-preview.png'))
print('ok', out.size)
