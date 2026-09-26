# RBV Volleyball — START HERE

> **FIRST FILE TO READ FOR ANY RBV WORK.**
>
> This is the compact operating brief for the RBV Volleyball website and its ChatGPT/Render control layer. Read this file before changing RBV code, content, deployment, DNS, calendars, or MCP tools.
>
> **History rule:** preserve prior entries. Add a new dated entry under **Change History** after every meaningful state change. Do not rewrite old history to make it look cleaner; correct it with a newer entry.

Last updated: 2026-09-15
Operational owner: Kyle / Marketing Apes
Primary day-to-day operator: Lindsay
Tenant boundary: **RBV ONLY**

---

## 1. What RBV is

RBV Volleyball is the website and information hub for Rancho Buena Vista High School Longhorn Volleyball.

Canonical public hostname:

- `https://rbvvolleyball.tonedntasty.com/`

Primary website functions:

- Home / announcements
- Varsity, JV, and Frosh schedule
- Forms and clearance resources
- Parent Playbook
- Team gallery
- Booster Club information
- Flyers / supporting resources
- Program sponsors

Public social identity currently referenced by the site:

- Instagram: `@rbvvolleyball`

Booster contact currently referenced by the site:

- `rbvvolleyballboosterclub@gmail.com`

---

## 2. Source-of-truth architecture

### Website source

GitHub repository:

- `marketingapes/domains`

RBV migration / operator branch:

- `feat/rbv-volleyball-render-migration-20260914`

Pinned website source directory:

- `rbvvolleyball/site/`

The files under `rbvvolleyball/site/` are the GitHub-pinned copy of the site that Render should serve. **Do not return to a build that fetches SiteGround as its source.**

### Website runtime

Render static service:

- Service name: `rbv-volleyball`
- Service ID: `srv-dak9enou01pc73eak6e0`
- Render URL: `https://rbv-volleyball.onrender.com`
- Repository: `marketingapes/domains`
- Branch: `feat/rbv-volleyball-render-migration-20260914`
- Publish path: `rbvvolleyball/site`
- Auto-deploy: ON

A GitHub commit to the pinned RBV site path should cause Render to redeploy automatically.

### ChatGPT / MCP control runtime

Render web service:

- Service name: `rbv-control`
- Service ID: `srv-dak8f3p42hec739kkmb0`
- Base URL: `https://rbv-control.onrender.com`
- MCP endpoint: `https://rbv-control.onrender.com/mcp`
- Health endpoint: `https://rbv-control.onrender.com/health`
- Source: `rbv-control/` in `marketingapes/domains`
- Branch: `feat/rbv-volleyball-render-migration-20260914`
- Auto-deploy: OFF; deploy deliberately after control-code changes

ChatGPT workspace app name:

- `RBV Volley Ball Website`

The app is intended to give Lindsay a simple conversational RBV-only operator surface.

---

## 3. Current operator model

Desired user experience:

**Lindsay -> ChatGPT RBV app -> RBV Control MCP -> GitHub RBV files -> Render deploy -> verified site**

Safe edit sequence:

1. Read the current page.
2. Prepare an exact proposed change.
3. Show a preview.
4. Ask Lindsay for explicit approval of that exact preview.
5. Publish only after approval.
6. Commit to GitHub.
7. Let Render auto-deploy the site.
8. Verify the Render result before claiming the public site is updated.
9. Add a history entry here for material changes.

Never claim a change is live merely because a tool call or GitHub commit succeeded.

---

## 4. RBV MCP tools

The control service currently defines these tools.

### Read tools

- `rbv_status`
- `rbv_list_pages`
- `rbv_list_gallery_assets`
- `rbv_upcoming_schedule`
- `rbv_draft_change_request`
- `rbv_get_page`

### Safe website edit tools

- `rbv_preview_text_change`
- `rbv_publish_text_change`

`rbv_publish_text_change` must require:

- an exact preview first;
- explicit user approval in the current conversation;
- `confirmation = PUBLISH`;
- the same GitHub base SHA used for the preview;
- a configured GitHub write credential in Render.

Current write credential environment variable name:

- `RBV_GITHUB_TOKEN`

**Never put the token value in GitHub, this file, chat, logs, screenshots, or Drive.** The token should be fine-grained, limited to `marketingapes/domains`, with only the repository permissions needed to update RBV content.

---

## 5. Site pages

Allowlisted RBV HTML pages currently known to the MCP:

- `index.html`
- `schedule.html`
- `forms.html`
- `parent-playbook.html`
- `gallery.html`
- `booster-club.html`
- `flyer.html`
- `request-changes.html`

Important shared assets include:

- `css/style.css`
- `js/main.js`
- `js/calendar-live.js`
- `js/schedule-config.js`
- `js/schedule-parser.js`
- `images/`
- `robots.txt`
- `sitemap.xml`

---

## 6. Schedule / calendar model

RBV has separate public Google Calendars for:

- Varsity
- JV
- Frosh

The RBV Control MCP currently reads upcoming events from the calendars using public ICS feeds.

Calendar IDs:

- Varsity: `2ff3b121ca7e7eb913a0cd42259e24a2b857eeafb3110033e1b54ebb6376814c@group.calendar.google.com`
- JV: `b0ff9fd02b1a009c367b418c3fe6858ff6b47ca81d4dcc2a26cc14dda091ff6d@group.calendar.google.com`
- Frosh: `db439e7e18e3d3ba95266d5870eae7e1d2b88ba982f58765c894a49ee2faee4e@group.calendar.google.com`

Current calendar write status:

- **READ ONLY through RBV Control.**
- Do not tell Lindsay that ChatGPT can change Google Calendar until authenticated calendar-write tooling is deliberately added and verified.

The site contains a static/baked schedule fallback so calendar/API failures should not blank the schedule page.

---

## 7. Gallery / image status

Known site image assets include team photos, RBV logo, flyers, and sponsor logos under `rbvvolleyball/site/images/`.

Current MCP image-edit status:

- It can list known image assets.
- Text-page publishing is being enabled through the safe GitHub flow.
- **Binary photo upload is a separate capability and must not be claimed until an RBV-specific upload tool is implemented and tested.**

Future target:

- `rbv.site.upload_photo`
- automatic safe filename handling
- gallery preview
- approval
- binary commit to GitHub
- Render deploy
- verification receipt

---

## 8. Production / DNS status rule

The new GitHub-backed Render site exists and is deployable independently of SiteGround.

Do not assume that means the canonical hostname is already cut over.

Before saying RBV is fully off SiteGround, verify all of the following:

- authoritative DNS / nameserver state;
- `rbvvolleyball.tonedntasty.com` target;
- Render custom-domain attachment;
- TLS certificate;
- homepage and important subpages;
- schedule behavior;
- GTM / measurement behavior;
- parent `tonedntasty.com` mail and sibling records remain healthy.

Do not decommission the old SiteGround copy until canonical production is verified and rollback is no longer needed.

---

## 9. Measurement / public-site details

Current site references Google Tag Manager container:

- `GTM-WTQSXG`

Canonical URLs inside the site use:

- `https://rbvvolleyball.tonedntasty.com/`

Do not casually change canonical URLs, GTM, robots, or sitemap during content edits.

---

## 10. Safety / tenant rules

RBV is a separate tenant/operator surface.

Hard rules:

- RBV tools must not expose or mutate TNT, NIL, BTL, DIHAC, LFMA, Marketing Apes, or other tenant data.
- Never expose raw secrets to ChatGPT or Lindsay.
- Keep website changes preview-first.
- Do not silently publish a materially different change than the approved preview.
- Re-read the source SHA before publish; if source changed since preview, block and preview again.
- Calendar writes require separate authorization.
- Social posting requires separate channel authorization.
- Binary image upload requires a tested binary-safe path.
- Preserve rollback through GitHub history.

---

## 11. Definition of "done" for an RBV website edit

An edit is complete only when all applicable checks pass:

- request understood;
- current source read;
- exact preview shown;
- operator approval received;
- GitHub write succeeded;
- commit SHA returned;
- Render deployed the commit;
- target URL verified;
- no obvious regression on affected page;
- history entry added for material changes.

If verification is missing, report the state as **committed / deploying / awaiting verification**, not "live."

---

## 12. First-test prompts for Lindsay

Read test:

> Use the RBV Volleyball app. What are the next RBV events and what pages can you access?

Safe-edit test:

> Read the homepage. I want to change one announcement. Show me the exact proposed change first and do not publish until I approve it.

After preview approval:

> Publish that exact preview.

If the control service reports publishing is not configured, check `RBV_GITHUB_TOKEN` on the `rbv-control` Render service. Never ask Lindsay to paste the token into ChatGPT.

---

## 13. Known unfinished capabilities

- Verify the current `RBV_GITHUB_TOKEN` configuration end to end with a harmless test edit.
- Verify canonical production DNS/custom-domain cutover before retiring SiteGround.
- Add binary-safe gallery/photo upload.
- Add authenticated Google Calendar writes if Lindsay wants conversational schedule editing.
- Add RBV social draft/publish tools only after provider access and guardrails are verified.
- Add stronger user authentication/authorization before expanding production-write capabilities beyond the current trusted workspace operator model.

---

# Change History

Append newest entries at the top of this section. Preserve prior entries.

## 2026-09-26 — Page updated: gallery.html

- Published approved page change.
- Content commit: `3f01b7bf2980f813409c3431482a7d66355cd4e1`.


## 2026-09-26 — Photo uploaded to RBV library

- Asset: `images/gio3238-rbv-defensive-ready-79536e8c6a19.jpg`.
- Content commit: `4c1645f8b3d4b2a891ba8e75143b2cb21e199d5e`.
- Photo is not automatically placed on a page or in the gallery.


## 2026-09-26 — Photo uploaded to RBV library

- Asset: `images/gio3138-rbv-serve-6844b746426c.jpg`.
- Content commit: `5b4be0fc5de77d47f006d859bac5a09516ef1cd4`.
- Photo is not automatically placed on a page or in the gallery.


## 2026-09-26 — Photo uploaded to RBV library

- Asset: `images/gio3126-rbv-double-block-85cb2b147b2b.jpg`.
- Content commit: `32ac1ad10b979da4fd18ad8ac37a60a1eb44a511`.
- Photo is not automatically placed on a page or in the gallery.


## 2026-09-26 — Photo uploaded to RBV library

- Asset: `images/gio3425-rbv-setter-e44f0247e63e.jpg`.
- Content commit: `9ecd35aa81122633f0ee3ea35cb44a9618e3d438`.
- Photo is not automatically placed on a page or in the gallery.


## 2026-09-26 — Photo uploaded to RBV library

- Asset: `images/gio3455-rbv-players-after-point-b11605f84c68.jpg`.
- Content commit: `2892dff70e54c242712692df21133f87aff5cd19`.
- Photo is not automatically placed on a page or in the gallery.


## 2026-09-26 — Photo uploaded to RBV library

- Asset: `images/gio3559-rbv-team-huddle-96ee43727af5.jpg`.
- Content commit: `03193d835a6a10918907e45150da81483797c259`.
- Photo is not automatically placed on a page or in the gallery.


## 2026-09-26 — Photo uploaded to RBV library

- Asset: `images/gio3542-rbv-block-at-net-6e24124146cc.jpg`.
- Content commit: `6d3bc9e252de75208f59cd13bfc3c8b4b169c20b`.
- Photo is not automatically placed on a page or in the gallery.


## 2026-09-26 — Photo uploaded to RBV library

- Asset: `images/gio3591-rbv-attack-at-net-4a8bf737b54f.jpg`.
- Content commit: `17dc52e3f193f6949a86e4331346bf4daa63093e`.
- Photo is not automatically placed on a page or in the gallery.


## 2026-09-26 — Page updated: gallery.html

- Published approved page change.
- Content commit: `6d4daf663c02b308450c149c9ab2748246ce0583`.


## 2026-09-26 — Photo uploaded to RBV library

- Asset: `images/rbv-2026-gallery-8039-659f502ae32b.jpg`.
- Content commit: `c61dcff5ddf234fb4eeb04d9106d0901bb0f36bc`.
- Photo is not automatically placed on a page or in the gallery.


## 2026-09-26 — Photo uploaded to RBV library

- Asset: `images/rbv-2026-gallery-7929-81058fc08f66.jpg`.
- Content commit: `43e2f2ea7ea12a3992c7fc430001064e4c060180`.
- Photo is not automatically placed on a page or in the gallery.


## 2026-09-26 — Photo uploaded to RBV library

- Asset: `images/rbv-2026-gallery-7928-0f17e3cdceb1.jpg`.
- Content commit: `ab8fbb1c33c737f9839eb0c1d0d65a9ea84fcf0d`.
- Photo is not automatically placed on a page or in the gallery.


## 2026-09-26 — Photo uploaded to RBV library

- Asset: `images/rbv-2026-gallery-7787-a7892f9799d7.jpg`.
- Content commit: `af191a06ba81ce50165b21042f3f5d25bf59035d`.
- Photo is not automatically placed on a page or in the gallery.


## 2026-09-26 — Photo uploaded to RBV library

- Asset: `images/rbv-2026-gallery-7786-65ce9a28d711.jpg`.
- Content commit: `abe2693eaa88714beb759a534bb0219e72bd1f09`.
- Photo is not automatically placed on a page or in the gallery.


## 2026-09-26 — Photo uploaded to RBV library

- Asset: `images/rbv-2026-gallery-7785-37ad3bb399e5.jpg`.
- Content commit: `9cd86038521cc2285330bbd4ab73a36f029576dd`.
- Photo is not automatically placed on a page or in the gallery.


## 2026-09-26 — Photo uploaded to RBV library

- Asset: `images/rbv-2026-gallery-7784-aaba762191fe.jpg`.
- Content commit: `4704a835dbbfb0363722f4bff72ca1f0b6d07e82`.
- Photo is not automatically placed on a page or in the gallery.


## 2026-09-26 — Photo uploaded to RBV library

- Asset: `images/rbv-2026-gallery-7783-586b700db2cd.jpg`.
- Content commit: `0b0eb90227d89d85ee6d57f53dae3eba8fcaae96`.
- Photo is not automatically placed on a page or in the gallery.


## 2026-09-26 — Photo uploaded to RBV library

- Asset: `images/rbv-2026-gallery-7782-c5b85a9cf69c.jpg`.
- Content commit: `16e96fd35f4bf703491028bcf1083da57a8b504d`.
- Photo is not automatically placed on a page or in the gallery.


## 2026-09-26 — Photo uploaded to RBV library

- Asset: `images/rbv-2026-gallery-7781-a3ee25362912.jpg`.
- Content commit: `8b78d8c2df13b69f129959cf23b21ac7618c1ebe`.
- Photo is not automatically placed on a page or in the gallery.


## 2026-09-26 — Page updated: gallery.html

- Published approved page change.
- Content commit: `8ac44f4b4a4e07ab1013d918e79260e83ab4ffde`.


## 2026-09-26 — Page updated: gallery.html

- Published approved page change.
- Content commit: `51d2ff3018595910fc27c3533229bd4492bd9352`.


## 2026-09-26 — Photo uploaded to RBV library

- Asset: `images/rbv-2026-gallery-8308-bf31fb8f6d14.jpg`.
- Content commit: `c8e3fc7c434d3349777cac172bec90747c59572f`.
- Photo is not automatically placed on a page or in the gallery.


## 2026-09-26 — Photo uploaded to RBV library

- Asset: `images/rbv-2026-gallery-8029-0569cc20e255.jpg`.
- Content commit: `1342b83e6107a4dca24ffd1e01c2544839200d60`.
- Photo is not automatically placed on a page or in the gallery.


## 2026-09-26 — Photo uploaded to RBV library

- Asset: `images/rbv-2026-gallery-7927-fdfdb85b7a9a.jpg`.
- Content commit: `fd9ce6286f8c14f6a5400ee13b1fa9b313943be7`.
- Photo is not automatically placed on a page or in the gallery.


## 2026-09-26 — Photo uploaded to RBV library

- Asset: `images/rbv-2026-gallery-7876-8e5ac7c5cc58.jpg`.
- Content commit: `7ce4b2609a31df93952262bb91f08ab58ebe4fb6`.
- Photo is not automatically placed on a page or in the gallery.


## 2026-09-26 — Photo uploaded to RBV library

- Asset: `images/rbv-2026-gallery-7840-1cc62c0ffe2a.jpg`.
- Content commit: `6f8fbbe1960ae85ab89973720d62f3ef3d40c22a`.
- Photo is not automatically placed on a page or in the gallery.


## 2026-09-26 — Photo uploaded to RBV library

- Asset: `images/rbv-2026-gallery-7837-6e25c5781afd.jpg`.
- Content commit: `3bc3ed993445a4150c7812acc7577cc524c05205`.
- Photo is not automatically placed on a page or in the gallery.


## 2026-09-26 — Photo uploaded to RBV library

- Asset: `images/rbv-2026-gallery-7846-baeba534fde9.jpg`.
- Content commit: `137ba838499b144f6e35243988dbd0385cc8e0af`.
- Photo is not automatically placed on a page or in the gallery.


## 2026-09-26 — Photo uploaded to RBV library

- Asset: `images/rbv-2026-gallery-7791-a708024f71bf.jpg`.
- Content commit: `cc2ff7ab443cb50bca99dd1e652c33d5183f128e`.
- Photo is not automatically placed on a page or in the gallery.


## 2026-09-26 — Photo uploaded to RBV library

- Asset: `images/rbv-2026-gallery-7789-9bd112d9b08f.jpg`.
- Content commit: `42e9fa814ceecd1fde9e689e63ebe2d53622203f`.
- Photo is not automatically placed on a page or in the gallery.


## 2026-09-26 — Photo uploaded to RBV library

- Asset: `images/rbv-2026-team-photo-7788-1146cdaab861.jpg`.
- Content commit: `2bbd55c883ee7f54887df10629ea968c5243ac8d`.
- Photo is not automatically placed on a page or in the gallery.


## 2026-09-26 — Page updated: index.html

- Published approved page change.
- Content commit: `5521fde0d720160410a26378dee0ece7ffd6b922`.


## 2026-09-26 — Photo uploaded to RBV library

- Asset: `images/avery-dayus-athlete-of-the-week-september-14-19-e7ab0a3f10cd.png`.
- Content commit: `78cb5cd282a0d757914db029a6326738bfe95409`.
- Photo is not automatically placed on a page or in the gallery.


## 2026-09-24 — Page updated: parent-playbook.html

- Published approved page change.
- Content commit: `6b12e344b2ed23f02bddb67bc27e696f411af0a8`.


## 2026-09-24 — Page updated: schedule.html

- Published approved page change.
- Content commit: `aae08c9e914893dc4287255a848d3e47470d569d`.


## 2026-09-23 — Page updated: index.html

- Published approved page change.
- Content commit: `79448802b596928588787d0badcde6a4e3b3dcee`.


## 2026-09-23 — Photo uploaded to RBV library

- Asset: `images/summer-raver-athlete-of-the-week-september-7-11-2ca8f591b3cf.png`.
- Content commit: `0ca2cc337892da71a7dd1e3b4965ba2d3ca122cf`.
- Photo is not automatically placed on a page or in the gallery.


## 2026-09-17 — Page updated: booster-club.html

- Published approved page change.
- Content commit: `ddb00db482637e3aea27932165feeeb844c593fd`.


## 2026-09-17 — Page updated: schedule.html

- Published approved page change.
- Content commit: `048c850acd5ceb8c91bf7b21e52c5e7ab1dc786d`.


## 2026-09-17 — Page updated: booster-club.html

- Published approved page change.
- Content commit: `60ca480ef1f79d1590368fbc4c7a6ae4587cfcba`.


## 2026-09-17 — Page updated: parent-playbook.html

- Published approved page change.
- Content commit: `5ed6c8c33e3a115f49687fa7174c433d79a91d07`.


## 2026-09-17 — Page updated: index.html

- Published approved page change.
- Content commit: `c94458c4b9f2c1fdd2de87799e55523697466558`.


## 2026-09-17 — Page updated: gallery.html

- Published approved page change.
- Content commit: `4fa2cb4bda0fe1791270b24f467240f6ae0b852d`.


## 2026-09-17 — Page updated: forms.html

- Published approved page change.
- Content commit: `7adb19e9e3b28ed4b2bb775a2ef5f22d764ef08a`.


## 2026-09-17 — Page updated: booster-club.html

- Published approved page change.
- Content commit: `e7a0371d9482e53d98880f7395ff98a987cb58ff`.


## 2026-09-17 — Page updated: schedule.html

- Published approved page change.
- Content commit: `c944975e126c892980ca0e7f73c5cfb60feddb1a`.


## 2026-09-17 — Page updated: gallery.html

- Published approved page change.
- Content commit: `6653c3ac7c8aa1041846e6bf765fafe29a44d83c`.


## 2026-09-17 — Page updated: parent-playbook.html

- Published approved page change.
- Content commit: `03e2593460db4cff31a879a9bf7280827294b0b5`.


## 2026-09-17 — Page updated: index.html

- Published approved page change.
- Content commit: `216e1d3d9f43e277fa5ed0df739c3847a14266a8`.


## 2026-09-17 — Page updated: forms.html

- Published approved page change.
- Content commit: `ab7d9d4527d0e9ba7f5f1356e26d9afb93ecaffd`.


## 2026-09-17 — Page updated: booster-club.html

- Published approved page change.
- Content commit: `b1ad2c67a4f8c5afea4a824fe092b454c548c663`.


## 2026-09-17 — Page updated: schedule.html

- Published approved page change.
- Content commit: `c2cf9ad3abe5968933840eceb74c09307a152c75`.


## 2026-09-17 — Page updated: parent-playbook.html

- Published approved page change.
- Content commit: `9b68980cc2c5d699449f1df7d6745a781910de69`.


## 2026-09-17 — Page updated: gallery.html

- Published approved page change.
- Content commit: `be8b4da92119a3075c0c712d96f654f9b0e3832a`.


## 2026-09-17 — Page updated: forms.html

- Published approved page change.
- Content commit: `80bb5a94ea1a3fce1a02ba69757c632129c6c9d0`.


## 2026-09-17 — Page updated: index.html

- Published approved page change.
- Content commit: `c4b83424ca5a03ce34572a3ea95b9c1fb2cd3462`.


## 2026-09-16 — Page updated: request-changes.html

- Published approved page change.
- Content commit: `11fec6125bc979c7d1ef523ef33f7b3e543feaff`.


## 2026-09-16 — Page updated: schedule.html

- Published approved page change.
- Content commit: `671601a7adfa9be77b4ccc19b2441b22ab3ec6c3`.


## 2026-09-16 — Page updated: index.html

- Published approved page change.
- Content commit: `057d6a21d001b683878c27769e4d5cc0bfd07cad`.


## 2026-09-16 — Page updated: parent-playbook.html

- Published approved page change.
- Content commit: `5dcc6ccdca61e883a49718fd836281228dd18d14`.


## 2026-09-16 — Page updated: forms.html

- Published approved page change.
- Content commit: `42cef0e705e4c2c9aed5f8b62550e0603b8c0407`.


## 2026-09-16 — Page updated: booster-club.html

- Published approved page change.
- Content commit: `5ab64ef9ae03936fa7f04b0b6be46f6e034e81c5`.


## 2026-09-16 — Page updated: schedule.html

- Published approved page change.
- Content commit: `66f5e423f43b081f02b568772c4e08e7b730a24d`.


## 2026-09-16 — Page updated: request-changes.html

- Published approved page change.
- Content commit: `00be084acf7fa7469e251ef40935c41a549bfe46`.


## 2026-09-16 — Page updated: parent-playbook.html

- Published approved page change.
- Content commit: `298a84fbf765eb0115becbfee134068741e17607`.


## 2026-09-16 — Page updated: booster-club.html

- Published approved page change.
- Content commit: `2fde37edf9f9f2572c7fdcf900aaa39494bad67c`.


## 2026-09-16 — Page updated: index.html

- Published approved page change.
- Content commit: `c352e0864cb7b3855eeca2ab423e03041cc3b6f4`.


## 2026-09-16 — Page updated: forms.html

- Published approved page change.
- Content commit: `b6b9d37c0fa33c10cd71d8ef85d593c3716b3840`.


## 2026-09-16 — Photo uploaded to RBV library

- Asset: `images/rbv-top-background-96956910bfe1.jpg`.
- Content commit: `63f994bcbf17fff7b84034353fca02be91ed6dff`.
- Photo is not automatically placed on a page or in the gallery.


## 2026-09-15 — Photo uploaded to RBV library

- Asset: `images/rbv-homepage-team-timeout-6223101901f4.jpg`.
- Content commit: `6680e1d3b1d4de3c6a4e6f81ce9614ad9a70de7b`.
- Photo is not automatically placed on a page or in the gallery.


## 2026-09-15 — Page updated: index.html

- Published approved page change.
- Content commit: `9077a49827e588c99296dd2078b55b4ccb2dc646`.


## 2026-09-15 — Photo uploaded to RBV library

- Asset: `images/amiyah-nieto-athlete-of-the-week-september-week--76bf1298c88c.png`.
- Content commit: `561d65ebf504ed912ed579865bf301246b14c7b0`.
- Photo is not automatically placed on a page or in the gallery.


## 2026-09-15 — Page updated: booster-club.html

- Published approved page change.
- Content commit: `0dc89f414c3cd6631c4c1fccfdd1c200f453b281`.


## 2026-09-15 — Page updated: booster-club.html

- Published approved page change.
- Content commit: `ec743847c68a93d15397a73b077e027e10c45b1f`.


## 2026-09-15 — Page updated: gallery.html

- Published approved page change.
- Content commit: `19c045347dfad6c26cb30ddf6282240c3e6cc7e0`.


## 2026-09-15 — Photo uploaded to RBV library

- Asset: `images/rbv-glow-practice-group-two-162f62be4a41.jpg`.
- Content commit: `f352dde548e9cd60110ae355200604f8ed0dc2f6`.
- Photo is not automatically placed on a page or in the gallery.


## 2026-09-15 — Photo uploaded to RBV library

- Asset: `images/rbv-glow-practice-group-one-775fcee887a8.jpg`.
- Content commit: `2b539f8bb28a7e09d2d26f0d0ebf8b85247af62c`.
- Photo is not automatically placed on a page or in the gallery.


## 2026-09-15 — Photo uploaded to RBV library

- Asset: `images/rbv-team-selfie-8b078e99ce51.jpg`.
- Content commit: `d40787e477eabaa775b65ca2fff1d3206f0a97b0`.
- Photo is not automatically placed on a page or in the gallery.


## 2026-09-15 — Photo uploaded to RBV library

- Asset: `images/rbv-senior-banners-8b2646986f0f.jpg`.
- Content commit: `8c39c0b38f850d19f8855335cf83d9561cdfacbf`.
- Photo is not automatically placed on a page or in the gallery.


## 2026-09-15 — Photo uploaded to RBV library

- Asset: `images/rbv-vs-lcc-volleyball-action-43d934139544.jpg`.
- Content commit: `ee4ddf646cf14fb238299ccc17f8b541c312299f`.
- Photo is not automatically placed on a page or in the gallery.


## 2026-09-15 — Photo uploaded to RBV library

- Asset: `images/rbv-vs-lcc-jump-serve-71fd02b92c0c.jpg`.
- Content commit: `4228c0321d79dba7d5bcd9619cc86f423501d757`.
- Photo is not automatically placed on a page or in the gallery.


## 2026-09-15 — Photo uploaded to RBV library

- Asset: `images/rbv-vs-lcc-attack-at-net-dce425dd9ab8.jpg`.
- Content commit: `303c0d42da61a4ef87d9cbca2dcd1c141d9d5545`.
- Photo is not automatically placed on a page or in the gallery.


## 2026-09-15 — Page updated: booster-club.html

- Published approved page change.
- Content commit: `13540391a6cb2a963f7e50c60a1412eecce3ea58`.


## 2026-09-15 — Photo uploaded to RBV library

- Asset: `images/rbv-vs-lcc-team-celebration-f935cae25ed7.jpg`.
- Content commit: `ca971353d117a059bdab8004d00122f6560d6959`.
- Photo is not automatically placed on a page or in the gallery.


## 2026-09-15 — Page updated: index.html

- Published approved page change.
- Content commit: `2496791d103b37960613a2425bafde5c5e1d2876`.


## 2026-09-15 — Page updated: booster-club.html

- Published approved page change.
- Content commit: `faf81f4f60407ff0d8a99aa7ab86dc92e0ed098f`.


## 2026-09-15 — Page updated: booster-club.html

- Published approved page change.
- Content commit: `c9899a89d07dbd53cc20b5b8e481b8c5dd6bf840`.


## 2026-09-15 — Photo uploaded to RBV library

- Asset: `images/mackenzie-ambacher-fundraiser-winner-5dd8fa865b4e.png`.
- Content commit: `72cd0334a4751faddf5090ad2d3dbbc1436319b8`.
- Photo is not automatically placed on a page or in the gallery.


## 2026-09-15 — First-read operating brief created

- Created `rbvvolleyball/00-START-HERE.md` as the first file future RBV operators should read.
- Defined the RBV source-of-truth architecture, tenant boundary, safe edit flow, verification standard, known limitations, and append-only history rule.
- No public website content changed by creation of this file.

## 2026-09-15 — Safe operator control deployed

- RBV Control code advanced from read-only tools to a preview-and-approved-publish model.
- Added `rbv_get_page`, `rbv_preview_text_change`, and `rbv_publish_text_change` in control code.
- Render `rbv-control` deployed commit `848eca92c9e5b4ebd95cccc5a7efbade04042619` successfully.
- Publishing remains dependent on a correctly configured `RBV_GITHUB_TOKEN`; secret value is intentionally not recorded here.

## 2026-09-15 — GitHub-pinned website source established

- Current site snapshot was pinned under `rbvvolleyball/site/` in GitHub.
- Snapshot commit: `3ac3780a650c86ba4275d12eb0f97033fdaa23aa`.
- Added `rbvvolleyball/PINNED-SHA256.txt` for pinned-file hashes.
- Created GitHub-backed Render static service `rbv-volleyball`.
- Initial GitHub-backed Render deploy reached `live` state.
- This removed SiteGround as a required build-time source for the new Render site.

## 2026-09-14 — RBV Control MCP first connected to ChatGPT

- Created `rbv-control` Render service.
- MCP endpoint: `https://rbv-control.onrender.com/mcp`.
- Initial app used no authentication for a safe read-only test.
- ChatGPT discovered the RBV tool set successfully.
- Initial scope was deliberately read-only / draft-only.

## 2026-09-14 — RBV Render migration staging established

- Created dedicated RBV staging service on Render from `marketingapes/domains`.
- Verified a successful staging deployment.
- At this stage, the migration build still fetched the SiteGround origin; this was later replaced by the GitHub-pinned source model described above.

---

## Update this file

When a meaningful RBV state changes, add a dated history entry containing:

- what changed;
- whether production changed;
- GitHub commit SHA when applicable;
- Render deploy/service evidence when applicable;
- verification performed;
- remaining blocker or next dependency.

This file is a **current operating brief plus append-only history**, not a substitute for Git history, Render logs, provider truth, or receipts.