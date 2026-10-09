#!/usr/bin/env python3
"""v4 one-off: rasterise brand SVGs (Playwright/Chromium) and compose 1200x630 JPEG OG images for every credited photo
(v3 library + v4 action shots) with the v4 stacked wordmark and a flag-orange slash. Outputs: v4/brand/*.png, v4/og/*.jpg."""
import json, pathlib, subprocess
HERE = pathlib.Path(__file__).resolve().parent
B = HERE / "brand"; OG = HERE / "og"; OG.mkdir(exist_ok=True)
V3 = HERE.parent / "v3"

RENDER = [("logo-v4.svg", "logo-v4.png", 1600, "transparent"), ("logo-v4-light.svg", "logo-v4-light.png", 1600, "transparent"),
          ("logo-v4.svg", "logo-v4-on-chalk.png", 1600, "#F6F3EC"), ("logo-v4-light.svg", "logo-v4-on-ink.png", 1600, "#0D1410"),
          ("logo-v4-stacked.svg", "logo-v4-stacked.png", 1000, "transparent"), ("logo-v4-stacked-light.svg", "logo-v4-stacked-light.png", 1000, "transparent"),
          ("mark-v4.svg", "mark-v4.png", 512, "transparent"), ("mark-v4-ink.svg", "mark-v4-ink.png", 512, "transparent"),
          ("favicon-v4.svg", "favicon-32.png", 32, "transparent"), ("favicon-v4.svg", "apple-touch-icon.png", 180, "#FF4B1F"),
          ("favicon-v4.svg", "icon-512.png", 512, "transparent")]

JS = r'''
import asyncio,sys,json
from playwright.async_api import async_playwright
jobs=json.loads(sys.argv[1])
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page()
        for svgp,out,w,bg in jobs:
            svg=open(svgp).read().replace("<svg ","<svg style=\"width:100%;height:auto;display:block\" ",1)
            await pg.set_content(f'<html><body style="margin:0;background:{bg}"><div id=w style="width:{w}px">{svg}</div></body></html>')
            el=await pg.query_selector('#w'); await el.screenshot(path=out, omit_background=(bg=="transparent"))
        await b.close()
asyncio.run(main())
'''


def main():
    jobs = [[str(B / s), str(B / o), w, bg] for s, o, w, bg in RENDER]
    subprocess.run(["/tmp/pwvenv/bin/python", "-c", JS, json.dumps(jobs)], check=True)
    from PIL import Image, ImageDraw
    logo = Image.open(B / "logo-v4-stacked-light.png").convert("RGBA")
    lw = 380; logo = logo.resize((lw, round(logo.height * lw / logo.width)), Image.LANCZOS)
    n = 0
    for d in (V3 / "photos", HERE / "photos"):
        for key in json.loads((d / "credits.json").read_text()):
            src = d / (f"{key}-2400.webp" if (d / f"{key}-2400.webp").exists() else f"{key}-1600.webp")
            im = Image.open(src).convert("RGB")
            r = max(1200 / im.width, 630 / im.height); im = im.resize((round(im.width * r) + 1, round(im.height * r) + 1), Image.LANCZOS)
            l = (im.width - 1200) // 2; t = (im.height - 630) // 2; im = im.crop((l, t, l + 1200, t + 630)).convert("RGBA")
            grad = Image.new("RGBA", (1200, 630)); g = ImageDraw.Draw(grad)
            for x in range(1200):
                a = int(225 * max(0, 1 - x / 760) ** 1.2)
                g.line([(x, 0), (x, 630)], fill=(10, 12, 10, a))
            im = Image.alpha_composite(im, grad)
            slash = Image.new("RGBA", (1200, 630)); s = ImageDraw.Draw(slash)
            s.polygon([(0, 600), (1200, 560), (1200, 630), (0, 630)], fill=(255, 75, 31, 255))
            im = Image.alpha_composite(im, slash)
            im.alpha_composite(logo, (60, 600 - logo.height - 70))
            im.convert("RGB").save(OG / f"{key}.jpg", "JPEG", quality=80, optimize=True, progressive=True)
            n += 1
    print("rendered", len(jobs), "pngs and", n, "og images")


if __name__ == "__main__":
    main()
