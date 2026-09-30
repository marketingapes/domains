# Phillips 5-lane — imagery + Paraquat-parity spec (v2, 2026-09-29, Kyle feedback)

Kyle: "way more imagery… I like the look and feel from the Paraquat… unique and new. The Sofia page
just switch the tort. The quiz: pre-qual, then the original qualifying questions and contact form."

## Page parity with Paraquat (btl/paraquat/)

| Page | Must mirror | Lane change |
|---|---|---|
| Landing `index.html` | `btl/paraquat/index.html` section-for-section: photo hero (bg image + scrim, like `paraquat-field-usda-nrcs*.jpg`), Sofia card containing the dropdown qualifier + contact form (qualifier.js pattern), context cards (`.ctx`) — **photos instead of SVG line drawings**, a second info section (`.sx` analogue), how-it-works steps, FAQ, footer | lane copy, lane questions, lane photos |
| Quiz `quiz/index.html` | `btl/paraquat/quiz/index.html`: hero → quiz card: **pre-qual** questions one at a time with the Sofia line (prequal.js pattern) → **result/summary step** → **contact step** (form + call) → context cards → how → FAQ | lane pre-qual + qualifying questions |
| Talk to Sofia | `btl/paraquat/talk-to-sofia/index.html` **as-is**, tort switched | lane name/copy only |

Survivor-lane rules from BUILD-SPEC still apply on every step (no "what happened", Prefer not to say, RAINN).
Tracking/phone/disclaimer contract from BUILD-SPEC unchanged. Do not POST anywhere.

## Image slots (same names in every lane)

BTL: `btl/assets/lanes/<slug>/` · NIL: `nil/assets/lanes/<slug>/` (NIL never references btl/assets).

| File | Size | Use |
|---|---|---|
| `hero.jpg` | 1600×900 | landing + quiz hero background (desktop) |
| `hero-900.jpg` | 900×1200 | hero background (mobile, `image-set`/media query like Paraquat) |
| `card-1.jpg` `card-2.jpg` `card-3.jpg` | 800×600 | three context cards |
| `band.jpg` | 1600×700 | full-bleed photo band between sections |
| NIL only: `nil/assets/sofia/sofia-nil-portrait.jpg` | 440×784 | NIL Sofia portrait (distinct from BTL's) |

Placeholders are generated first (brand-colored gradients) so pages render; Leonardo images replace
them in place at the same paths.

## Art direction (Leonardo, per lane)

- **All:** photoreal, natural light, warm, calm, dignified; no text, logos, car badges, or visible injuries;
  no one in distress; no menace (no dark car interiors at night, no bars/cells as the focal point).
- **BTL** (Paraquat palette): warm paper/cream light, golden hour, soft focus.
- **NIL:** cool navy dusk + teal accents, clean and modern.
- **nil-mva-pi:** calm intersection at dusk with headlights bokeh; a person on the phone beside a car at a
  roadside (unhurt, composed); highway at blue hour; physical therapy session (hopeful).
- **btl-sex-abuse-la-county:** Los Angeles skyline at sunrise; an adult sitting by a sunlit window with tea
  (back/side view); quiet courthouse steps in California light; open journal on a table.
- **btl-sex-abuse-ca-womens-prisons:** Central Valley California fields at dawn; a woman walking on an open
  road toward sunrise (from behind); hands around a coffee mug by a window; California courthouse columns.
- **btl/nil-rideshare-sex-abuse:** city street in daylight with a phone showing a generic map (no app
  branding); a woman on a bright city sidewalk (from behind, confident); a calm apartment window at
  morning; supportive conversation between two women (faces soft/averted). Same subjects for both lanes,
  **generated separately** and graded to each brand's palette (BTL warm / NIL cool).
