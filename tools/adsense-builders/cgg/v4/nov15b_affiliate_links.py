#!/usr/bin/env python3
"""CGG affiliate-link pass, 15 Nov 2026 (follows nov15_optimize.py). Idempotent.

* Every affiliate link now goes to a relevant product, collection or sale page (no merchant homepages).
* Vice uses its CJ Evergreen link (15735305), which honours url= deep links, so Black Friday
  buttons land on vicegolf.com/black-friday-deals and the "opens the personalisation page" notes go.
* The Indoor Golf Shop uses its CJ Evergreen link (15860706) with url= deep links.
* Best Choice Products (Impact) sells no golf sets, so boxes that said it did now point to
  Big Moss putting greens at The Indoor Golf Shop; BCP stays only where its game tables fit.
* Adds GOLF Partner (Impact 17026, pre-owned clubs from Japan) where putters/clubs are discussed.
* Adds a marked #ad partner box to guides, hubs and the clubhouse that had none.
  The practice-session planner stays link-free: it promises no affiliate links (see tests).
No prices are added here; prices already on pages came from merchant pages on 15 Nov 2026.
"""
import html, pathlib, re, urllib.parse

ROOT = pathlib.Path(__file__).resolve().parents[4] / "cgg"
q = lambda u: urllib.parse.quote(u, safe="")

IGS_EV = "https://www.tkqlhce.com/click-101511730-15860706"
VICE_EV = "https://www.dpbolvw.net/click-101511730-15735305"
VICE_PERS = "https://www.tkqlhce.com/click-101511730-14054834"   # CJ text link -> personalisation page
GP = "https://golfpartner.sjv.io/c/335485/1433527/17026"
BCP = "https://bestchoiceproducts.sjv.io/c/335485/2873487/33479"

S = "https://shopindoorgolf.com/"
IGS_GREENS = S + "collections/indoor-putting-greens"
IGS_BIGMOSS = S + "collections/big-moss-putting-greens"
IGS_OUTDOOR = S + "products/big-moss-outdoor-putting-target-green"
IGS_NETS = S + "collections/golf-nets"
IGS_MATS = S + "collections/golf-mats"
IGS_BF = S + "collections/black-friday-golf-simulator-deals"
VICE_BF = "https://www.vicegolf.com/black-friday-deals"
VICE_BALLS = "https://www.vicegolf.com/collections/golf-balls"
GP_PUTTERS = "https://golfpartnerusa.com/collections/putters"
GP_SETS = "https://golfpartnerusa.com/collections/club-set"
BCP_GAMES = "https://bestchoiceproducts.com/collections/games"

def igs(sid, dest): return f"{IGS_EV}?sid=cgg-{sid}&url={q(dest)}"
def vice(sid, dest): return f"{VICE_EV}?sid=cgg-{sid}&url={q(dest)}"
def gp(sid, dest): return f"{GP}?subId1=cgg-{sid}&u={q(dest)}"
def bcp(sid, dest): return f"{BCP}?subId1=cgg-{sid}&u={q(dest)}"

def a(href, offer, label, cls="btn aff-btn"):
    return (f'<a class="{cls}" href="{html.escape(href, quote=True)}" rel="sponsored noopener" target="_blank" '
            f'data-offer="{offer}">{label}</a> <span class="aff-tag">Affiliate link</span>')

NOTE = ('<p class="aff-note">#ad: we may earn a commission if you buy through this link, at no extra cost to you. '
        '<a href="/offers/#disclosure">How this works</a>.</p>')

def box(title, body, links, label="Partner pick", key="nov15b-gear"):
    ctas = "".join(f'<p class="aff-cta">{l}</p>' for l in links)
    return (f'<aside class="aff-box" data-cgg="{key}"><p class="aff-label">#ad &middot; {label}</p>'
            f'<h3>{title}</h3><p>{body}</p>{ctas}{NOTE}</aside>\n')

# ------------------------------------------------------------- 1. retarget existing links
def esc(u): return html.escape(u, quote=True)
RETARGET = {  # old href (as in file, html-escaped) -> new href
    "https://www.dpbolvw.net/click-101511730-17315782?sid=cgg-gear-mats": igs("gear-mats", IGS_GREENS),
    "https://www.dpbolvw.net/click-101511730-17315782?sid=cgg-home-gear-pick": igs("home-gear-pick", IGS_GREENS),
    "https://www.dpbolvw.net/click-101511730-17315782?sid=cgg-indoor-mats": igs("indoor-mats", IGS_GREENS),
    "https://www.dpbolvw.net/click-101511730-17315782?sid=cgg-putting-games": igs("putting-games", IGS_GREENS),
    VICE_PERS + "?sid=cgg-bf-vice": vice("bf-vice", VICE_BF),
    VICE_PERS + "?sid=cgg-gift-live-vice": vice("gift-live-vice", VICE_BF),
    VICE_PERS + "?sid=cgg-gear-live-vice": vice("gear-live-vice", VICE_BF),
    VICE_PERS + "?sid=cgg-gift-guide-under50": vice("gift-guide-under50", VICE_BF),
    VICE_PERS + "?sid=cgg-game-wolf-gear": vice("game-wolf-gear", VICE_BF),
    VICE_PERS + "?sid=cgg-game-nassau-gear": vice("game-nassau-gear", VICE_BF),
    VICE_PERS + "?sid=cgg-gear-balls": vice("gear-balls", VICE_BALLS),
    VICE_PERS + "?sid=cgg-gear-pillar-balls": vice("gear-pillar-balls", VICE_BALLS),
}
VICE_NOTES = ["Our Vice link opens Vice's ball personalisation page; its Black Friday deals are in the main menu.",
              "Our Vice link opens Vice&#x27;s ball personalisation page; its Black Friday deals are in the main menu.",
              "Our Vice link opens Vice&#39;s ball personalisation page; its Black Friday deals are in the main menu."]

# ------------------------------------------------------------- 2. BCP boxes that over-claimed
OLD_BCP_BOX = re.compile(r'<aside class="aff-box" data-aff="best-choice-products">(?:(?!</aside>).)*?subId1=cgg-(backyard-cups|gear-kits|kids-home)"(?:(?!</aside>).)*?</aside>', re.S)
BCP_REPL = {
    "backyard-cups": box("Want a real green out back?",
        "Homemade cups are half the fun. If the backyard course becomes a habit, a proper putting and chipping green gives you one true "
        "surface to build around. The Indoor Golf Shop carries the Big Moss range, including an outdoor putting target green.",
        [a(igs("backyard-bigmoss", IGS_BIGMOSS), "indoor-golf-shop", "See Big Moss greens")]),
    "gear-kits": box("A green that lives outside",
        "If you want one hole that is always ready, Big Moss makes an outdoor putting target green. The Indoor Golf Shop sells it "
        "alongside the rest of the Big Moss range, so you can compare sizes.",
        [a(igs("gear-outdoor-green", IGS_OUTDOOR), "indoor-golf-shop", "See the outdoor target green")]),
    "kids-home": box("A rainy-day hole for the house",
        "When the garden is too wet, a roll-out putting green keeps the game going indoors. The Indoor Golf Shop lists indoor "
        "greens by size, so measure the room first.",
        [a(igs("kids-greens", IGS_GREENS), "indoor-golf-shop", "Compare indoor putting greens")]),
}

GEAR_YARD_OLD = re.compile(r"<h3>Backyard and kids' sets</h3><p>Portable cups, flags and kids' clubs turn a lawn into a course\. "
                           r"Look for an age range on the box and parts that pack away\.</p>(.*?)<a class=\"btn aff-btn\" href=\"[^\"]*subId1=cgg-gear-pillar-yard\"[^>]*>Browse backyard game sets</a>", re.S)
GEAR_YARD_NEW = ("<h3>Backyard putting greens</h3><p>A putting and chipping green turns part of a lawn or patio into a practice hole. "
                 "The Indoor Golf Shop carries the Big Moss range, including an outdoor putting target green.</p>\\1"
                 + a(igs("gear-pillar-yard", IGS_BIGMOSS), "indoor-golf-shop", "See Big Moss greens").replace(' <span class="aff-tag">Affiliate link</span>', ""))

GIFT_BCP_OLD = re.compile(r'<div class="gift-card">\s*<h3>Best Choice Products: backyard and kids\' game sets</h3>.*?</div>', re.S)
GIFT_BCP_NEW = ('<div class="gift-card" data-cgg="nov15b-gift-yard">   <h3>Big Moss putting greens at The Indoor Golf Shop</h3>   '
                '<p>For the family that already plays in the garden, a putting and chipping green gives them one true surface. '
                'The range includes an outdoor putting target green.</p>   <p class="aff-cta">'
                + a(igs("gift-guide-backyard", IGS_BIGMOSS), "indoor-golf-shop", "See Big Moss greens") + '</p> </div>'
                '<div class="gift-card" data-cgg="nov15b-gift-games">   <h3>Best Choice Products: game-room tables</h3>   '
                '<p>If the golfer also hosts game night, Best Choice Products sells air hockey, foosball and ping-pong tables, '
                'plus combo tables that do several.</p>   <p class="aff-cta">'
                + a(bcp("gift-guide-games", BCP_GAMES), "best-choice-products", "See game tables") + '</p> </div>')

# ------------------------------------------------------------- 3. new boxes
GP_BODY = ("GOLF Partner is a used-club shop that ships pre-owned clubs from Japan and grades each one by condition. "
           "It is a way to try a different putter head shape without paying new-club money.")
ARTICLE_BOXES = {
    "articles/beginner-trick-shots/index.html": box("A soft mat for the chip-in tricks",
        "The chip-in tricks above need a soft surface. The Indoor Golf Shop groups golf hitting mats by size and brand, and a net "
        "catches the ones that miss.",
        [a(igs("trick-mats", IGS_MATS), "indoor-golf-shop", "Compare golf mats"),
         a(igs("trick-nets", IGS_NETS), "indoor-golf-shop", "See golf nets", "btn btn-ghost aff-btn")]),
    "articles/designing-mini-golf-holes/index.html": box("Design around a true green",
        "Bumpers and ramps are easier to design when the putting surface rolls the same every time. The Indoor Golf Shop carries the "
        "Big Moss range of putting and chipping greens in several sizes.",
        [a(igs("design-bigmoss", IGS_BIGMOSS), "indoor-golf-shop", "See Big Moss greens")]),
    "articles/diy-mini-golf-obstacles/index.html": box("Put the obstacles on a proper surface",
        "Homemade obstacles work best on a smooth, even roll. An indoor putting green gives you that in a hallway or garage. "
        "The Indoor Golf Shop lists indoor greens by size.",
        [a(igs("diy-greens", IGS_GREENS), "indoor-golf-shop", "Compare indoor putting greens")]),
    "articles/mini-golf-date-night/index.html": box("A prize with both your names on it",
        "If the date night turns into a rematch, make the trophy a sleeve of golf balls. Vice Golf personalises balls, so the "
        "winner's name (or an inside joke) can go on them.",
        [a(f"{VICE_PERS}?sid=cgg-date-night-prize", "vice-golf", "Personalise Vice balls")]),
    "articles/mini-golf-party-games/index.html": box("After the last hole: game-room tables",
        "If the party moves indoors, a game table keeps it going. Best Choice Products sells air hockey, foosball and ping-pong "
        "tables, plus combo tables that do several.",
        [a(bcp("party-games-tables", BCP_GAMES), "best-choice-products", "See game tables")]),
    "articles/mini-golf-putting-tips/index.html": box("Practise these tips at home",
        "The tips above are easier to groove with a putting surface at home. The Indoor Golf Shop lists indoor putting greens by length; "
        "its holiday sale page is linked too.",
        [a(igs("putting-tips-greens", IGS_GREENS), "indoor-golf-shop", "Compare indoor putting greens"),
         a(igs("putting-tips-bf", IGS_BF), "indoor-golf-shop", "See the Black Friday deals", "btn btn-ghost aff-btn")]),
    "articles/mini-golf-rules-and-etiquette/index.html": box("Settle the gimme debate at home",
        "Most rule arguments start on short putts. A home putting green is the cheapest way to stop needing gimmes. "
        "The Indoor Golf Shop lists indoor greens by size.",
        [a(igs("rules-greens", IGS_GREENS), "indoor-golf-shop", "Compare indoor putting greens")]),
}
CASUAL_GP = box("Try a different putter for less", GP_BODY,
    [a(gp("gear-guide-putters", GP_PUTTERS), "golf-partner", "Browse pre-owned putters")], key="nov15b-gp")

def hub(title, body, links): return f'<div class="wrap" data-cgg="nov15b-hub" style="margin:48px auto">{box(title, body, links, key="nov15b-hubbox")}</div>\n'
BFL = '<a href="/black-friday-golf-deals-2026/">See every Black Friday golf deal we checked</a>.'
HUBS = {
    "games/index.html": hub("Prizes for the side games",
        "Side games work best when the stakes are golf balls, not cash. Vice Golf's Black Friday page is live, and Vice personalises "
        f"balls if you want the winner's name on the prize. {BFL}",
        [a(vice("games-hub-bf", VICE_BF), "vice-golf", "See Vice Black Friday deals"),
         a(f"{VICE_PERS}?sid=cgg-games-hub-personalise", "vice-golf", "Personalise Vice balls", "btn btn-ghost aff-btn")]),
    "get-better/index.html": hub("Gear for drills with a score",
        "Every drill here works with what you own. If you want to practise at home, these are the two things that help most: "
        f"a putting green for the ladder drills and a net for full swings. {BFL}",
        [a(igs("getbetter-hub-greens", IGS_GREENS), "indoor-golf-shop", "Compare indoor putting greens"),
         a(igs("getbetter-hub-nets", IGS_NETS), "indoor-golf-shop", "See golf nets", "btn btn-ghost aff-btn")]),
    "articles/index.html": hub("Partner picks for home golf",
        "The guides here need very little gear. When you do want some, these are the shops we link to: putting greens at The Indoor "
        f"Golf Shop and pre-owned putters at GOLF Partner. {BFL}",
        [a(igs("articles-hub-greens", IGS_GREENS), "indoor-golf-shop", "Compare indoor putting greens"),
         a(gp("articles-hub-putters", GP_PUTTERS), "golf-partner", "Browse pre-owned putters", "btn btn-ghost aff-btn")]),
    "clubhouse/index.html": hub("Black Friday sales already on",
        "Two of the golf shops we link to have their sales running now: Vice Golf's Black Friday page and The Indoor Golf Shop's "
        f"holiday sale. We list the prices we checked on our deals page. {BFL}",
        [a(vice("clubhouse-bf-vice", VICE_BF), "vice-golf", "See Vice Black Friday deals"),
         a(igs("clubhouse-bf-igs", IGS_BF), "indoor-golf-shop", "See The Indoor Golf Shop deals", "btn btn-ghost aff-btn")]),
}

GEAR_GP_PICK = ('<div class="pick" data-cgg="nov15b-gp"><figure class="ph r43"><img src="/images/photos/clubs-in-bag-800.webp" '
                'srcset="/images/photos/clubs-in-bag-800.webp 800w, /images/photos/clubs-in-bag-1600.webp 1600w" sizes="200px" width="800" '
                'height="533" alt="Irons standing in a golf bag" loading="lazy" decoding="async"></figure><div> <h3>Pre-owned clubs</h3>'
                f'<p>{GP_BODY}</p><p class="small"><strong>Good for:</strong> Trying a new putter or a starter set</p>'
                '<p class="aff-cta">' + a(gp("gear-pillar-putters", GP_PUTTERS), "golf-partner", "Browse pre-owned putters")
                + " " + a(gp("gear-pillar-sets", GP_SETS), "golf-partner", "See club sets", "btn btn-ghost aff-btn").replace(' <span class="aff-tag">Affiliate link</span>', "")
                + '</p></div></div> ')


VICE_DATES = [  # correction: on vicegolf.com/black-friday-deals gloves 3-for-2 is live; ball drops from 16 Nov; apparel from 21 Nov
    ("Vice lists 3-for-2 gloves from 16 November and new ball drops from 21 November.",
     "Vice lists 3-for-2 on all gloves (live now), new ball drops from 16 November and an apparel sale from 21 November."),
    ("lists more drops to come: 3-for-2 gloves from 16 November and new ball drops from 21 November.",
     "lists 3-for-2 on all gloves (live now) and more drops to come: new ball drops from 16 November and an apparel sale from 21 November."),
]


def process(rel, h):
    for old, new in VICE_DATES:
        h = h.replace(old, new)
    for old, new in RETARGET.items():
        h = h.replace(f'href="{esc(old)}"', f'href="{esc(new)}"')
    for n in VICE_NOTES:
        h = h.replace(f'<p class="small">{n}</p>', "")
        h = h.replace(f"<p>{n}</p>", "<p>This button goes straight to Vice's Black Friday deals page.</p>")
        h = h.replace(" " + n, "").replace(n, "")
    h = OLD_BCP_BOX.sub(lambda m: BCP_REPL[m.group(1)], h)
    if rel == "gear/index.html":
        h = GEAR_YARD_OLD.sub(GEAR_YARD_NEW, h)
        if 'data-cgg="nov15b-gp"' not in h:
            anchor = '<div class="pick"><figure class="ph r43"><img src="/images/photos/mini-windmill-800.webp"'
            assert anchor in h, "gear anchor"
            h = h.replace(anchor, GEAR_GP_PICK + anchor, 1)
    if rel == "offers/index.html":
        h = GIFT_BCP_OLD.sub(GIFT_BCP_NEW, h)
    if rel in ARTICLE_BOXES and 'data-cgg="nov15b-gear"' not in h:
        m = '<section class="faq"'
        assert m in h, rel
        h = h.replace(m, ARTICLE_BOXES[rel] + m, 1)
    if rel == "articles/casual-golfer-gear-guide/index.html" and 'data-cgg="nov15b-gp"' not in h:
        m = "<h2>Balls: brightness and purpose</h2>"
        assert m in h
        h = h.replace(m, CASUAL_GP + m, 1)
    if rel in HUBS and 'data-cgg="nov15b-hub"' not in h:
        assert h.count("</main>") == 1, rel
        h = h.replace("</main>", HUBS[rel] + "</main>", 1)
    return h


def main():
    changed = 0
    for p in sorted(ROOT.rglob("index.html")):
        rel = p.relative_to(ROOT).as_posix()
        if rel.startswith("preview/"):
            continue
        h = p.read_text()
        n = process(rel, h)
        if n != h:
            p.write_text(n); changed += 1
    # sanity: no merchant-homepage affiliate links left, no BCP golf claims
    for p in ROOT.rglob("index.html"):
        t = p.read_text()
        for bad in re.findall(r'href="(https://www\.dpbolvw\.net/click-101511730-17315782\?sid=[^"&]*)"', t):
            raise SystemExit(f"homepage IGS link left in {p}: {bad}")
        for bad in re.findall(r'href="(https://bestchoiceproducts\.sjv\.io/c/335485/2873487/33479\?subId1=[^"&]*)"', t):
            raise SystemExit(f"homepage BCP link left in {p}: {bad}")
    print("changed", changed)


if __name__ == "__main__":
    main()
