# Editorial illustrations for Discount Deal Me (2026-10 redesign).
# Flat, neutral, data-style graphics: panels, charts, receipts and calendars.
# No characters or mascots. The 2026-09 cartoon set is in git history (before Oct 10, 2026).
import os

BG = "#f4f4f5"; PANEL = "#ffffff"; LINE = "#e4e4e7"; MID = "#a1a1aa"; SOFT = "#d4d4d8"
INK = "#0b0d12"; INK2 = "#52525b"; ACC = "#ea580c"; ACC_T = "#ffedd5"
FONT = "Inter, 'Helvetica Neue', Arial, sans-serif"


def wrap(title, body, w=1200, h=675, bg=BG):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" aria-labelledby="t">'
            f'<title id="t">{title}</title><rect width="{w}" height="{h}" fill="{bg}"/>'
            + grid(w, h) + body + '</svg>')


def grid(w, h, step=40):
    lines = "".join(f'<path d="M{x} 0V{h}"/>' for x in range(step, w, step)) + "".join(f'<path d="M0 {y}H{w}"/>' for y in range(step, h, step))
    return f'<g stroke="#ebebee" stroke-width="1">{lines}</g>'


def panel(x, y, w, h, r=18, fill=PANEL, shadow=True):
    s = f'<rect x="{x}" y="{y + 6}" width="{w}" height="{h}" rx="{r}" fill="#000" opacity=".05"/>' if shadow else ""
    return s + f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" stroke="{LINE}" stroke-width="2"/>'


def bar(x, y, w, h=14, fill=SOFT, r=7):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}"/>'


def text(x, y, s, size=28, fill=INK, weight=700, anchor="start"):
    return f'<text x="{x}" y="{y}" font-family="{FONT}" font-size="{size}" font-weight="{weight}" fill="{fill}" text-anchor="{anchor}">{s}</text>'


def pill(x, y, w, label, fill=ACC_T, color=ACC, h=40):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{h // 2}" fill="{fill}"/>' + text(x + w / 2, y + h * .68, label, 20, color, 700, "middle")


def check(x, y, s=1, color=ACC):
    return f'<g transform="translate({x} {y}) scale({s})"><circle r="16" fill="{color}"/><path d="M-7 0l5 5 9-10" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>'


def tagshape(x, y, w=220, h=110, fill=PANEL, stroke=INK):
    return (f'<path d="M{x} {y + h / 2} L{x + 40} {y} H{x + w} a12 12 0 0 1 12 12 V{y + h - 12} a12 12 0 0 1 -12 12 H{x + 40} Z" fill="{fill}" stroke="{stroke}" stroke-width="3" stroke-linejoin="round"/>'
            f'<circle cx="{x + 34}" cy="{y + h / 2}" r="9" fill="{BG}" stroke="{stroke}" stroke-width="3"/>')


def linechart(x, y, w, h, pts, color=INK, dot_at=None):
    sx = w / (len(pts) - 1)
    lo, hi = min(pts), max(pts)
    P = [(x + i * sx, y + h - (v - lo) / (hi - lo or 1) * h) for i, v in enumerate(pts)]
    d = "M" + " L".join(f"{a:.1f} {b:.1f}" for a, b in P)
    area = d + f" L{x + w} {y + h} L{x} {y + h} Z"
    out = f'<path d="{area}" fill="{color}" opacity=".06"/><path d="{d}" fill="none" stroke="{color}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>'
    if dot_at is not None:
        a, b = P[dot_at]
        out += f'<circle cx="{a:.1f}" cy="{b:.1f}" r="10" fill="{ACC}" stroke="#fff" stroke-width="4"/>'
    return out


ART = {}

ART["how-to-spot-a-real-deal"] = ("Price comparison panel: a struck-through list price, the sale price, and a price-history chart showing the usual price is close to the sale price",
    panel(120, 120, 440, 430) + text(160, 190, "List price", 22, INK2, 500) + text(160, 250, "$129.99", 50, MID, 700)
    + f'<path d="M158 236 H372" stroke="{MID}" stroke-width="4"/>' + text(160, 330, "Sale price", 22, INK2, 500) + text(160, 395, "$89.99", 60, INK, 800)
    + pill(160, 440, 190, "31% off tag") + panel(620, 120, 460, 430)
    + text(660, 190, "Usual price, 90 days", 22, INK2, 500) + linechart(660, 240, 380, 200, [95, 92, 94, 91, 93, 90, 94, 92, 89], INK, 8)
    + f'<path d="M660 300 H1040" stroke="{ACC}" stroke-width="2" stroke-dasharray="8 8"/>' + text(660, 500, "Real saving vs usual: about 3%", 22, INK, 700))

ART["coupon-stacking-explained"] = ("Three stacked discount layers, store promotion, coupon code and cashback, feeding into one checkout total",
    "".join(panel(140 + i * 40, 140 + i * 110, 520, 90) + text(180 + i * 40, 195 + i * 110, lbl, 26, INK, 700) + pill(500 + i * 40, 165 + i * 110, 130, amt)
            for i, (lbl, amt) in enumerate([("Store promotion", "-15%"), ("Coupon code", "-$10"), ("Card cashback", "+3%")]))
    + panel(780, 200, 300, 280) + text(820, 260, "Checkout", 24, INK2, 500) + bar(820, 290, 220, 12) + bar(820, 320, 180, 12) + bar(820, 350, 200, 12)
    + f'<path d="M820 385 H1040" stroke="{LINE}" stroke-width="2"/>' + text(820, 440, "$71.40", 48, INK, 800))

ART["price-tracking-basics"] = ("Price-history chart with an alert marker at the lowest point and a target-price line",
    panel(120, 100, 960, 470) + text(170, 170, "Price history", 26, INK, 700) + pill(870, 140, 170, "Alert set")
    + f'<path d="M170 380 H1030" stroke="{ACC}" stroke-width="2" stroke-dasharray="10 8"/>' + text(1030, 368, "Target $64", 20, ACC, 700, "end")
    + linechart(170, 220, 860, 280, [80, 78, 82, 79, 74, 77, 71, 75, 69, 72, 62, 70, 74], INK, 10)
    + "".join(bar(170 + i * 145, 530, 90, 8, LINE, 4) for i in range(6)))

ART["cashback-portals-and-card-rewards"] = ("Timeline showing a purchase, cashback marked pending, then confirmed and paid out",
    panel(120, 150, 960, 380) + "".join(
        f'<circle cx="{220 + i * 255}" cy="300" r="22" fill="{ACC if i < 3 else PANEL}" stroke="{ACC if i < 3 else SOFT}" stroke-width="4"/>'
        + text(220 + i * 255, 375, lbl, 24, INK, 700, "middle") + text(220 + i * 255, 410, sub, 20, INK2, 500, "middle")
        for i, (lbl, sub) in enumerate([("Purchase", "Day 0"), ("Tracked", "Day 1"), ("Pending", "Day 2-60"), ("Paid", "Day 60-90")]))
    + f'<path d="M242 300 H730" stroke="{ACC}" stroke-width="4"/><path d="M752 300 H963" stroke="{SOFT}" stroke-width="4" stroke-dasharray="10 8"/>'
    + text(170, 220, "Cashback status", 26, INK, 700))

ART["return-policies-decoded"] = ("Return policy summary card listing the return window, who pays return shipping and the restocking fee",
    panel(300, 90, 600, 500) + text(350, 160, "Return policy", 30, INK, 800)
    + "".join(text(350, 240 + i * 80, k, 24, INK2, 500) + text(850, 240 + i * 80, v, 24, INK, 700, "end") + f'<path d="M350 {262 + i * 80} H850" stroke="{LINE}" stroke-width="2"/>'
              for i, (k, v) in enumerate([("Window", "30 days"), ("Return shipping", "Buyer pays"), ("Restocking fee", "15%"), ("Refund to", "Original card")]))
    + pill(350, 540 - 20, 220, "Read before buying"))

ART["seasonal-sale-calendar"] = ("Twelve-month calendar grid with the usual sale months highlighted",
    panel(150, 90, 900, 500) + text(200, 160, "Sale calendar", 28, INK, 800)
    + "".join(
        f'<rect x="{200 + (i % 6) * 135}" y="{200 + (i // 6) * 170}" width="115" height="140" rx="14" fill="{ACC_T if m in ("Jan", "Jul", "Sep", "Nov") else BG}" stroke="{LINE}" stroke-width="2"/>'
        + text(257 + (i % 6) * 135, 250 + (i // 6) * 170, m, 24, ACC if m in ("Jan", "Jul", "Sep", "Nov") else INK2, 700, "middle")
        + bar(222 + (i % 6) * 135, 290 + (i // 6) * 170, 70, 10, SOFT, 5)
        for i, m in enumerate(["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"])))

ART["unit-price-math"] = ("Two shelf labels compared by price per ounce, with the cheaper unit price highlighted",
    "".join(panel(160 + i * 480, 160, 400, 330) + text(200 + i * 480, 230, n, 26, INK, 700) + text(200 + i * 480, 310, p, 54, INK, 800)
            + text(200 + i * 480, 370, u, 26, ACC if i else INK2, 700) + bar(200 + i * 480, 420, 280 if i == 0 else 200, 16, SOFT if i == 0 else ACC, 8)
            for i, (n, p, u) in enumerate([("12 oz jar", "$4.99", "41.6\u00a2 / oz"), ("32 oz jar", "$9.99", "31.2\u00a2 / oz")])))

ART["budgeting-for-deal-hunters"] = ("Monthly budget panel with spending categories as progress bars and one category nearly at its limit",
    panel(250, 90, 700, 500) + text(300, 160, "October budget", 28, INK, 800) + text(900, 160, "$1,240 left", 24, INK2, 600, "end")
    + "".join(text(300, 235 + i * 85, k, 22, INK2, 500) + bar(300, 252 + i * 85, 600, 16, BG, 8) + bar(300, 252 + i * 85, int(600 * f), 16, ACC if f > .9 else INK, 8)
              for i, (k, f) in enumerate([("Groceries", .62), ("Household", .45), ("Gifts", .94), ("Sale fund", .3)])))

ART["price-matching-and-price-adjustments"] = ("Two store price cards side by side with an equals sign, showing a matched price",
    panel(140, 170, 380, 320) + text(180, 240, "Store A", 24, INK2, 600) + text(180, 330, "$199", 64, MID, 800) + f'<path d="M178 312 H330" stroke="{MID}" stroke-width="4"/>' + text(180, 400, "Matched to $179", 24, INK, 700)
    + text(600, 360, "=", 90, ACC, 800, "middle")
    + panel(680, 170, 380, 320) + text(720, 240, "Store B", 24, INK2, 600) + text(720, 330, "$179", 64, INK, 800) + pill(720, 380, 170, "Same model"))

ART["free-trials-and-subscription-traps"] = ("Subscription calendar with the free-trial end date and first renewal charge circled",
    panel(200, 90, 800, 500) + text(250, 160, "Free trial", 28, INK, 800) + text(950, 160, "Renews $14.99/mo", 22, INK2, 600, "end")
    + "".join(f'<rect x="{250 + (i % 7) * 100}" y="{200 + (i // 7) * 75}" width="80" height="60" rx="10" fill="{BG}"/>' + text(290 + (i % 7) * 100, 240 + (i // 7) * 75, str(i + 1), 20, INK2, 600, "middle") for i in range(28))
    + f'<rect x="{250 + 6 * 100}" y="{200 + 3 * 75}" width="80" height="60" rx="10" fill="none" stroke="{ACC}" stroke-width="4"/>'
    + pill(250, 520, 230, "Cancel by day 27"))

ART["open-box-refurbished-and-renewed"] = ("Condition grades for open-box and refurbished items with warranty length for each",
    panel(180, 110, 840, 460) + text(230, 180, "Condition guide", 28, INK, 800)
    + "".join(f'<rect x="230" y="{220 + i * 105}" width="64" height="64" rx="14" fill="{INK if i == 0 else BG}" stroke="{LINE}" stroke-width="2"/>' + text(262, 263 + i * 105, g, 30, "#fff" if i == 0 else INK, 800, "middle")
              + text(320, 250 + i * 105, d, 24, INK, 700) + text(320, 280 + i * 105, w, 20, INK2, 500)
              for i, (g, d, w) in enumerate([("A", "Like new, full accessories", "1-year warranty"), ("B", "Light wear, tested", "90-day warranty"), ("C", "Visible wear, works", "30-day warranty")])))

ART["free-shipping-thresholds"] = ("Cart progress bar toward a free-shipping threshold, with the remaining amount shown",
    panel(160, 170, 880, 330) + text(210, 240, "Cart subtotal  $41.50", 28, INK, 800) + text(990, 240, "Free shipping at $49", 22, INK2, 600, "end")
    + bar(210, 290, 780, 22, BG, 11) + bar(210, 290, int(780 * 41.5 / 49), 22, ACC, 11)
    + text(210, 380, "$7.50 to go, or pay $5.99 shipping", 24, INK2, 500) + pill(210, 420, 260, "Compare both totals"))

# 1:1 coverage check
assert len(ART) == 12


def hero():
    # Generic, unbranded deal cards (no merchant names or prices) so the image never implies a specific offer.
    w, h = 1600, 900
    def card(x, y, score_w):
        return (panel(x, y, 620, 300) + bar(x + 50, y + 55, 160, 16, SOFT) + bar(x + 50, y + 100, 380, 34, INK, 10)
                + bar(x + 50, y + 155, 300, 16, SOFT) + f'<rect x="{x + 50}" y="{y + 210}" width="{score_w}" height="40" rx="20" fill="{ACC_T}"/>'
                + bar(x + 70, y + 224, score_w - 40, 12, ACC, 6) + f'<rect x="{x + 70 + score_w}" y="{y + 210}" width="150" height="40" rx="20" fill="{BG}"/>')
    body = (card(140, 120, 170) + card(840, 120, 140)
            + panel(140, 480, 1320, 300) + bar(190, 530, 260, 18, INK, 9) + linechart(190, 590, 1220, 150, [70, 72, 69, 73, 71, 74, 70, 72, 60, 71], INK, 8))
    return wrap("Abstract deal cards with score bars and a price-history line", body, w, h)


def og():
    w, h = 1200, 630
    body = (f'<rect x="80" y="80" width="88" height="88" rx="22" fill="{INK}"/>' + logo_mark(80, 80, 88, inner=True)
            + text(80, 300, "Discount Deal Me", 72, INK, 800) + text(80, 370, "Live deals, scored and checked.", 40, INK2, 500)
            + pill(80, 430, 250, "Deal Score 0-100") + pill(350, 430, 230, "Network-checked", PANEL, INK) + pill(600, 430, 190, "AI summaries", PANEL, INK))
    return wrap("Discount Deal Me: live deals, scored and checked", body, w, h)


def logo_mark(x, y, s, inner=False):
    k = s / 64
    return (f'<g transform="translate({x} {y}) scale({k})">'
            + ('' if inner else f'<rect width="64" height="64" rx="16" fill="{INK}"/>')
            + f'<path d="M18 46 L46 18" stroke="#fff" stroke-width="5" stroke-linecap="round"/>'
            + f'<circle cx="21" cy="21" r="6" fill="none" stroke="#fff" stroke-width="5"/><circle cx="43" cy="43" r="6" fill="{ACC}"/></g>')


def logo():
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img" aria-label="Discount Deal Me">'
            + logo_mark(0, 0, 64) + '</svg>')


def write_all(outdir):
    os.makedirs(outdir, exist_ok=True)
    for slug, (alt, body) in ART.items():
        with open(os.path.join(outdir, f"{slug}.svg"), "w") as f:
            f.write(wrap(alt, body))
    open(os.path.join(outdir, "hero.svg"), "w").write(hero())
    open(os.path.join(outdir, "og.svg"), "w").write(og())
    open(os.path.join(outdir, "logo.svg"), "w").write(logo())
