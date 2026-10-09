#!/usr/bin/env python3
"""One-off: rasterise brand SVGs (Playwright/Chromium) and compose JPEG OG images (Pillow).
Outputs live in v3/brand/ and v3/og/ and are copied by build_v3.py. Needs: /tmp/pwvenv (playwright)."""
import asyncio, json, pathlib, subprocess, sys
HERE = pathlib.Path(__file__).resolve().parent
B = HERE / "brand"; OG = HERE / "og"; OG.mkdir(exist_ok=True)

RENDER = [("logo-v3.svg", "logo-v3.png", 1200, "transparent"), ("logo-v3-light.svg", "logo-v3-light.png", 1200, "transparent"),
          ("logo-v3.svg", "logo-v3-on-linen.png", 1200, "#F4EFE6"),
          ("mark-v3.svg", "mark-v3.png", 512, "transparent"), ("mark-v3-light.svg", "mark-v3-light.png", 512, "transparent"),
          ("favicon-v3.svg", "favicon-32.png", 32, "transparent"), ("favicon-v3.svg", "apple-touch-icon.png", 180, "#1E3A2F"),
          ("favicon-v3.svg", "icon-512.png", 512, "transparent")]

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
    credits = json.loads((HERE / "photos" / "credits.json").read_text())
    logo = Image.open(B / "logo-v3-light.png").convert("RGBA")
    lw = 560; logo = logo.resize((lw, round(logo.height * lw / logo.width)), Image.LANCZOS)
    for key in credits:
        src = HERE / "photos" / (f"{key}-2400.webp" if (HERE / "photos" / f"{key}-2400.webp").exists() else f"{key}-1600.webp")
        im = Image.open(src).convert("RGB")
        # cover-crop to 1200x630
        r = max(1200 / im.width, 630 / im.height); im = im.resize((round(im.width * r) + 1, round(im.height * r) + 1), Image.LANCZOS)
        l = (im.width - 1200) // 2; t = (im.height - 630) // 2; im = im.crop((l, t, l + 1200, t + 630)).convert("RGBA")
        grad = Image.new("RGBA", (1200, 630)); d = ImageDraw.Draw(grad)
        for y in range(630):
            a = int(215 * max(0, (y - 230) / 400) ** 1.1)
            d.line([(0, y), (1200, y)], fill=(13, 28, 22, a))
        im = Image.alpha_composite(im, grad)
        im.alpha_composite(logo, (56, 630 - logo.height - 48))
        im.convert("RGB").save(OG / f"{key}.jpg", "JPEG", quality=80, optimize=True, progressive=True)
    print("rendered", len(jobs), "pngs and", len(credits), "og images")


if __name__ == "__main__":
    main()
