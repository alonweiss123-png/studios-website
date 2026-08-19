"""
Studios — atmospheric media generator (v2).
High-altitude look: deep atmosphere, wind-stretched striations, horizon glow,
faint stars. Real WebP layers for scroll parallax. Pure Pillow + stdlib.
"""
from PIL import Image, ImageFilter
import random, os, math

OUT = "assets/media"; os.makedirs(OUT, exist_ok=True)
W, H = 1920, 1200
NW, NH = 512, 320

def grid(cw, ch, seed):
    rnd = random.Random(seed)
    im = Image.new("L", (cw, ch))
    im.putdata([rnd.randrange(256) for _ in range(cw * ch)])
    return im.resize((NW, NH), Image.BICUBIC)

def fbm(octaves, base_x, base_y, persistence, seed):
    """Anisotropic fbm: base_x >> base_y stretches detail horizontally,
    which is what makes cloud bands read as high-altitude wind."""
    acc = [0.0] * (NW * NH); amp = 1.0; total = 0.0
    for o in range(octaves):
        cw = max(2, base_x * (2 ** o))
        ch = max(2, base_y * (2 ** o))
        if cw > NW * 2: break
        px = list(grid(cw, ch, seed + o * 8117).getdata())
        for i, v in enumerate(px):
            acc[i] += (v / 255.0) * amp
        total += amp; amp *= persistence
    return [v / total for v in acc]

def shape(vals, gamma=1.0, lo=0.0, hi=1.0, scale=1.0):
    span = max(hi - lo, 1e-6); out = []
    for v in vals:
        t = (v - lo) / span
        t = 0.0 if t < 0 else (1.0 if t > 1 else t)
        out.append(int(min(1.0, (t ** gamma) * scale) * 255))
    return out

def up(vals, blur):
    im = Image.new("L", (NW, NH)); im.putdata(vals)
    return im.resize((W, H), Image.BICUBIC).filter(ImageFilter.GaussianBlur(blur))

def vgrad(stops, w=W, h=H):
    col = Image.new("RGB", (1, h)); px = col.load(); stops = sorted(stops)
    for y in range(h):
        t = y / max(h - 1, 1); a, b = stops[0], stops[-1]
        for i in range(len(stops) - 1):
            if stops[i][0] <= t <= stops[i + 1][0]:
                a, b = stops[i], stops[i + 1]; break
        k = (t - a[0]) / max(b[0] - a[0], 1e-6); k = k * k * (3 - 2 * k)
        px[0, y] = tuple(int(a[1][c] + (b[1][c] - a[1][c]) * k) for c in range(3))
    return col.resize((w, h), Image.BICUBIC)

def vmask(stops):
    return vgrad([(p, (v, v, v)) for p, v in stops]).convert("L")

def mul(a, b):
    out = Image.new("L", a.size)
    out.putdata([(x * y) // 255 for x, y in zip(a.getdata(), b.getdata())])
    return out

# ── 0 · deep atmosphere + horizon glow ─────────────────────────────
sky = vgrad([
    (0.00, (6, 7, 12)),      # space
    (0.34, (13, 18, 31)),
    (0.62, (23, 35, 57)),
    (0.84, (36, 55, 82)),    # horizon warms toward blue
    (0.94, (72, 104, 140)),  # the limb
    (1.00, (18, 24, 38)),
])
# faint stars, upper third only
stars = Image.new("L", (W, H), 0); sp = stars.load()
rnd = random.Random(4242)
for _ in range(1100):
    x = rnd.randrange(W); y = int(abs(rnd.gauss(0, 0.28)) * H * 0.55)
    if y >= H: continue
    b = rnd.randrange(70, 210)
    sp[x, y] = b
    for dx, dy in ((1,0),(0,1),(-1,0),(0,-1)):
        if 0 <= x+dx < W and 0 <= y+dy < H: sp[x+dx, y+dy] = b // 3
stars = stars.filter(ImageFilter.GaussianBlur(.6))
far = sky.copy()
far.paste(Image.new("RGB", (W, H), (206, 222, 244)), (0, 0), stars)
far.save(f"{OUT}/sky-far.webp", "WEBP", quality=86, method=6)

# ── 1 · mid striations — the readable cloud bands ──────────────────
m1 = up(shape(fbm(5, 2, 7, .55, 909), gamma=2.9, lo=.40, hi=.86), 7)
m1 = mul(m1, vmask([(0.0,0),(0.30,90),(0.58,215),(0.86,255),(1.0,60)]))
mid = Image.new("RGBA", (W, H), (0,0,0,0))
mid.paste(vgrad([(0.0,(96,126,168)),(0.55,(150,182,218)),(0.88,(198,220,244)),(1.0,(110,140,180))]), (0,0), m1)
mid.save(f"{OUT}/sky-mid.webp", "WEBP", quality=87, method=6)

# ── 2 · near wisps — thin, fast-moving foreground ──────────────────
m2 = up(shape(fbm(6, 3, 13, .50, 1717), gamma=4.4, lo=.50, hi=.90, scale=.66), 3)
m2 = mul(m2, vmask([(0.0,0),(0.36,150),(0.74,255),(1.0,90)]))
near = Image.new("RGBA", (W, H), (0,0,0,0))
near.paste(vgrad([(0.0,(186,208,236)),(1.0,(214,232,250))]), (0,0), m2)
near.save(f"{OUT}/sky-near.webp", "WEBP", quality=87, method=6)

# ── 3 · brand bleed — a thin accent line on the limb, nothing more ──
bm = Image.new("L", (NW, NH)); bd = []
for y in range(NH):
    ty = y / (NH - 1)
    v = math.exp(-((ty - 0.925) ** 2) / (2 * 0.026 ** 2))   # narrow band
    for x in range(NW):
        tx = abs(x / (NW - 1) - 0.5) * 2
        bd.append(int(v * max(0.0, 1 - tx ** 1.7) * 74))
bm.putdata(bd)
bm = bm.resize((W, H), Image.BICUBIC).filter(ImageFilter.GaussianBlur(16))
bleed = Image.new("RGBA", (W, H), (0,0,0,0))
bleed.paste(Image.new("RGB", (W, H), (200, 255, 0)), (0,0), bm)
bleed.save(f"{OUT}/sky-bleed.webp", "WEBP", quality=84, method=6)

for f in ("sky-far","sky-mid","sky-near","sky-bleed"):
    print(f"  {f+'.webp':16} {os.path.getsize(f'{OUT}/{f}.webp')//1024:>5} KB")
