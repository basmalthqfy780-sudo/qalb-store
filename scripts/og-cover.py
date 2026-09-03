#!/usr/bin/env python3
"""
og-cover.png · بطاقة المشاركة 1200×630 — مرسومة بالكامل برمجيًا (Pillow)،
بلا صور مخزنة: نفس لغة الرسم المستخدمة في المعاينات داخل التطبيق.

  python3 scripts/og-cover.py [--out public/og-cover.png]   # the site cover
  python3 scripts/og-cover.py --cards < rows.json            # one card per template

يتطلّب Pillow + arabic_reshaper + python-bidi؛ يكتفي scripts/seo.mjs بتخطّي
الخطوة إذا لم تكن متاحة (تبقى البطاقة السابقة كما هي).
"""
import argparse
import os

from PIL import Image, ImageDraw, ImageFont, features

# raqm يكيّف الحروف بنفسه؛ تشكيل يدوي إضافي (arabic_reshaper) يكسر الرموز
RAQM = bool(features.check("raqm"))
if not RAQM:  # fallback: re-shape manually and let PIL draw LTR-ordered forms
    import arabic_reshaper
    from bidi.algorithm import get_display

W, H = 1200, 630
BG = (10, 12, 17)
PANEL = (20, 24, 34)
LINE = (36, 43, 58)
INK = (232, 235, 242)
DIM = (154, 163, 181)
BRAND = (52, 211, 153)
GOLD = (245, 196, 81)
TODAY = (246, 247, 249)

FD = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def font(path, size):
    return ImageFont.truetype(path, size)


def rtl(draw, xy, text, fnt, fill, size=None):
    """right-aligned RTL text, shaped the way a browser would do it"""
    if RAQM:
        draw.text(xy, text, font=fnt, fill=fill, anchor="rm", direction="rtl")
    else:
        draw.text(xy, get_display(arabic_reshaper.reshape(text)), font=fnt, fill=fill, anchor="rm")


def tile(i):
    """بديل CSS art: مربعات ملوّنة بحساب HSL يدويًا."""
    hue = (150 + i * 34) % 360
    import colorsys

    r, g, b = colorsys.hsv_to_rgb(hue / 360, 0.55, 0.86)
    return int(r * 255), int(g * 255), int(b * 255)


def h2rgb(h):
    c = (h or "#34d399").lstrip("#")
    if len(c) == 3:
        c = "".join(x * 2 for x in c)
    return tuple(int(c[i : i + 2], 16) for i in (0, 2, 4))


def mix(a, b, t):
    return tuple(int(round(x + (y - x) * t)) for x, y in zip(a, b))


def product_card(row, out):
    """بطاقة مشاركة لكل منتج: نفس لغة الرسم، بلون المنتج وموك يتبع نوعه."""
    dark = row.get("theme", "dark") != "light"
    bg = BG if dark else TODAY
    panel = PANEL if dark else (255, 255, 255)
    line = LINE if dark else (223, 227, 234)
    ink = INK if dark else (16, 19, 26)
    dim = DIM if dark else (86, 95, 112)
    acc = h2rgb(row.get("accent"))
    soft = mix(bg, acc, 0.10 if dark else 0.14)

    img = Image.new("RGB", (W, H), bg)
    px = ImageDraw.Draw(img, "RGBA")
    for i in range(11):
        px.line([(i * 120, 0), (i * 120, H)], fill=ink + (12,), width=1)
    px.ellipse([640, -240, 1420, 420], fill=acc + (40,))

    kind = row.get("type")
    show_site = kind in ("portfolio", "bundle")
    show_cv = kind in ("cv", "bundle")

    if show_site:
        bx, by, bw, bh = (70, 150, 500, 300) if show_cv else (70, 122, 540, 372)
        px.rounded_rectangle([bx, by, bx + bw, by + bh], 20, fill=panel, outline=line, width=2)
        px.rounded_rectangle([bx, by, bx + bw, by + 44], 20, fill=mix(bg, (0, 0, 0), 0.35))
        for i, c in enumerate([(255, 95, 87), (254, 188, 46), (40, 200, 64)]):
            px.ellipse([bx + 24 + i * 20, by + 16, bx + 36 + i * 20, by + 28], fill=c)
        px.rounded_rectangle([bx + 92, by + 11, bx + 330, by + 33], 11, fill=mix(panel, ink, 0.08))
        px.rounded_rectangle([bx + 30, by + 74, bx + 260, by + 98], 6, fill=ink + (230,))
        px.rounded_rectangle([bx + 30, by + 112, bx + 340, by + 124], 7, fill=dim + (150,))
        px.rounded_rectangle([bx + 30, by + 134, bx + 290, by + 146], 7, fill=dim + (95,))
        px.rounded_rectangle([bx + 30, by + 164, bx + 166, by + 196], 10, fill=acc)
        n = 4 if bw > 520 else 3
        step = (bw - 60 - 104) / max(n - 1, 1)
        for i in range(n):
            x = bx + 30 + i * step
            y0 = by + 214
            h = (by + bh - 22) - y0
            px.rounded_rectangle([x, y0, x + 104, y0 + h], 10, fill=mix(panel, acc, 0.22 + i * 0.17))

    if show_cv:
        # في الحزمة تصغر الورقة لتبقى فوق شريط الرابط السفلي (y=560)
        sw, sh = (212, 272) if show_site else (250, 320)
        sx, sy = (332, 244) if show_site else (140, 130)
        sheet = Image.new("RGBA", (250, 320), (0, 0, 0, 0))
        sd = ImageDraw.Draw(sheet, "RGBA")
        sd.rounded_rectangle([0, 0, 249, 319], 8, fill=(246, 247, 249, 255))
        sd.rounded_rectangle([20, 24, 150, 44], 4, fill=(20, 24, 31, 255))
        sd.rounded_rectangle([20, 54, 96, 64], 4, fill=(107, 116, 132, 255))
        for i, wdt in enumerate([200, 200, 160]):
            sd.rounded_rectangle([20, 92 + i * 17, 20 + wdt, 100 + i * 17], 3, fill=(200, 207, 218, 255))
        sd.rounded_rectangle([20, 158, 84, 167], 3, fill=acc + (255,))
        for i, wdt in enumerate([200, 180, 200]):
            sd.rounded_rectangle([20, 188 + i * 17, 20 + wdt, 196 + i * 17], 3, fill=(200, 207, 218, 255))
        sd.rounded_rectangle([20, 250, 120, 272], 8, fill=acc + (255,))
        if (sw, sh) != (250, 320):
            sheet = sheet.resize((sw, sh), Image.LANCZOS)
        sheet = sheet.rotate(-5, resample=Image.BICUBIC, expand=True)
        img.paste(sheet, (sx, sy), sheet)
        assert sy + sheet.height <= 556, f'sheet bleeds into the footer: {sy + sheet.height}'

    rx = 1132
    FB_ = font(FB, 22)

    def fit(text, size, maxw):
        """يصغّر المقاس حتى لا يلمس العمود الآخر — أسماء القوالب متفاوتة الطول."""
        while size > 40 and px.textlength(text, font=font(FB, size)) > maxw:
            size -= 8
        return size

    rtl(px, (rx, 96), "قالب · " + row.get("typeLabel", ""), FB_, acc)
    nm = row.get("name", "")
    rtl(px, (rx, 190), nm, font(FB, fit(nm, 84, 470)), ink)

    # لفّ الوصف بالكلمات (لا قصًّا في منتصفها)
    tagf = font(FD, 25)
    words = (row.get("tagline") or "").split()
    lines, cur = [], ""
    for wd in words:
        trial = (cur + " " + wd).strip()
        if cur and px.textlength(trial, font=tagf) > 430:
            lines.append(cur)
            cur = wd
        else:
            cur = trial
    if cur:
        lines.append(cur)
    for i, ln in enumerate(lines[:2]):
        rtl(px, (rx, 300 + i * 40), ln, tagf, dim)

    pf = font(FB, 44)
    rtl(px, (rx, 462), row.get("priceLabel", ""), pf, acc)
    old = row.get("oldLabel")
    if old:
        of = font(FD, 26)
        ox = rx - 30 - px.textlength(row.get("priceLabel", ""), font=pf)
        ow = px.textlength(old, font=of)
        rtl(px, (ox - 14, 476), old, of, dim + (200,))
        px.line([(ox - 14 - ow, 476), (ox - 14, 476)], fill=dim + (200,), width=3)
    if row.get("ratingLabel"):
        rtl(px, (rx, 512), row["ratingLabel"], font(FD, 22), dim)

    if row.get("bestLabel"):
        bw2 = 210
        px.rounded_rectangle([60, 40, 60 + bw2, 86], 12, fill=soft, outline=acc + (120,))
        rtl(px, (60 + bw2 - 14, 63), row["bestLabel"], FB_, acc)
    if row.get("discount"):
        dw = 176
        x0 = 60 + (210 + 18 if row.get("bestLabel") else 0)
        px.rounded_rectangle([x0, 40, x0 + dw, 86], 12, fill=acc + (235,))
        rtl(px, (x0 + dw - 14, 63), row["discount"], FB_, bg)

    px.line([(70, 560), (rx, 560)], fill=acc + (90,), width=2)
    px.text((72, 580), f"QALB · qalb.store/template/{row.get('slug', '')}", font=font(FD, 19), fill=dim, spacing=2)

    os.makedirs(os.path.dirname(out), exist_ok=True)
    img.save(out, "PNG", optimize=True)
    return os.path.getsize(out)


def main():
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(here, "public", "og-cover.png"))
    ap.add_argument("--cards", action="store_true", help="read a JSON array on stdin and render public/og/<slug>.png for each")
    args = ap.parse_args()

    if args.cards:
        import json
        import sys

        rows = json.load(sys.stdin)
        total = 0
        for r in rows:
            total += product_card(r, os.path.join(here, "public", "og", f"{r['slug']}.png"))
        print(f"og-cards → {len(rows)} بطاقة في public/og · {total // 1024} kB")
        return

    img = Image.new("RGB", (W, H), BG)
    px = ImageDraw.Draw(img, "RGBA")

    # grid + glow
    for i in range(11):
        px.line([(i * 120, 0), (i * 120, H)], fill=(232, 235, 242, 14), width=1)
    px.ellipse([640, -240, 1420, 420], fill=(52, 211, 153, 34))

    # ---- browser mock (left) ----
    bx, by, bw, bh = 70, 116, 520, 340
    px.rounded_rectangle([bx, by, bx + bw, by + bh], 20, fill=PANEL, outline=LINE, width=2)
    px.rounded_rectangle([bx, by, bx + bw, by + 46], 20, fill=(14, 17, 25))
    for i, c in enumerate([(255, 95, 87), (254, 188, 46), (40, 200, 64)]):
        px.ellipse([bx + 24 + i * 20, by + 17, bx + 36 + i * 20, by + 29], fill=c)
    px.rounded_rectangle([bx + 92, by + 12, bx + 340, by + 34], 11, fill=(26, 31, 43))

    px.rounded_rectangle([bx + 30, by + 76, bx + 290, by + 102], 6, fill=(232, 235, 242, 225))
    px.rounded_rectangle([bx + 30, by + 118, bx + 380, by + 132], 7, fill=(154, 163, 181, 140))
    px.rounded_rectangle([bx + 30, by + 144, bx + 300, by + 158], 7, fill=(154, 163, 181, 90))
    px.rounded_rectangle([bx + 30, by + 176, bx + 170, by + 210], 10, fill=BRAND)

    for i in range(4):
        x = bx + 30 + i * 118
        px.rounded_rectangle([x, by + 226, x + 104, by + 296], 10, fill=tile(i))

    # ---- A4 sheet, slightly rotated (right, overlapping) ----
    sheet = Image.new("RGBA", (230, 300), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sheet, "RGBA")
    sd.rounded_rectangle([0, 0, 229, 299], 8, fill=TODAY + (255,))
    sd.rounded_rectangle([18, 22, 138, 40], 4, fill=(20, 24, 31, 255))
    sd.rounded_rectangle([18, 50, 92, 60], 4, fill=(107, 116, 132, 255))
    for i, wdt in enumerate([190, 190, 150]):
        sd.rounded_rectangle([18, 84 + i * 16, 18 + wdt, 92 + i * 16], 3, fill=(200, 207, 218, 255))
    sd.rounded_rectangle([18, 146, 78, 154], 3, fill=BRAND + (255,))
    for i, wdt in enumerate([190, 170, 190]):
        sd.rounded_rectangle([18, 172 + i * 16, 18 + wdt, 180 + i * 16], 3, fill=(200, 207, 218, 255))
    sheet = sheet.rotate(-5, resample=Image.BICUBIC, expand=True)
    img.paste(sheet, (296, 316), sheet)

    # ---- text (right-aligned RTL column) ----
    rx = 1132
    rtl(px, (rx, 138), "قالب", font(FB, 96), INK)
    rtl(px, (rx, 236), "قوالب معرض الأعمال + سيرة ذاتية", font(FB, 34), BRAND)
    for i, line in enumerate(["معاينة حيّة قبل الشراء", "تعديل نصّي ونشر على Vercel", "ملف ATS جاهز للتقديم"]):
        rtl(px, (rx, 300 + i * 44), line, font(FD, 26), DIM)
    px.line([(700, 462), (rx, 462)], fill=(52, 211, 153, 120), width=2)
    rtl(px, (rx, 498), "١٥ منتجًا · من ٥٩ ر.س · شاملًا الضريبة", font(FB, 26), GOLD)

    px.text((72, 580), "QALB · MADE IN JEDDAH · qalb.store", font=font(FD, 20), fill=(107, 116, 132), spacing=3)

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    img.save(args.out, "PNG", optimize=True)
    print(f"og-cover → {args.out} ({os.path.getsize(args.out) // 1024} kB)")


if __name__ == "__main__":
    main()
