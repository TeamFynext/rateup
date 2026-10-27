# AI Agent Instructions for rateup-docs

This is the RateUp user documentation site. This file explains **how the docs are written**, **where
they currently stand**, and **how to continue them** without regressing the work already done.

Read this before editing any `.mdx` file.

---

## 1. The One Rule

**Document what the code does, not what you assume it does.**

Every page in this site was written by reading the actual implementation in the sibling repos:

| Repo | Path | Use it for |
|------|------|-----------|
| `rateup-ui` | `src/routes/` | Which routes exist — the definitive list |
| `rateup-ui` | `src/components/Layout/Navbar/hooks.tsx` | The real sidebar: section names, order, feature gates |
| `rateup-ui` | `src/components/**` | Button labels, field names, validation messages, empty states |
| `rateup-ui` | `src/config/announcements.ts` | **What changed, and when.** The in-app "What's new" list — start here for a docs-refresh pass |
| `rateup-api` | `src/modules/**`, `src/external/{shared,v1,v2}/**` | Endpoints, payloads, retry behaviour, error strings |

`announcements.ts` is the product's own changelog: every user-visible change ships an entry with a
date. Diff it against the last docs commit to find what the docs have not caught up with yet.

Before writing about a feature, grep its labels out of the source:

```bash
cd rateup-ui/src
grep -rhoE 't\("[^"]{3,45}"\)|"[A-Z][A-Za-z /&-]{4,40}"' components/dashboard/<feature>/ \
  | sort -u | head -40
```

Quoting the app's exact strings — *"No campaigns found"*, *"Verify and Save"* — is what makes the
docs findable and trustworthy. Invented labels are worse than no docs.

**Never document a route that is commented out.** Several exist (`/dashboard/landingPages`,
campaign participants in the external API, loyalty Coupons). They were deliberately excluded.
**Meta AI Agent is no longer one of them** — `/dashboard/meta-agent` and its eight sub-routes are
live in `hooks.tsx`, gated on `TeamFeature.AiChatbot`, and are documented in `meta-agent/`.

**"Ticket" means two different things and only one of them survives.** An *inbox ticket* is a
customer conversation and is very much alive (`TicketPanel.tsx`, `CloseTicketMenu.tsx`, the whole
`inbox/` section). *Ticket boards* — the kanban feature — were removed from the product. Never
reintroduce a page about boards, a **Ticket** chatbot node, survey auto-ticket creation, or a flow
**Enable Ticketing** setting: none of them exist in the code any more.

---

## 2. Structure

```
src/content/docs/
├── meta.json              # root nav order — every section listed here
├── index.mdx              # docs home
├── external-api.mdx       # top-level single page
└── <section>/
    ├── meta.json          # page order within the section
    ├── index.mdx          # section overview
    └── <page>.mdx
```

- **One section per app sidebar entry.** The docs mirror the product's navigation, in the same order.
- **Every folder needs a `meta.json`.** A page missing from it still builds but is unordered in nav.
  To keep a page reachable while hiding it from the sidebar, prefix its name with `!` — fumadocs reads
  `!name` as an exclude, so the route and every inbound link keep working while the nav drops the entry.
  `"..."` is the matching rest marker if you ever want to list only a few pages explicitly.
- **Every section needs an `index.mdx`** — an overview with `<Cards>` linking to its pages.
- `baseUrl` is `/`, so `src/content/docs/inbox/tickets.mdx` → `/inbox/tickets`.

---

## 3. Page Anatomy

Every page follows the same shape:

```mdx
---
title: "Short Noun Phrase"
description: One sentence saying what the page is for. Shown in search and cards.
---

import { Step, Steps } from "fumadocs-ui/components/steps";
import ImagePlaceholder from "@/components/ImagePlaceholder";

One or two sentences: what this is and why it matters. No throat-clearing.

<ImagePlaceholder ... />

---

## Task-Shaped Heading

<Steps>...</Steps>

## Reference Table

| Thing | Meaning |
|-------|---------|

<Callout type="warn">The trap.</Callout>

---

## Troubleshooting

| Symptom | Cause | Fix |

---

## Related Pages

- [Next thing](/section/page)
```

**Rules:**

- Procedures are `<Steps>`, never numbered prose.
- Reference material is a **table**, not a bullet list.
- Every page ends with **Related Pages**. Never "What's Next?" — that was the old style.
- Use `---` between major sections.
- Headings are task-shaped (*"Assign a Ticket to Yourself"*), not label-shaped (*"Assignment"*).

---

## 4. Components

**Global — no import needed** (from `fumadocs-ui/mdx`):

| Component | Use |
|-----------|-----|
| `<Callout type="info" \| "warn">` | Notes and traps |
| `<Cards>` / `<Card title href description>` | Section overviews, navigation |

**Must be imported:**

```mdx
import { Step, Steps } from "fumadocs-ui/components/steps";
import { Accordion, Accordions } from "fumadocs-ui/components/accordion";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
```

**Local components:**

```mdx
import ScreenShot from "@/components/Screenshot";       // a real, uploaded screenshot
import ImagePlaceholder from "@/components/ImagePlaceholder";  // a screenshot still to be taken
```

Put all imports **at the top**, directly after the frontmatter.

---

## 5. Screenshots

Captured screenshots are committed to `public/docs/screenshots/` and referenced with a
root-relative path:

```mdx
<ScreenShot src="/docs/screenshots/inbox/view-open.png" alt="Unassigned tickets in the New view" />
```

For a shot that has **not** been taken, use the placeholder instead of a broken image. It renders a
labelled dashed frame:

```mdx
<ImagePlaceholder
  file="inbox/ticket-row-annotated.png"
  shot="A single conversation-list row, zoomed, with callouts on: star, ticket number, status pill, mention chip, assignee avatar."
  caption="Anatomy of a ticket row."
/>

{/* TODO: capture a zoomed, annotated single row */}
```

- `file` — where the image will live under `public/docs/screenshots/`
- `shot` — precise instructions for whoever takes it
- Always pair it with a `{/* TODO: … */}` comment

**Screenshots are served from the CDN by default.** `<ScreenShot>` prefixes
`VITE_CLOUDFRONT_WEB_IMAGES_URL` to whatever `src` it is given, so a shot has to be uploaded to the
bucket before its page can render it. A shot captured but **not yet uploaded** carries `local`
(`<ScreenShot local src="/docs/screenshots/…" />`) and is served from
`public/docs/screenshots/…` — same path, so publishing it is: upload the file to the CDN at that
path, then drop `local`. A file dropped anywhere else in `public/` will not be found.

All 159 references (141 distinct files) use `/docs/screenshots/…`, grouped by section subfolder
(e.g. `/docs/screenshots/pipelines/pipeline-board.png`), and **all are on the CDN — none are
`local`** (the 84 shots of 2026-10-16, and the seven automation/campaign re-captures of that evening,
were uploaded the same day and their `local` flags removed). The seven template-wizard shots of 2026-10-27 (`whatsapp/template-*.png`) were uploaded the same day too. `public/` holds only `favicon.png`.

§8 step 3 checks shots against the CDN (it skips `local` ones). The 20 shots of the 2026-10-26 refresh are on
the CDN. The last placeholder, `authentication/signup-step2.png`, was captured and uploaded on 2026-10-26,
so no placeholders remain — see §10 **2026-10-26 refresh shots**.

**A screenshot that shows a control which no longer exists is worse than no screenshot.** When a
change removes or renames something visible in a captured shot: swap the `<ScreenShot>` back to an
`<ImagePlaceholder>` with a `{/* TODO: re-capture — … */}` saying what changed, **delete the stale
file** so nothing can re-reference it, and list it in §10.

Captures are automated and **redacted**: customer names, phone numbers, emails and message bodies
are swapped for consistent fake data *before* the screenshot is taken, and avatar photos are
blurred. The `pipeline/` shots were redacted *after* capture instead, by repainting the names and
avatar initials — see the fake-name table below. Prefer seeding fake data and re-shooting; patching
pixels works but has to be redone from scratch every time the screen is re-captured.

The names those shots now use, so a re-capture can stay consistent:

| Shown as | Avatar |
|----------|--------|
| John Doe | JD |
| Jane Roe | JR |
| MARIA G | MG |
| SAM PATEL RIVERA | SP |
| PRIYA.S.K | P |
| ALEX MORGAN | AM |
| Chris Lee | CL |
| alexdemo | A |
| demo test user | DT |
| `15550100142` (the unnamed contact) | ? | Avatar initials are regenerated to match the fake names. If you re-capture, reuse that
pipeline — never publish a raw screenshot of the running app.

---

## 6. Voice

Written for the person using RateUp, not for the person who built it.

- **British English.** "Organisation", "personalise", "colour".
- **Second person.** "Click **Close**", not "the user clicks Close".
- **Bold for UI text** the reader must find on screen: **Assign to me**, **Verify and Save**.
- **Backticks for code**, field names in payloads, headers, paths.
- **Concrete over abstract.** *"A message of only letters is rejected"* beats *"passwords must be
  complex"*.
- **No marketing.** No "powerful", "seamless", "robust".

### Callouts earn their place

A `warn` callout should mark something that **costs the reader real time or damage** — closing
clears assignees, regenerating an API key breaks live integrations, a 4xx makes a webhook drop the
payload permanently. If it is merely useful, make it a sentence.

Where the docs can save someone from a genuine mistake, say so plainly. Examples already in the
site:

- Asking an unhappy customer for a public Google review
- Expiring loyalty points without warning notifications first
- Auto-closing tickets a customer just wrote in about
- Treating an unsigned webhook payload as trusted input

---

## 7. MDX Gotchas

| Gotcha | Fix |
|--------|-----|
| `{{1}}` breaks the build — MDX parses `{…}` as JS | Wrap in backticks: `` `{{1}}` `` |
| Relative links (`./page`, `../section/page`) resolve wrongly | **Always use absolute paths**: `/section/page` |
| A stray `<` or `>` in prose | Wrap in backticks |
| Imports below content | Move them to the top |

---

## 8. Verify Before You Finish

```bash
# 1. Build must pass (prints "✓ built" three times)
npm run build

# 2. Every internal link must resolve
cd src/content/docs && grep -rhoE "\]\((/|\.)[^)#]*" . | sed 's/](//;s/#.*//' | sort -u \
  | while read -r u; do p="${u#/}"; [ -f "$p.mdx" ] || [ -f "$p/index.mdx" ] || echo "BROKEN $u"; done

# 3. Every screenshot resolves on the CDN (a `local` one must exist under public/ instead)
CDN=$(grep -h '^VITE_CLOUDFRONT_WEB_IMAGES_URL=' .env | cut -d= -f2)
grep -rhoE '<ScreenShot[^>]*src="/docs/screenshots/[^"]*"' src/content/docs \
  | grep -v ' local ' | grep -oE '/docs/screenshots/[^"]*' | sort -u \
  | while read -r f; do c=$(curl -s -o /dev/null -w '%{http_code}' "$CDN$f"); [ "$c" = 200 ] || echo "$c $f"; done

# 4. Every section has a meta.json and appears in the root meta.json
```

A build failure naming a `.mdx` file with "Could not parse expression with acorn" is almost always
an unescaped `{{ }}`.

---

## 9. Where We Are Now

**146 pages across 17 sections + 2 top-level pages** (as of 2026-10-26 — the refresh against
`origin/main` that covered every announcement from 2026-10-16 to 2026-10-19: Commerce rebuild,
Features, Messenger tabs, Instagram comment-to-buy, sign-up redesign). Every section maps 1:1 to an app sidebar
entry. Build clean.

Each of the three WhatsApp builders now has a **detail page** alongside its list page — the pattern
to follow whenever a feature's real work happens on a `$id` route: the list page covers creating and
managing, the detail page covers the editor itself.

| Section | Pages | Covers |
|---------|-------|--------|
| `getting-started` | 5 | Register (account, then `/signup/business` after email verification: store, required WhatsApp business number, goals — the goals set the starting features), setup guide (`setup-guide`, `/dashboard/setup`: four bands incl. **Start with your features**, Mark done / Skip / Hide setup guide), login (**Keep me signed in** is not wired up — the page says so), reset password |
| `inbox` | 24 | Tickets, 8 views, one-owner assignment (picker, **A** shortcut, team round-robin), replying (incl. the Meta AI handover pill), WhatsApp voice calls (`whatsapp-calls`), private notes, closing, ticket details, filters, tags & labels, settings (3 tabs: Automation, Conversation tags, Quick replies with attachments) |
| `analytics` | 8 | The five sidebar views: Overview, Conversations (Agents → `agent-performance`, Teams → `team-performance`, plus their drill-down pages), Messages (`message-analytics`), Logs (Message logs → `message-logs`, Team activity → `team-activity`, the audit log), and Calls (`calls`, live strip + call log + call analytics). Slugs kept from the old six-tab layout so inbound links survive |
| `contacts` | 6 | Managing (incl. background import with progress, summary, limits and the update-mode warning), groups (**Add existing** / **New contact** / **Import**), labels, lifecycle, custom fields. **Lifecycle is hidden from the nav** (`"!lifecycle"` in `contacts/meta.json`), mirroring the app — the app dropped **Contacts → Lifecycle** from its sidebar when Pipeline took over. The route, the page and every inbound link still work; the inbox filter rail, the **Lifecycle Updated** trigger and the Zoho/Zapier mappings still read a lifecycle, so do not delete it |
| `campaign` | 4 | Overview, list and statuses; the 6-step wizard incl. test send and credits (the Template step's message preview is the **Device Preview** panel since 2026-10-16); campaign page tabs (Overview, Participants, Analytics) and exports; pausing, resuming (3 options), auto-pause banners, automatic and manual retries (`pausing-and-retrying`) |
| `whatsapp` | 9 | Flows (purpose-first create wizard, flow cards) + flow editor (incl. *"Fix this before saving to WhatsApp"* validation), chatbots + chatbot builder, templates (step-by-step wizard since 2026-10-27: Meta's library / RateUp starters / scratch, library **Details** step, **Customize the wording**) + template editor (per-step fields), conversational components, settings (incl. per-number **Calling** tab under Settings → Channels). There is no WhatsApp → Catalog or WhatsApp → Settings route any more: `/dashboard/whatsapp/catalog` redirects to Commerce → Catalogs, and `whatsapp/settings.mdx` is a concept page pointing at Channels |
| `instagram` | 4 | Overview (standalone connect, the six tabs, which tabs need **Sync with Meta**), chatbots (creation wizard + 10 examples, Instagram components, reply/24h continuation, Follow Check, comment private-reply limits), comments & story mentions (public replies, lives, post scope), ice breakers / menu / ig.me links (link names, open stats, QR download), **comment-to-buy** in `automations` (**Send products to buy**: direct checkout only for one product with one sellable option, otherwise the storefront; **Limited drop** is one unit per person, sold-out reply, lapsed checkouts free units; Comment to buy / Live drop templates). All Instagram tools except chatbots belong to the account in the page's selector; a chatbot is account-less and the rule picks the account |
| `messenger` | 5 | Overview (connect a Facebook Page on its own; the four tabs **Chatbots / Comments / m.me Links / Welcome & Menu**; Page selector), chatbots (wizard + 7 examples, Messenger components, ways to start one), `comments` (**Facebook Page Comment** rules: private reply first, label/assign after, public replies, no post picker, 7-day window; needs the `feed` / `pages_manage_engagement` permissions), `m-me-links` (**m.me Link Opened**, link names, **Any link**, QR, no open counts; **new visitors start the rule only via Get Started**), `welcome-menu` (Get Started, greeting, ice breakers, persistent menu; saves straight to Meta, no sync; each tap sends a keyword that a **Message Received** rule answers — **no chatbot picker**, despite the announcement). Comments, links and Welcome & Menu belong to the selected Page; chatbots are Page-less. The editor is `/dashboard/messenger/flowbots/$flowbotId` |
| `meta-agent` | 9 | Mirrors the app's step names: Setup guide (`overview`), Knowledge, Skills, Rich replies (`ui-skills`), Connectors incl. the built-in RateUp connector, Test (`operate`), Go live (`settings`: rollout, handoff message, inbox handover, allowlist, usage caps), Insights. URLs keep the route slugs, titles use the sidebar labels from `metaAgent.nav.ts` |
| `automation` | 6 | The step-by-step builder (`creating-a-rule`: Template → Trigger → Conditions → Actions → Review since the 2026-10-16 rebuild; one rule on several channels; the **Device Preview** panel; the per-platform **Share** tab, where only WhatsApp pre-fills the keyword), triggers per platform incl. Shopify/WooCommerce events, ig.me links, Messenger **Facebook Page Comment** / **m.me Link Opened** and WhatsApp **Came From a Click-to-WhatsApp Ad**, conditions, actions incl. template variable mapping and **Send products to buy** (WhatsApp catalog cards / Instagram link; not Messenger), Shopify abandoned-cart reminders + the Shopify **Results** tab (`abandoned-cart-reminders`) |
| `commerce` | 11 | Mirrors the 2026-10-18 rebuild's sidebar (Setup · Overview · Products · Orders · Coupons · Settings): `setup` (checklist; steps differ for Shopify/WooCommerce checkout), `overview` (KPIs, messaging cost vs revenue, click-to-WhatsApp ads, needs attention), `products` (editor, import Meta/Shopify/WooCommerce/CSV, bulk edit, duplicate, sync chips), `orders` (tabs incl. Needs action, order page, shipping/EasyPost, returns, invoices), `coupons`, `settings` (tab map + Delivery, Store → Connect Your Meta Catalog, Customer messages), `payments` = **Getting paid** tab (Stripe/Razorpay, WhatsApp Pay, COD, bank transfer + 72 h expiry, invoices), `checkout-settings` = **Checkout** tab (where customers pay, checkout in chat, cart reminders), `storefront` (public `/s/<slug>`, product links, SEO/sitemap, WhatsApp number confirmation), `catalogs` = **Legacy Catalog Tools** (old Meta-catalog page and catalog cart orders, reached from Settings → Legacy catalog). Old slugs kept; `/dashboard/commerce/payments` redirects to Settings → Getting paid |
| `loyalty` | 19 (13 in nav + 6 hidden) | Setup wizard (`onboarding`), Overview (`dashboard`), Cashier (`cashier-portal`), Customers, Program (profile, earning rules, tiers), Rewards (per-tier, bonuses), Activity (ledger + approvals), Messages (automatic, replies, chatbot, templates), Reminders, Feedback (survey, Google review, review reward), Materials (brochure, QR card), Settings. `earning-rules`, `transactions`, `approvals`, `commands`, `notifications`, `templates` are hidden pages (`!name`) pointing to their new homes, so old links keep working |
| `web-forms` | 9 | Creating, question types, logic, design, settings (response webhook — signed, queued; no notification email any more), sharing, results (redrawn Analytics: Happiness Index, NPS Overview, Team Analytics; Excel/ODS/Google Sheet export), automations |
| `pipeline` | 11 | Board types (Leads / Support / Projects / Custom), board, leads, list, forecast, insights, stages, import & export, automatic leads, settings. Only the **Leads** board is wired to the inbox, automations, contacts and CRM syncs; Forecast, probability, lost reasons, source/company and CAPI are Leads-only (`pipelineTypes.ts`) |
| `testimonials` | 1 | Collections, styling, embedding |
| `qr-studio` | 3 | **QR & Links** (renamed from QR Studio, 2026-09-23): QR codes, link pages. The folder and the `qr-creator` / `access-links` slugs were kept so inbound links survive; titles and nav (`meta.json` `title`) use the new names. The app routes are `/dashboard/qr-codes` and `/dashboard/link-pages` |
| `settings` | 10 | Account, **Members & Roles** (`users.mdx` — the URL stayed `/settings/users`; the app route is `/dashboard/settings/members`, `/users` redirects there), teams, notifications, channels (incl. calling, standalone Messenger/Instagram), integrations (API keys manager + usage, signed org webhook and its events, **WooCommerce** connection + the WordPress.org plugin), security, billing (active contacts + campaign credits), `features` (route `/dashboard/features`, opened from the rail's grid icon, not from Settings; org-wide; turning a feature off only hides it — data and automations keep running). **There is no per-team feature setting any more**: Features is org-wide, abilities are per role, Channel Access is per team |
| `external-api.mdx` | 1 | Partner API **v2** (`/api/external/v2`, `rk_live_`/`rk_test_` keys, no org id) as the main surface: keys & feature access, error envelope + code list, cursor paging, optional `Idempotency-Key`, digits-only phones (country code, no `+`, like v1), rate limits, every v2 endpoint with examples; a **v1 (legacy)** section; a v1 → v2 field-by-field migration table. Source: `rateup-api/src/external/{shared,v1,v2}`, `src/modules/apiAccessToken`, `src/authz/apiKeyFeatures.ts`, `src/plugins/swagger.ts` |

### Deleted on purpose — do not recreate

| Removed | Why |
|---------|-----|
| `menu/` | No `dashboard/menu` route exists anywhere in the app |
| `landingpage.mdx` | Route does not exist; nav entry is commented out |
| `whatsapp-survey/` | Legacy duplicate of whatsapp/, inbox/, campaign/, contacts/ |
| `whatsapp/logs.mdx` | No WhatsApp → Logs route; covered by `analytics/message-logs` |
| `apidoc/` | Folded into `external-api.mdx` and `settings/integrations` |
| `profile-settings/`, `teams/` | Consolidated into `settings/` |
| `contacts/all-contacts/`, `contacts/groups/` | Flattened into `contacts/` |
| `web-survey/`, `advanced-features/` | Merged into `web-forms/` |
| `loyality/` | Renamed to `loyalty/` (spelling) |
| `tickets/` | **Ticket boards were retired from the product** (announcement `2026-08-29-ticket-boards-retired`). No `/dashboard/tickets` route, no `modules/ticket` on the API, no **Tickets** row in a team's Feature Access. Replaced by `pipeline/`. Inbox *tickets* — conversations — are unrelated and stay |

If a section looks "missing", check this table before adding it back.

### Renamed URLs

`loyality/*` → `/loyalty/*` and `web-survey/*` → `/web-forms/*`. If those old URLs are linked
externally, they need redirects — **this has not been done.**

---

## 10. Outstanding Work

| Item | Notes |
|------|-------|
| **2026-10-26 refresh shots** | **20 captured and uploaded to the CDN on 2026-10-26 (no longer `local`)**: `commerce/{overview,overview-stats,message-cost,products,import-products,orders,order-detail,coupons,setup,settings-store,payments,checkout-settings,storefront}.png`, `messenger/{overview,comment-automations,m-me-links,welcome-menu}.png`, `instagram/comment-to-buy.png`, `settings/features.png`, `getting-started/setup-guide.png`. The commerce/messenger ones overwrote the stale CDN files of the same name. Captured in Brave from the local dev build (rateup-ui `alen/comerce-update`, 2 commits ahead of `main`) against demo data answered to the page's **GET** requests in the browser; every non-GET request was redirected to a local stub, so nothing reached the API. Demo business **Demo Cafe** (USD), §5 names, `+1 312-555-01xx` numbers, Unsplash product photos, avatars blurred, user shown as John Doe. 1440 wide; tall pages captured at their full height (up to 1864 px), the storefront at 390×1560 @2x. `settings/features` has no **Not on your plan** badge (the dev org's plan includes everything). `authentication/signup-step2.png` was captured later on 2026-10-26 with puppeteer-core driving Brave against the local dev build: a fake SuperTokens `sFrontToken` cookie (session + `st-ev: true`) passes the route's client-side guards, `GET /user/info` is answered in the browser with a John Doe user whose `profileCompleted` is `false`, and every other API call is stubbed, so nothing reached the API. Form filled with **Demo Cafe**, `+1 312 555 0142`, `https://democafe.example.com`, Hospitality, 6–25; TanStack devtools hidden; 1440×900. Uploaded to the CDN the same day; no longer `local`. `authentication/register.png` and `authentication/login.png` predate the redesigned auth screens — re-check |
| **Template wizard shots (2026-10-27)** — uploaded to the CDN the same day, no longer `local` | The template editor became a step-by-step wizard with Meta's template library (rateup-ui/rateup-api branch `feat/template-library-wizard`, announcement `2026-10-27-template-wizard-meta-library`). `whatsapp/templates.mdx` and `template-editor.mdx` were rewritten for it, and seven new shots: `whatsapp/{template-start-library,template-start-starters,template-setup,template-library-details,template-review,template-message,template-buttons}.png`. Captured in Brave from the local dev build against the real library (nothing saved or submitted). Redacted in the browser: org → **Demo Cafe**, number → **Main line** / `+1 312-555-0142`, user → **John Doe**, avatars blurred; samples **Jane** / `COFFEE20`, links on `democafe.example.com`. The Start/Setup shots are 1440×800 CSS px, the rest 1440×1000 so the step fits without scrolling. `whatsapp/template-editor.png` on the CDN shows the old one-page form and is no longer referenced — delete it. `whatsapp/templates-list.png` is still accurate (only the **Create Templates** picker dialog went away) |
| **`pipeline/` shots need a re-shoot** | Board types and import/export (2026-09-25/27) changed the screen. **Swapped to placeholders** because they showed removed UI: `pipelines/pipelines-overview.png` (sidebar **Teams** section), `pipelines/pipelines-board.png` (team chip on cards), `pipelines/pipelines-lead.png` (old drawer with Team / Lead age / Idle / Labels). Delete those three from the CDN. The overview, board, lead, new-board and import shots were captured and uploaded on 2026-10-16. **Still live but stale**: `pipelines-lists.png` (team name under assignees), `pipelines-forcast.png`, `pipelines-insights.png`, `pipelines-settings.png` (header lacks Export/Import; settings switch is now **Flag stalled cards**), `pipelines-stages.png` — each page carries a `TODO(shot)`. `pipeline-settings.png` stops at the **Teams** heading, and its title was repainted from **Sales** to **Default Pipeline**; a fresh capture with the §5 fake names replaces all of the patching |
| **`qr-studio/` shots replaced** | The 2026-09-23 redesign removed every screen the old shots showed. `qr-studio/qr-list.png`, `qr-editor.png` and `access-links-list.png` were replaced by `qr-studio/qr-codes-list.png`, `qr-code-detail.png` and `link-page-editor.png` (captured and uploaded 2026-10-16); delete the old three from the CDN |
| **Pipeline expected close is read-only** | No dashboard control sets `expectedCloseAt` on a Leads card (only the import's **Expected close** column and the API). Documented as such in `pipeline/forecast.mdx` and `leads.mdx`; re-check if the lead window gains a date picker |
| **Screenshots** | No placeholders remain and none are `local` (`authentication/signup-step2.png` was the last, uploaded 2026-10-26); see **2026-10-26 refresh shots**. `meta-agent/overview.png` on the CDN showed the pre-setup-guide Overview and is no longer referenced — delete it |
| **Last 9 shots — mock-data captures** | Captured 2026-10-16 and uploaded to the CDN the same day: `automation/shopify-results`, `campaign/resume-dialog`, `commerce/catalog-settings`, `inbox/incoming-call`, `instagram/ig-me-links`, `loyalty/feedback`, `messenger/trigger-prompt`, `whatsapp/chatbot-trigger-prompt`, `web-forms/webhook-settings`. The dev org has none of this data, so each was shot against the real components with demo data answered to their **GET** requests in the browser (nothing saved, no write reached the API; the incoming call came from a mocked `GET /api/wa/calls/ringing` poll, not Meta). Demo business "Demo Cafe", §5 names, 555 numbers. `automation/shopify-results` is 1440×1150 rather than 1440×900 so the per-day chart fits; the inbox behind `inbox/incoming-call` was repainted with the §5 names. Re-shoot any of them from real data when an org has it |
| **`whatsapp/catalogs.mdx` was deleted — resolved 2026-10-16** | Not restored: `/dashboard/whatsapp/catalog` now redirects to `/dashboard/commerce/catalogs`, so the four links were repointed to `/commerce/catalogs`. Since the 2026-10-26 refresh that page is **Legacy Catalog Tools**; connecting a catalog lives at `/commerce/settings#connect-your-meta-catalog`, and the old anchor `#connect-a-catalog-to-your-whatsapp-account` is kept. `public/docs/screenshots/whatsapp/catalog.png` is orphaned — delete it from the CDN |
| **`settings/` + External API shots (2026-10-16 pass)** | New, captured and uploaded 2026-10-16: `settings/api-key-create` (external-api), `settings/api-service` (integrations), `settings/members-list`, `settings/members-roles`, `settings/member-page`, `settings/notifications`, `settings/team-page`, `settings/billing`, `settings/channels`, `settings/channel-edit-tabs`, `settings/channel-profile-tab`. The members, member and team shots show a 2-member dev org, so they lack the Customised / Paused / Invited states their pages describe — re-shoot on a fuller org. Swapped out as stale — **delete from the CDN**: `settings/api-access-key.png` (single-key **Generate Api Key** panel), `settings/users.png` (old Users page), `settings/teams.png` (pre-Members/Channels/Details tabs), `settings/billing.png`, `settings/channels.png`. `settings/webhook-integration.png` was re-captured and uploaded on 2026-10-16 against the rebuilt Webhook page (a demo endpoint injected in the browser, nothing saved). `settings/integrations.png` was kept but predates the API-keys manager — re-shoot when convenient |
| **Automation builder shots (2026-10-16 rebuild)** | Re-captured 2026-10-16 against the new builder and uploaded to the CDN the same evening (no longer `local`): `automation/rule-wizard.png`, `automation/trigger-select.png`, `automation/conditions.png`, `automation/actions.png`, `automation/abandoned-cart-rule.png` (these overwrote the old Basics/When/If/Then shots of the same name on the CDN), plus two new shots `automation/template-gallery.png` and `campaign/template-step.png`. Captured in Brave at 1440×900 (the template gallery is 1440×750) from a new, never-saved rule and an existing draft campaign whose template was picked but not saved. Redacted in the browser before capture: org and Page name → **Demo Cafe**, Instagram handle → **democafe**, WhatsApp numbers → **Main line** / **Support line**, team → **Support**, label → **Refund**, campaign → **Weekend offer**, user → §5 **John Doe**, avatars blurred. The Instagram, Messenger and ig.me entry points now open the builder on **Template**; the docs tell readers to click **Start from scratch** to keep the preset trigger |
| **Stale captures to re-shoot** | `inbox/close-menu` (the menu no longer lists "Mark as Spam"; spam and block sit below a separator) and `inbox/toolbar-annotated` (the advanced-filters icon is gone). Both files were **deleted**; the pages carry `ImagePlaceholder`s with the shot instructions. `inbox/mark-as-spam` has been re-shot against the new menu. `inbox/staff-team-filters` and `inbox/layout-annotated` still work but predate the sidebar's **Channel** section |
| **Old-URL redirects** | For the two renamed sections |
| **Mostly written from source** | Pages are written from the code. The 2026-10-16 screenshot pass drove the running app for every captured shot, which is the only visual check so far; behaviour beyond what a shot shows is still unverified |
| **Stale CDN files to delete (2026-10-16 pass)** | No longer referenced by any page: `loyalty/{dashboard,dashboard-stats,earning-rules,transactions,approvals,cashier-portal,commands,notifications,templates}.png`, `campaign/detail.png`, `contacts/contact_groups_page.png`, `analytics/quick-stats.png`, `inbox/auto-close-rules.png`, `whatsapp/catalog.png`, `meta-agent/overview.png`, `qr-studio/{qr-list,qr-editor,access-links-list}.png`, `settings/{api-access-key,users,teams}.png`. Files whose name was reused by a new local shot (e.g. `loyalty/customers.png`, `settings/billing.png`, `instagram/overview.png`, the `pipelines/` and `analytics/` shots) were overwritten by the 2026-10-16 upload |

### Known accuracy caveats

- **Commerce → Settings → Checkout persists** (**Save changes**) since the rebuild; the old
  **Abandoned cart recovery** card is gone.
- **Commerce → Settings → Customer messages switches do not all work.** The API
  (`recovery.service.ts`) never reads `.enabled` for Payment reminder, Cart reminder or Back in stock
  — those rows only pick the template. **Confirm a cash order** has no effect: Confirm/Cancel ride on
  **Order placed**, so turning Order placed off while confirmation is required gets cash orders
  auto-cancelled. Documented as-is with a warn callout; re-check when fixed.
- **Messaging cost vs revenue** gives each campaign a row, but all automations and flows share one
  **Automations and flows** row (the announcement says per automation).
- **Store checkout (Shopify/WooCommerce)** is offered only when products were imported with
  **Keep in sync**; RateUp-owned products are then hidden from sale.
- **External API keys are org-wide but feature-limited.** Since the multi-key work
  (announcement `2026-10-16-multiple-api-keys`) a key is **Full access** or limited to features
  (`API_KEY_FEATURES` in `rateup-api/src/authz/apiKeyFeatures.ts`), enforced on v1 and v2 by
  `requireScope` (`403 insufficient_scope`). Keys are still **not** limited by team or channel, and
  a Full-access key reaches the whole organisation. A test key is refused only on `config.paid`
  routes (template sends, campaign send, loyalty card send). If the feature list changes, update
  the table in `external-api.mdx#keys-and-access` and the picker list in `settings/integrations.mdx`.
- **The organisation webhook is signed and retried** — every delivery (including the old
  `message_status`) carries `X-Rateup-Timestamp` (unix seconds, per attempt) and
  `X-Rateup-Signature-256: t=<ts>,v1=<hex HMAC-SHA256 of "<ts>.<raw body>">`, keyed with the
  whole `whsec_…` string as-is (`signWebhookPayload` / `verifyRateupSignature` in
  `webhook.service.ts`; the test vector in `settings/integrations.mdx#verify-the-signature` is the
  same one `webhook.test.ts` checks). The legacy `X-Rateup-Signature` (base64 HMAC of the body
  alone) is still sent and documented as deprecated, with `X-Rateup-Triggered-At` and
  `X-Webhook-Id`. The survey response webhook (`web-forms/settings.mdx`) gets the same headers,
  keyed with its Client Secret. There is **one webhook per org, configured in the dashboard — it is
  not tied to API keys**; a per-API-key webhook was built and removed on 2026-10-16, do not
  document one. Deliveries are tried 5 times with exponential backoff, 4xx
  included (`webhook.service.ts`, `OUTGOING_WEBHOOK_JOB_OPTIONS`). The settings page (rebuilt 2026-10-16) shows the
  real check — `GET <url>?challenge=<verify token>`, answered with the token within 5 seconds — so
  the UI and the docs now agree. Events are edited locally and saved with **Save events**; a
  WhatsApp Flow fires both `survey.response.created` and `flow.response.created`. Points expiry and programme resets emit no `loyalty.points.*` events.
- **The browsable API reference (`/reference`) is served only when the API runs with
  `SWAGGER=1`.** The OpenAPI JSON at `/api/external/{v1,v2}/openapi.json` is always served. The
  docs link both; if `api.rateup.app/reference` is not live in production, drop that link.
- **Spam is a flag on the contact** (`Contact.isSpam`), not a ticket status — `SPAM` survives in the
  enums only as a thread *event* label and for pre-migration rows. The Spam tab is the one
  contact-grained list in the Inbox: one row per contact, and its badge counts contacts. Spam
  contacts are excluded from every other tab, **including All**. Documented in
  `inbox/inboxview/spam.mdx`; do not describe spam as a close outcome anywhere.
- **Team → Channel Access is visibility, not authorisation.** `wa_channel_access.ts` scopes what the
  dashboard shows; the endpoints stay open to any authenticated member, and External API keys are
  not limited by team or channel. Team-less users and org owners see every channel, and membership of several teams takes
  the *union*. Documented that way in `settings/teams.mdx`.
- **Any RateUp send takes a conversation off Meta AI** — a staff reply, an automation, a campaign or
  an API send (`MetaAgentThreadBadge.tsx` reason labels; `metaAgent.threadOwner.ts`). Documented as a
  warning in `meta-agent/settings.mdx`. The **Insights → Conversation turns** field also accepts *"a
  conversation ID from the test console"*, but the Test card never displays that id, so the docs
  leave it out until it does.
- **Message deletion is reported only on WhatsApp Business app / coexistence numbers.** The revoke
  webhook flags `WaMessage.deletedAt` and the body is kept but withheld from the thread, the list
  preview and chat exports. On a Cloud API-only number nothing arrives. See
  `inbox/responding-to-conversation.mdx`.

---

## 11. Adding Docs for a New Feature

<!-- prettier-ignore -->
1. **Find the route** in `rateup-ui/src/routes/` and its entry in `Navbar/hooks.tsx`.
2. **Read the components** and grep out the real labels, validation messages and empty states.
3. **Check the API** in `rateup-api/src/modules/` for anything with a payload, limit or failure mode.
4. **Decide placement** — a page in an existing section, or a new section if it is a new sidebar entry.
5. **Write it** using the anatomy in §3.
6. **Wire it up** — add to the section's `meta.json`, and the root `meta.json` if it is a new section.
7. **Cross-link it** — from the section index, the docs home if significant, and any page a reader would arrive from.
8. **Add `ImagePlaceholder`s** with precise `shot` instructions.
9. **Verify** with §8.

---

## Build & Run

```bash
npm run dev     # local dev server
npm run build   # production build — must pass before committing
npm run start   # serve the built output
```

Stack: TanStack Start + fumadocs (`fumadocs-core`, `fumadocs-mdx`, `fumadocs-ui`), Vite, Tailwind v4.
Content is discovered by glob, so new files need no registration beyond `meta.json`.
