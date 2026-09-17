# 기존 구름 알파벳(A~V)과 같은 결로 L, W, 쉼표, 느낌표 글리프를 만든다.
# 원본 규격: 캔버스 높이 152, 잉크 y=14~138, 획 두께 ~24, 알파 최대 240.
import math, random
from PIL import Image, ImageDraw, ImageFilter

SS = 4                 # 슈퍼샘플링 배율
CANVAS_H = 152
TOP, BOTTOM = 26, 126  # 획 중심선의 위/아래 끝 (반지름 12를 더하면 14~138)
R = 12.0
ALPHA = 240


def puffs(draw, pts, r=R, step=6.5, rng=None, wobble=2.4, taper=None):
    """폴리라인을 따라 원을 겹쳐 찍어 구름 획을 만든다. taper=(시작 r, 끝 r)이면 굵기가 변한다."""
    lens = [math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]) for i in range(len(pts) - 1)]
    total = sum(lens) or 1.0
    done = 0.0
    for i in range(len(pts) - 1):
        (x0, y0), (x1, y1) = pts[i], pts[i + 1]
        seg = lens[i]
        n = max(1, int(seg / step))
        for k in range(n + 1):
            t = k / n
            x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            u = (done + seg * t) / total
            base = r if taper is None else taper[0] + (taper[1] - taper[0]) * u
            rr = base + rng.uniform(-wobble, wobble) * (base / R)
            nx, ny = rng.uniform(-1.6, 1.6), rng.uniform(-1.6, 1.6)
            blob(draw, x + nx, y + ny, max(1.0, rr))
        done += seg


def blob(draw, x, y, r):
    draw.ellipse([(x - r) * SS, (y - r) * SS, (x + r) * SS, (y + r) * SS], fill=255)


def specks(draw, rng, box, n=3):
    x0, y0, x1, y1 = box
    for _ in range(n):
        x = rng.uniform(x0, x1)
        y = rng.uniform(y0, y1)
        blob(draw, x, y, rng.uniform(1.2, 3.0))


def render(width, strokes, seed, speck_box, speck_n=3, dots=()):
    rng = random.Random(seed)
    mask = Image.new("L", (width * SS, CANVAS_H * SS), 0)
    d = ImageDraw.Draw(mask)
    for s in strokes:
        if isinstance(s, dict):
            puffs(d, s["pts"], rng=rng, taper=s.get("taper"))
        else:
            puffs(d, s, rng=rng)
    for (x, y, r) in dots:
        for _ in range(3):
            blob(d, x + rng.uniform(-1.5, 1.5), y + rng.uniform(-1.5, 1.5), r + rng.uniform(-1.5, 1.5))
    specks(d, rng, speck_box, speck_n)
    mask = mask.resize((width, CANVAS_H), Image.LANCZOS)
    mask = mask.filter(ImageFilter.GaussianBlur(0.4))
    mask = mask.point(lambda v: min(ALPHA, int(v * ALPHA / 255 * 1.06)))
    out = Image.new("RGBA", (width, CANVAS_H), (255, 255, 255, 0))
    out.putalpha(mask)
    px = out.load()
    for yy in range(CANVAS_H):
        for xx in range(width):
            a = px[xx, yy][3]
            px[xx, yy] = (255, 255, 255, a)
    return out


GLYPHS = {
    # L: 세로 기둥 + 아래 가로획
    "L": dict(width=112, seed=11, speck_box=(70, 30, 104, 80), strokes=[
        [(26, TOP), (26, BOTTOM)],
        [(26, BOTTOM), (86, BOTTOM)],
    ]),
    # W: V 두 개를 이어 붙인 형태
    "W": dict(width=176, seed=23, speck_box=(60, 20, 120, 60), speck_n=4, strokes=[
        [(26, TOP), (55, BOTTOM)],
        [(55, BOTTOM), (81, TOP + 30)],
        [(81, TOP + 30), (107, BOTTOM)],
        [(107, BOTTOM), (136, TOP)],
    ]),
    # 쉼표: 베이스라인 아래로 흘러내리는 꼬리
    "comma": dict(width=52, seed=37, speck_box=(36, 62, 48, 96), speck_n=2, strokes=[
        dict(pts=[(25, 104), (24, 116)], taper=(12.5, 11.5)),
        dict(pts=[(24, 116), (19, 127), (13, 136)], taper=(11.0, 4.0)),
    ]),
    # 느낌표: 세로획 + 아래 점
    "exclam": dict(width=52, seed=41, speck_box=(36, 30, 48, 80), speck_n=2, strokes=[
        [(25, TOP), (25, 96)],
    ], dots=[(25, 126, 12.5)]),
}

if __name__ == "__main__":
    import sys
    outdir = sys.argv[1]
    for name, cfg in GLYPHS.items():
        img = render(cfg["width"], cfg["strokes"], cfg["seed"], cfg["speck_box"],
                     cfg.get("speck_n", 3), cfg.get("dots", ()))
        img.save(f"{outdir}/{name}.png")
        print(name, img.size)
