"""Clone the BTL SSDI A pages (/ssdi/) into Glassman-branded copies at /glassman/ssdi/.
Usage: python3 glassman.py <repo>/btl"""
import os, re, sys

BTL = sys.argv[1]
SRC, DST = os.path.join(BTL, 'ssdi'), os.path.join(BTL, 'glassman', 'ssdi')
FIRM = 'Jeffrey Glassman Injury Lawyers'
PRIV, DISC = 'https://www.jeffreysglassman.com/privacy-policy.html', 'https://www.jeffreysglassman.com/disclaimer.html'
LOGO = '/glassman-ssdi/img/logo.svg'

def rd(p): return open(os.path.join(SRC, p), encoding='utf-8').read()
def wr(p, s):
    out = os.path.join(DST, p); os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, 'w', encoding='utf-8').write(s)

def sub(s, old, new, count=None, must=True):
    if must and old not in s: raise SystemExit('missing: ' + old[:90])
    return s.replace(old, new) if count is None else s.replace(old, new, count)

def paths(s):
    s = s.replace('/assets/ssdi/', '\0A\0').replace('/ssdi/', '/glassman/ssdi/').replace('\0A\0', '/assets/ssdi/')
    s = s.replace('/glassman/ssdi/states.js', '/ssdi/states.js')
    for k in ('quiz', 'sofia', 'form'):  # door cards use Glassman's own ad creatives, not the BTL ones
        s = s.replace('/assets/ssdi/ads/ssdi-%s-1080x1080.jpg' % k, '/glassman-ssdi/img/ad-%s.jpg' % k)
    return s

FOOT_NAV = ('<a href="/glassman/ssdi/">Request a callback</a><a href="/glassman/ssdi/quiz/">Eligibility check</a>'
            '<a href="/glassman/ssdi/talk-to-sofia/">Talk to Sofia</a><a href="%s">Privacy Policy</a><a href="%s">Disclaimer</a>'
            '<a href="https://www.jeffreysglassman.com/">jeffreysglassman.com</a>' % (PRIV, DISC))
FOOT_P = ('<p><strong>ATTORNEY ADVERTISING.</strong> ' + FIRM + ' · One International Place, Suite 1810, Boston, MA 02110 · '
          '<a href="tel:+16177777777">(617) 777-7777</a>. This page is not legal advice, and using it does not create an attorney-client '
          'relationship; that requires the firm’s acceptance and a written agreement. Sofia is an AI intake assistant, not a person and not an '
          'attorney; she cannot determine legal eligibility. Voice conversations are recorded and processed by our AI voice provider for quality, '
          'compliance and follow-up. Not affiliated with the Social Security Administration; you may apply for benefits directly with SSA at no cost, '
          'and benefits decisions are made by the SSA. No review, representation, benefit approval or outcome is guaranteed. Prior results do not '
          'guarantee a similar outcome. Not available in California or Colorado. © 2026 ' + FIRM + '</p>')

def page(rel, pid_old, pid_new):
    s = paths(rd(rel))
    s = re.sub(r'— Best Tort Lawyers</title>', '— ' + FIRM + '</title>', s)
    s = s.replace('besttortlawyers.com/glassman/ssdi/', 'besttortlawyers.com/glassman/ssdi/')
    s = sub(s, '<meta name="robots" content="noindex,follow">', '<meta name="robots" content="noindex,nofollow">')
    s = sub(s, 'content="BTL-SSDI-001"', 'content="GLASSMAN-SSDI-002"')
    s = s.replace(pid_old, pid_new)
    s = s.replace(' Best Tort Lawyers is not a law firm.', ' ' + FIRM + ', Boston.')
    s = s.replace('Best Tort Lawyers is not a law firm. Sofia is AI.', 'Attorney advertising. Sofia is AI.')
    s = s.replace('Not a law firm. No legal advice.', 'Attorney advertising. Free consultation.')
    s = s.replace('Best Tort Lawyers’ AI intake assistant', 'the AI intake assistant at ' + FIRM)
    s = s.replace('a free SSDI review by a participating law firm', 'a free SSDI review by ' + FIRM)
    s = sub(s, '<link rel="icon" href="/assets/btl-seal.svg" type="image/svg+xml">', '<link rel="icon" href="%s" type="image/svg+xml">' % LOGO)
    s = re.sub(r'<!-- data-sofia-tel:.*?-->', '<!-- data-sofia-tel: Glassman\'s Sofia line in E.164 (Vapi phone d9e1cabe "DEMO Sofia — Glassman SSDI", assistant 32e90752).\n     Empty hides every "Talk to Sofia" call link. -->', s, flags=re.S)
    s = sub(s, 'data-sofia-tel="+12029329700"', 'data-sofia-tel="+16692099040"')
    s = s.replace('(202) 932-9700', '(669) 209-9040')
    s = sub(s, '<span><b>Free to check.</b> <span class="hide-s">Not the government. Never sold.</span></span>',
            '<span><b>No fee unless we win.</b> <span class="hide-s">Free consultation. Not the government.</span></span>')
    s = re.sub(r'<a class="brand" href="/" aria-label="Best Tort Lawyers home">.*?</a>',
               '<a class="brand gl" href="/glassman/ssdi/" aria-label="%s, SSDI home"><img src="%s" width="240" height="52" alt="%s"></a>' % (FIRM, LOGO, FIRM), s)
    s = s.replace('an AI assistant with Best Tort Lawyers', 'an AI assistant with ' + FIRM)
    s = s.replace('a disability intake team', 'our disability team').replace('the disability intake team', 'our disability team')
    s = re.sub(r'<nav aria-label="Footer">.*?</nav>', lambda m: '<nav aria-label="Footer">' + FOOT_NAV + '</nav>', s, flags=re.S)
    s = re.sub(r'<p><strong>ATTORNEY ADVERTISING\.</strong>.*?</p>', lambda m: FOOT_P, s, flags=re.S)
    s = re.sub(r'/\* BTL-SSDI-001 live wiring', '/* GLASSMAN-SSDI-002 live wiring', s)
    s = re.sub(r'\?v=2026102\d[a-z]', '?v=20261028g', s)
    return s

main = page('index.html', 'btl-ssdi-main-form', 'glassman-ssdi-main-form')
main = sub(main, '<meta name="description" content="Out of work for a year or more because of your health? Request a free call about Social Security Disability. Sofia, our AI intake assistant, calls you at a time that works. Best Tort Lawyers is not a law firm.">',
           '<meta name="description" content="Out of work for a year or more because of your health? Request a free call about Social Security Disability from ' + FIRM + '. Sofia, our AI intake assistant, calls you at a time that works.">', must=False)
main = sub(main, '<details><summary>Is this the government?</summary><p>No. Best Tort Lawyers is a private service and is not connected to the Social Security Administration.',
           '<details><summary>Is this the government?</summary><p>No. ' + FIRM + ' is a private law firm and is not connected to the Social Security Administration.')
main = re.sub(r'<details><summary>Is Best Tort Lawyers a law firm\?</summary><p>.*?</p></details>',
              '<details><summary>Who reviews my situation?</summary><p>The disability team at ' + FIRM + ', One International Place, Boston. Using this page doesn’t make us your lawyer; that happens only if the firm accepts your case and you sign an agreement.</p></details>', main)
main = re.sub(r'<details><summary>Where does my information go\?</summary><p>.*?</p></details>',
              '<details><summary>Where does my information go?</summary><p>To ' + FIRM + ' and the service providers that help us call you back. It is not sold.</p></details>', main)
wr('index.html', main)
wr('talk-to-sofia/index.html', page('talk-to-sofia/index.html', 'btl-ssdi-call-first', 'glassman-ssdi-call-first'))
wr('quiz/index.html', page('quiz/index.html', 'btl-ssdi-quiz', 'glassman-ssdi-quiz'))

def tag(s, pid=None):
    s = s.replace("'BTL-SSDI-001'", "'GLASSMAN-SSDI-002'").replace("tenant_id: 'btl'", "tenant_id: 'glassman'")
    if pid: s = s.replace("'btl-ssdi-quiz'", "'glassman-ssdi-quiz'")
    return paths(s).replace('BTL-SSDI-001', 'GLASSMAN-SSDI-002')

css = rd('pages.css')
css = sub(css, '--navy:#1d3a57;--deep:#0f2338;--blue:#1d6fa0;--blue-ink:#155a85;--gold:#e8a90c;--gold-ink:#9c6a00;',
          '--navy:#264861;--deep:#122b3e;--blue:#1a78a1;--blue-ink:#14607f;--gold:#edaa00;--gold-ink:#a56f00;')
css = css.replace('29,58,87', '38,72,97').replace('15,35,56', '18,43,62')
css = '/* Glassman copy of /ssdi/pages.css: same layout, colors from jeffreysglassman.com. */\n' + css + \
      '\n.brand.gl img{width:min(240px,52vw);height:auto}\n'
wr('pages.css', css)
wr('pages.js', tag(rd('pages.js')))
wr('quiz/quiz.js', tag(rd('quiz/quiz.js'), pid=True))

crit = tag(rd('criteria.js'))
crit = sub(crit, "you may qualify for a free review by a participating law firm. ", "you may qualify for a free review by our disability team. ")
crit = sub(crit, "connect you with the firm’s team.", "connect you with our disability team.")
crit = crit.replace("version: 'btl-ssdi-001-criteria-2026-10-27'", "version: 'glassman-ssdi-002-criteria-2026-10-28'")
crit = '/* Glassman copy: same rules as /ssdi/criteria.js until the firm gives its own criteria. */\n' + crit
wr('criteria.js', crit)

it = tag(rd('intake.js'))
it = it.replace("var TENANT = 'btl'; /* the buyer's firm is never named on the site */", "var TENANT = 'glassman';")
it = sub(it, 'Best Tort Lawyers, including Sofia, its AI voice assistant, and a participating law firm may call you', FIRM + ', including Sofia, its AI voice assistant, may call you')
it = sub(it, 'Best Tort Lawyers, including Sofia, its AI voice assistant, and a participating law firm may call me', FIRM + ', including Sofia, its AI voice assistant, may call me')
it = it.replace('<a href="/privacy-policy/">Privacy Policy</a> and <a href="/terms-and-conditions/">Terms</a>', '<a href="%s">Privacy Policy</a> and <a href="%s">Disclaimer</a>' % (PRIV, DISC))
it = it.replace("'btl-ssdi-001-consent-clickwrap-2026-10-28'", "'glassman-ssdi-002-consent-clickwrap-2026-10-28'").replace("'btl-ssdi-001-consent-2026-10-27'", "'glassman-ssdi-002-consent-2026-10-28'")
it = it.replace("'btl-ssdi-unknown'", "'glassman-ssdi-unknown'")
wr('intake.js', it)
print('ok')
