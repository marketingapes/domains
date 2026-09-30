#!/usr/bin/env python3
"""Generate + render Phillips 5-lane ad creatives (HTML/CSS -> PNG via headless Chrome).

Usage: python3 build_creatives.py [lane ...]
Writes <lane>/src/<name>.html, then render_cdp.mjs renders <lane>/<name>.png. No network, no uploads.
BTL and NIL identities are kept in separate style blocks; a lane only ever gets its own brand.
"""
import json, os, subprocess, sys, html

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
DISCLAIMER = "Attorney advertising. Not a law firm. No legal advice. Results not guaranteed."

BTL_SEAL = json.load(open(os.path.join(REPO, "btl", "brand.json")))["logo"]["svg"]
NIL_PIN = ('<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">'
           '<path d="M12 1.5C7.3 1.5 3.6 5.2 3.6 9.9c0 5.9 8.4 12.6 8.4 12.6s8.4-6.7 8.4-12.6c0-4.7-3.7-8.4-8.4-8.4z" fill="#fff"/>'
           '<circle cx="12" cy="9.9" r="3.9" fill="none" stroke="#f87171" stroke-width="1.3" opacity=".75"/>'
           '<circle cx="12" cy="9.9" r="2.3" fill="#ef4444"/><circle cx="12" cy="9.9" r=".9" fill="#fff"/></svg>')

SIZES = {"1x1": (1080, 1080), "4x5": (1080, 1350), "gdn": (1200, 628)}

# ---------------------------------------------------------------- copy
SURV_BULLETS = ["No need to describe what happened", "Skip any question. Stop anytime", "Free and confidential"]

RIDESHARE = {  # lanes 4 + 5: identical concepts/copy, brand differs only
    "c1": dict(layout="center", eyebrow="Rideshare · Confidential",
               h="You deserve<br>to be <em>heard.</em>",
               sub="For riders who experienced sexual misconduct by a rideshare driver. A calm, private first step.",
               cta="Learn more"),
    "c2": dict(layout="left", eyebrow="Rideshare · A private first step",
               h="Confidential.<br><em>At your pace.</em>",
               sub="A few general questions to see if you may potentially qualify for review by an independent law firm.",
               bullets=SURV_BULLETS, cta="Learn more"),
    "c3": dict(layout="inverse", eyebrow="Rideshare · Confidential",
               h="Your voice matters<br><em>— even years later.</em>",
               sub="Many people wait a long time before speaking up. When you're ready, the first step is short and private.",
               cta="Learn more"),
    "c4": dict(layout="card", eyebrow="Rideshare · Confidential",
               h="Riders deserve to feel safe. <em>And to be heard.</em>",
               bubble="You don't need to describe what happened. I'll ask a few general questions — you can skip any of them.",
               bubble_by="Sofia · AI intake guide, not a lawyer",
               cta="Learn more"),
}

LANES = {
    "nil-mva-pi": dict(brand="nil", survivor=False, concepts={
        "c1": dict(layout="center", eyebrow="All 50 states · Free first step",
                   h="Hurt in a crash?<br><em>Check your options in 2 minutes.</em>",
                   sub="Answer a few short questions with Sofia, our AI intake guide. In any of the 50 states.",
                   cta="See your options"),
        "c2": dict(layout="left", eyebrow="After a vehicle accident",
                   h="Car accident?<br><em>Know your next step.</em>",
                   sub="See if you may potentially qualify for review by an independent law firm.",
                   bullets=["Car, truck, motorcycle or rideshare", "In any of the 50 states", "About 2 minutes. Free"],
                   cta="See your options"),
        "c3": dict(layout="inverse", eyebrow="Deadlines vary by state",
                   h="Don't wait to learn<br><em>your options.</em>",
                   sub="Hurt in a vehicle accident? A short, free check — from anywhere in the U.S.",
                   big="50", big_label="In any of the 50 states",
                   cta="Check in 2 minutes"),
        "c4": dict(layout="card", eyebrow="Before you call a law firm",
                   h="Start with Sofia. <em>It takes about 2 minutes.</em>",
                   bubble="Hi, I'm Sofia, an AI intake guide. A few quick questions can help identify a possible next step after your accident.",
                   bubble_by="Sofia · AI intake guide, not a lawyer",
                   cta="See your options"),
    }),
    "btl-sex-abuse-la-county": dict(brand="btl", survivor=True, concepts={
        "c1": dict(layout="center", eyebrow="Los Angeles County · Confidential",
                   h="You deserve<br>to be <em>heard.</em>",
                   sub="For adults who experienced abuse as children in LA County facilities, schools or programs. A private first step.",
                   cta="Learn more"),
        "c2": dict(layout="left", eyebrow="Los Angeles County",
                   h="Laws in California<br><em>changed.</em>",
                   sub="Adults abused as children in LA County settings may have options they did not have before.",
                   bullets=SURV_BULLETS, cta="Learn more"),
        "c3": dict(layout="inverse", eyebrow="Los Angeles County · Confidential",
                   h="Your voice matters<br><em>— even years later.</em>",
                   sub="Many people wait decades before speaking up. When you're ready, the first step is short and private.",
                   cta="Learn more"),
        "c4": dict(layout="card", eyebrow="Los Angeles County · Confidential",
                   h="Confidential. <em>At your pace.</em>",
                   bubble="You don't need to describe what happened. I'll ask a few general questions — you can skip any of them.",
                   bubble_by="Sofia · AI intake guide, not a lawyer",
                   cta="Learn more"),
    }),
    "btl-sex-abuse-ca-womens-prisons": dict(brand="btl", survivor=True, concepts={
        "c1": dict(layout="center", eyebrow="California women's facilities · Confidential",
                   h="You deserve<br>to be <em>heard.</em>",
                   sub="For women who experienced sexual misconduct by staff in a California women's facility. A private first step.",
                   cta="Learn more"),
        "c2": dict(layout="left", eyebrow="California women's facilities",
                   h="Confidential.<br><em>At your pace.</em>",
                   sub="A few general questions to see if you may potentially qualify for review by an independent law firm.",
                   bullets=SURV_BULLETS, cta="Learn more"),
        "c3": dict(layout="inverse", eyebrow="California women's facilities · Confidential",
                   h="Your voice matters<br><em>— even years later.</em>",
                   sub="Many people wait years before speaking up. When you're ready, the first step is short and private.",
                   cta="Learn more"),
        "c4": dict(layout="card", eyebrow="California women's facilities",
                   h="Misconduct by staff is never <em>part of a sentence.</em>",
                   bubble="You don't need to describe what happened. I'll ask a few general questions — you can skip any of them.",
                   bubble_by="Sofia · AI intake guide, not a lawyer",
                   cta="Learn more"),
    }),
    "btl-rideshare-sex-abuse": dict(brand="btl", survivor=True, concepts=RIDESHARE),
    "nil-rideshare-sex-abuse": dict(brand="nil", survivor=True, concepts=RIDESHARE),
}

# ---------------------------------------------------------------- styles
BASE_CSS = """
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:__W__px;height:__H__px;overflow:hidden}
body{position:relative;-webkit-font-smoothing:antialiased;font-family:var(--sans)}
.stage{position:absolute;left:0;top:0;width:__W__px;height:__MAINH__px;overflow:hidden;background:var(--bg)}
.band{position:absolute;left:0;bottom:0;width:__W__px;height:__BANDH__px;display:flex;align-items:center;justify-content:center;
  background:var(--band-bg);color:var(--band-ink);font:500 __BANDFS__px/1.2 var(--sans);letter-spacing:.01em;text-align:center;padding:0 24px}
.inner{position:absolute;inset:__PAD__px;display:flex;flex-direction:column}
.brandrow{display:flex;align-items:center;gap:__GAP__px}
.brandrow .mark{width:__LOGO__px;height:__LOGO__px;flex:none}
.brandrow .mark svg{width:100%;height:100%;display:block}
.wm b{display:block;font-size:__WM__px;line-height:1.1}
.wm span{display:block;font-size:__WMS__px;letter-spacing:.2em;text-transform:uppercase;margin-top:4px}
.eyebrow{display:inline-block;align-self:flex-start;font:700 __EB__px/1 var(--sans);letter-spacing:.18em;text-transform:uppercase;
  padding:__EBP__px __EBP2__px;border-radius:999px}
h1{font-size:__H1__px;line-height:1.04}
.sub{font-size:__SUB__px;line-height:1.38;max-width:__SUBW__px}
.cta{display:inline-flex;align-items:center;gap:12px;align-self:flex-start;font:700 __CTA__px/1 var(--sans);padding:__CTAP__px __CTAP2__px;border-radius:999px}
.cta:after{content:"\\2192"}
ul{list-style:none}
li{display:flex;align-items:center;gap:16px;font-size:__LI__px;line-height:1.3;margin-top:__LIM__px}
li:before{content:"";flex:none;width:__DOT__px;height:__DOT__px;border-radius:50%}
.bubble{border-radius:28px;padding:__BP__px;font-size:__BUB__px;line-height:1.42}
.by{font-size:__BY__px;margin-top:14px}
.spacer{flex:1}
"""

BTL_CSS = """
:root{--bg:#F6F1E7;--ink:#111827;--ink2:#374151;--muted:#5b6472;--gold:#C6A15B;--gold-ink:#7d5f24;--card:#fffdf8;--line:#e4dccd;
 --band-bg:#111827;--band-ink:#EEE7DA;
 --serif:"Iowan Old Style","Baskerville","Palatino Linotype",Georgia,serif;
 --sans:-apple-system,BlinkMacSystemFont,"Inter","SF Pro Text","Segoe UI",Roboto,Helvetica,Arial,sans-serif}
.stage{color:var(--ink)}
.light{position:absolute;border-radius:50%;background:radial-gradient(circle,rgba(255,250,238,1) 0%,rgba(236,220,186,.55) 40%,rgba(246,241,231,0) 70%)}
.wm b{font-family:var(--serif);font-weight:400;color:var(--ink)}
.wm span{color:var(--gold-ink);font-weight:700;font-family:var(--sans)}
.eyebrow{color:var(--gold-ink);border:1.5px solid rgba(198,161,91,.55);background:rgba(255,253,248,.7)}
h1{font-family:var(--serif);font-weight:400;letter-spacing:-.02em;color:var(--ink)}
h1 em{color:#4b5563}
.sub{color:var(--ink2)}
.cta{background:var(--ink);color:#F6F1E7}
li{color:var(--ink2)} li:before{background:var(--gold)}
.rule{background:var(--gold)}
.hair{position:absolute;height:1.5px;background:linear-gradient(90deg,rgba(198,161,91,0),rgba(198,161,91,.8),rgba(198,161,91,0))}
.bubble{background:#EEE7DA;color:var(--ink)}
.cardbox{background:var(--card);border:1px solid var(--line);box-shadow:0 1px 2px rgba(17,24,39,.05),0 14px 36px rgba(17,24,39,.09),0 40px 80px -30px rgba(17,24,39,.22)}
.av{background:var(--ink);color:#e3cc9c;font-family:var(--serif)}
.by{color:var(--muted)}
/* inverse */
.inv .stage{background:linear-gradient(180deg,#0B1220 0%,#111827 58%,#2a2a2e 100%);color:#F6F1E7}
.inv .light{background:radial-gradient(circle,rgba(230,205,150,.55) 0%,rgba(198,161,91,.18) 38%,rgba(17,24,39,0) 70%)}
.inv .wm b,.inv h1{color:#F6F1E7} .inv h1 em{color:#E3CC9C}
.inv .sub{color:#d9d2c5} .inv .eyebrow{color:#E3CC9C;background:rgba(17,24,39,.4)}
.inv .cta{background:#C6A15B;color:#111827} .inv .wm span{color:#C6A15B}
.inv .band{background:#F6F1E7;color:#111827}
"""

NIL_CSS = """
:root{--bg:#08122b;--n2:#0f1e3c;--ink:#0e1726;--paper:#f5f8fc;--teal:#2fbfa3;--mut:#5d6b7e;--line:#dbe3ee;
 --band-bg:#050c1e;--band-ink:#cfd9e8;
 --sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}
.stage{color:#fff;background:radial-gradient(circle at 78% 22%,#1b3160 0%,var(--n2) 34%,var(--bg) 72%)}
.surv .stage{background:radial-gradient(ellipse at 70% 12%,rgba(47,191,163,.22) 0%,rgba(15,30,60,0) 45%),linear-gradient(180deg,#0f1e3c 0%,#0b1834 55%,#08122b 100%)}
.light{position:absolute;border-radius:50%;background:radial-gradient(circle,rgba(95,224,238,.28) 0%,rgba(47,191,163,.12) 40%,rgba(8,18,43,0) 70%)}
.wm b{font-weight:850;letter-spacing:-.02em;color:#fff}
.wm b em{color:#f87171;font-style:normal}
.wm span{color:#9fb0c8;font-weight:600}
.eyebrow{color:var(--teal);border:1.5px solid rgba(47,191,163,.55);background:rgba(47,191,163,.08)}
h1{font-weight:850;letter-spacing:-.04em;color:#fff}
h1 em{font-style:normal;color:#9ee6d6}
.sub{color:#d4e0f1}
.cta{background:var(--teal);color:#06231d}
li{color:#e3ebf6} li:before{background:var(--teal)}
.rule{background:var(--teal)}
.hair{position:absolute;height:1.5px;background:linear-gradient(90deg,rgba(47,191,163,0),rgba(47,191,163,.7),rgba(47,191,163,0))}
.bubble{background:#eef3f9;color:var(--ink)}
.cardbox{background:#fff;border:1px solid var(--line);box-shadow:0 30px 70px -20px rgba(0,0,0,.55)}
.av{background:#0f1e3c;color:var(--teal);font-weight:800}
.by{color:var(--mut)}
.cardbox .cardname{color:var(--ink)}
.inv .stage{background:linear-gradient(160deg,#f5f8fc 0%,#e6eef8 100%);color:var(--ink)}
.inv .wm b,.inv h1{color:var(--ink)} .inv h1 em{color:#128a73}
.inv .wm span{color:var(--mut)} .inv .sub{color:#34445a}
.inv .light{background:radial-gradient(circle,rgba(47,191,163,.25) 0%,rgba(47,191,163,.08) 40%,rgba(245,248,252,0) 70%)}
.inv .eyebrow{color:#0f6f5d;background:rgba(47,191,163,.1)}
.inv li{color:#34445a}
.big{font-weight:900;letter-spacing:-.06em;line-height:.85;color:#0f1e3c}
.biglabel{font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#128a73}
"""


def dims(sz):
    W, H = SIZES[sz]
    band = round(H * 0.08)
    land = sz == "gdn"
    port = sz == "4x5"
    k = 1.0
    d = dict(W=W, H=H, MAINH=H - band, BANDH=band,
             BANDFS=15 if land else (23 if port else 22),
             PAD=40 if land else 76, GAP=12 if land else 18,
             LOGO=40 if land else 64, WM=20 if land else 30, WMS=10 if land else 13,
             EB=12 if land else 17, EBP=8 if land else 12, EBP2=14 if land else 20,
             H1=52 if land else 96, SUB=20 if land else 32, SUBW=560 if land else 860,
             CTA=17 if land else 28, CTAP=14 if land else 22, CTAP2=24 if land else 38,
             LI=17 if land else 29, LIM=8 if land else 16, DOT=9 if land else 14,
             BP=22 if land else 36, BUB=18 if land else 31, BY=13 if land else 21)
    return d


def logo(brand, inv=False):
    if brand == "btl":
        return ('<div class="brandrow"><div class="mark">%s</div><div class="wm"><b>Best Tort Lawyers</b>'
                '<span>Claim matching service</span></div></div>' % BTL_SEAL)
    return ('<div class="brandrow"><div class="mark">%s</div><div class="wm"><b>Nearest <em>Injury</em> Lawyers</b>'
            '<span>Matching service</span></div></div>' % (NIL_PIN if not inv else NIL_PIN.replace('fill="#fff"/>', 'fill="#0f1e3c"/>', 1)))


def body(c, brand, sz, d):
    land = sz == "gdn"
    port = sz == "4x5"
    L = c["layout"]
    eb = '<div class="eyebrow">%s</div>' % html.escape(c["eyebrow"])
    h1 = "<h1>%s</h1>" % c["h"]
    sub = '<p class="sub">%s</p>' % html.escape(c["sub"]) if c.get("sub") else ""
    cta = '<div class="cta">%s</div>' % html.escape(c["cta"])
    bl = "<ul>%s</ul>" % "".join("<li>%s</li>" % html.escape(b) for b in c["bullets"]) if c.get("bullets") else ""
    W, MH = d["W"], d["MAINH"]
    lg = logo(brand, inv=(L == "inverse"))

    if land:
        # landscape: text left, quiet visual right
        right = ""
        if L == "card":
            right = card(c, brand, d, w=440)
        elif c.get("big"):
            right = ('<div style="text-align:center"><div class="big" style="font-size:230px">%s</div>'
                     '<div class="biglabel" style="font-size:16px;margin-top:10px">%s</div></div>' % (c["big"], c["big_label"]))
        elif c.get("bullets"):
            right = '<div style="padding-left:34px;border-left:3px solid" class="rulebox">%s</div>' % bl
        else:
            items = SURV_BULLETS if c.get("survivor") else ["In any of the 50 states", "About 2 minutes", "Free first step"]
            right = ('<div style="padding-left:34px;border-left:3px solid" class="rulebox"><ul>%s</ul></div>'
                     % "".join("<li style='font-size:21px;margin:14px 0'>%s</li>" % html.escape(b) for b in items))
        h = c["h"]
        return ('<div class="light" style="width:900px;height:900px;left:-300px;top:-420px"></div>'
                '<div class="inner" style="flex-direction:row;gap:36px">'
                '<div style="flex:1.25;display:flex;flex-direction:column;min-width:0">%s'
                '<div class="spacer"></div>%s<h1 style="margin:16px 0 12px;font-size:%dpx">%s</h1>%s'
                '<div style="height:18px"></div>%s</div>'
                '<div style="flex:1;display:flex;align-items:center;justify-content:center;min-width:0">%s</div></div>'
                % (lg, eb, c.get("h1_land", 60 if brand == "btl" else 52), h, sub, cta, right))

    if L == "center":
        top = 150 if not port else 220
        return ('<div class="light" style="width:1100px;height:1100px;left:-10px;top:-%dpx"></div>'
                '<div class="hair" style="left:180px;right:180px;top:%dpx"></div>'
                '<div class="inner" style="align-items:center;text-align:center">%s<div class="spacer"></div>'
                '<div class="eyebrow" style="align-self:center">%s</div>'
                '<h1 style="margin:34px 0 28px">%s</h1><p class="sub" style="margin:0 auto">%s</p>'
                '<div style="height:44px"></div><div class="cta" style="align-self:center">%s</div>'
                '<div class="spacer"></div><div style="height:%dpx"></div></div>'
                % (500, MH - 60, lg, html.escape(c["eyebrow"]), c["h"], html.escape(c["sub"]), html.escape(c["cta"]), 10 if not port else 40))
    if L == "left":
        return ('<div class="light" style="width:1000px;height:1000px;right:-420px;top:-380px"></div>'
                '<div class="inner">%s<div class="spacer"></div>%s'
                '<div style="display:flex;gap:34px;margin-top:34px"><div class="rule" style="width:6px;border-radius:3px;flex:none"></div>'
                '<div><h1>%s</h1><div style="height:26px"></div>%s</div></div>'
                '<div style="height:%dpx"></div>%s<div class="spacer"></div>%s</div>'
                % (lg, eb, c["h"], sub, 20 if not port else 40, bl, cta))
    if L == "inverse":
        extra = ""
        if c.get("big"):
            extra = ('<div style="position:absolute;right:76px;top:%dpx;text-align:right"><div class="big" style="font-size:%dpx">%s</div>'
                     '<div class="biglabel" style="font-size:18px;margin-top:10px">%s</div></div>'
                     % (170 if not port else 200, 250 if not port else 300, c["big"], c["big_label"]))
        return ('<div class="light" style="width:1300px;height:1300px;left:-110px;top:%dpx"></div>'
                '<div class="hair" style="left:76px;right:76px;top:%dpx"></div>%s'
                '<div class="inner">%s<div class="spacer"></div>%s<h1 style="margin:30px 0 26px">%s</h1>%s'
                '<div style="height:40px"></div>%s<div style="height:%dpx"></div></div>'
                % (MH - 700, MH - 36, extra, lg, eb, c["h"], sub, cta, 20 if not port else 60))
    if L == "card":
        return ('<div class="light" style="width:1100px;height:1100px;left:-400px;top:-500px"></div>'
                '<div class="inner">%s<div class="spacer"></div><div style="height:28px"></div>%s<h1 style="margin:28px 0 36px;font-size:%dpx">%s</h1>%s'
                '<div class="spacer"></div><div style="height:30px"></div>%s</div>'
                % (lg, eb, 84, c["h"], card(c, brand, d, w=W - 152), cta))


def card(c, brand, d, w):
    small = w < 600
    av = 44 if small else 62
    return ('<div class="cardbox" style="width:%dpx;border-radius:%dpx;padding:%dpx">'
            '<div style="display:flex;align-items:center;gap:14px;margin-bottom:%dpx">'
            '<div class="av" style="width:%dpx;height:%dpx;border-radius:50%%;display:grid;place-items:center;font-size:%dpx">S</div>'
            '<div class="cardname" style="font-weight:700;font-size:%dpx">Sofia <span style="font-weight:500;opacity:.6;font-size:.8em">· AI</span></div></div>'
            '<div class="bubble" style="%s">%s</div><div class="by">%s</div></div>'
            % (w, 22 if small else 32, 22 if small else 34, 14 if small else 22, av, av, 20 if small else 28,
               17 if small else 26, "font-size:17px;padding:18px;border-radius:20px" if small else "",
               html.escape(c["bubble"]), html.escape(c["bubble_by"])))


def page(lane, cid, c, sz):
    cfg = LANES[lane]
    brand = cfg["brand"]
    d = dims(sz)
    css = BASE_CSS
    for k, v in d.items():
        css = css.replace("__%s__" % k, str(v))
    css += BTL_CSS if brand == "btl" else NIL_CSS
    if brand == "btl":
        css += ".rulebox{border-color:#C6A15B!important}"
    else:
        css += ".rulebox{border-color:#2fbfa3!important}"
    cls = []
    if c["layout"] == "inverse":
        cls.append("inv")
    if cfg["survivor"]:
        cls.append("surv")
    title = "%s %s %s" % (lane, cid, sz)
    return ('<!doctype html><html><head><meta charset="utf-8"><title>%s</title>'
            '<meta name="ee-disclaimer-status" content="pending-attorney-review">'
            '<style>%s</style></head><body class="%s"><div class="stage">%s</div>'
            '<div class="band">%s</div></body></html>'
            % (title, css, " ".join(cls), body(c, brand, sz, d), DISCLAIMER))


def render(src, out, W, H):
    import tempfile
    for attempt in range(3):
        prof = tempfile.mkdtemp(prefix="ee-crea-")
        r = subprocess.run([CHROME, "--headless=new", "--hide-scrollbars", "--disable-gpu", "--force-device-scale-factor=1",
                            "--user-data-dir=" + prof, "--window-size=%d,%d" % (W, H), "--screenshot=%s" % out, "file://" + src],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if r.returncode == 0 and os.path.exists(out):
            return
    raise RuntimeError("render failed: " + out)


def main(lanes):
    for lane in lanes:
        cfg = LANES[lane]
        os.makedirs(os.path.join(HERE, lane, "src"), exist_ok=True)
        jobs = [(cid, sz) for cid in cfg["concepts"] for sz in ("1x1", "4x5")]
        jobs.append((cfg.get("gdn_concept", "c1"), "gdn"))
        for cid, sz in jobs:
            c = dict(cfg["concepts"][cid], survivor=cfg["survivor"])
            if sz == "gdn":
                c = dict(c, **cfg.get("gdn_over", {}))
            W, H = SIZES[sz]
            name = "%s_%s_%s_%dx%d" % (lane, cid, "google-display" if sz == "gdn" else "meta", W, H)
            src = os.path.join(HERE, lane, "src", name + ".html")
            open(src, "w").write(page(lane, cid, c, sz))
            print("wrote", name)
    # one Chrome instance over CDP (per-file --screenshot launches were slow/hung under load)
    subprocess.run(["node", os.path.join(HERE, "render_cdp.mjs")] + list(lanes), check=True)


if __name__ == "__main__":
    main(sys.argv[1:] or list(LANES))
