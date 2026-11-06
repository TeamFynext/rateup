# rateup-docs

This is the RateUp user documentation site. This file explains **how the docs are written**, **where
they currently stand**, and **how to continue them** without regressing the work already done.

Read this before editing any `.mdx` file.

---

## Commands

Tooling is [Vite+](https://viteplus.dev) (`vp`, installed globally); see the Vite+ section at the
end. `package.json` only keeps scripts that do something extra.

```bash
vp install                    # run at the monorepo root; installs every app + the git hooks
vp dev                        # local dev server
vp check                      # format + lint + type check (--fix to fix; MDX pages are not formatted)
pnpm run build                # production build: must pass before committing
pnpm run start                # serve the built output
```

Stack: TanStack Start + fumadocs (`fumadocs-core`, `fumadocs-mdx`, `fumadocs-ui`), Vite, Tailwind v4.
Content is discovered by glob, so new files need no registration beyond `meta.json`.

Git hooks live at the monorepo root (`.vite-hooks/`, rules in the root `vite.config.ts`):
pre-commit runs `vp check --fix` on this app's staged files; pre-push runs every package's
`typecheck` (here `vp check --no-fmt --no-lint`). Format and lint settings also live in the
root `vite.config.ts`; this app's `vite.config.ts` only holds build, dev and test settings.

---

## 1. The One Rule

**Document what the code does, not what you assume it does.**

Every page in this site was written by reading the actual implementation in the sibling repos:

| Repo         | Path                                               | Use it for                                                                                    |
| ------------ | -------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `rateup-ui`  | `src/routes/`                                      | Which routes exist — the definitive list                                                      |
| `rateup-ui`  | `src/components/Layout/Navbar/hooks.tsx`           | The real sidebar: section names, order, feature gates                                         |
| `rateup-ui`  | `src/components/**`                                | Button labels, field names, validation messages, empty states                                 |
| `rateup-ui`  | `src/config/announcements.ts`                      | **What changed, and when.** The in-app "What's new" list — start here for a docs-refresh pass |
| `rateup-api` | `src/modules/**`, `src/external/{shared,v1,v2}/**` | Endpoints, payloads, retry behaviour, error strings                                           |

`announcements.ts` is the product's own changelog: every user-visible change ships an entry with a
date. Diff it against the last docs commit to find what the docs have not caught up with yet.

Before writing about a feature, grep its labels out of the source:

```bash
cd rateup-ui/src
grep -rhoE 't\("[^"]{3,45}"\)|"[A-Z][A-Za-z /&-]{4,40}"' components/dashboard/<feature>/ \
  | sort -u | head -40
```

Quoting the app's exact strings — _"No campaigns found"_, _"Verify and Save"_ — is what makes the
docs findable and trustworthy. Invented labels are worse than no docs.

**Never document a route that is commented out.** Several exist (`/dashboard/landingPages`,
campaign participants in the external API, loyalty Coupons). They were deliberately excluded.
**Meta AI Agent is no longer one of them** — `/dashboard/meta-agent` and its eight sub-routes are
live in `hooks.tsx`, gated on `TeamFeature.AiChatbot`, and are documented in `meta-agent/`.

**"Ticket" means two different things and only one of them survives.** An _inbox ticket_ is a
customer conversation and is very much alive (`TicketPanel.tsx`, `CloseTicketMenu.tsx`, the whole
`inbox/` section). _Ticket boards_ — the kanban feature — were removed from the product. Never
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
| ----- | ------- |

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
- Headings are task-shaped (_"Assign a Ticket to Yourself"_), not label-shaped (_"Assignment"_).

---

## 4. Components

**Global — no import needed** (from `fumadocs-ui/mdx`):

| Component                                   | Use                           |
| ------------------------------------------- | ----------------------------- |
| `<Callout type="info" \| "warn">`           | Notes and traps               |
| `<Cards>` / `<Card title href description>` | Section overviews, navigation |

**Must be imported:**

```mdx
import { Step, Steps } from "fumadocs-ui/components/steps";
import { Accordion, Accordions } from "fumadocs-ui/components/accordion";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
```

**Local components:**

```mdx
import ScreenShot from "@/components/Screenshot"; // a real, uploaded screenshot
import ImagePlaceholder from "@/components/ImagePlaceholder"; // a screenshot still to be taken
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
were uploaded the same day and their `local` flags removed). The seven template-wizard shots of 2026-10-27 (`whatsapp/template-*.png`) and the three 2026-10-28 shots (`whatsapp/template-analytics{,-enable}.png`, `inbox/chat-header-narrow.png`) were uploaded the same day too. The 22 rename-pass shots of 2026-11-01 were uploaded on 2026-11-02 and their `local` flags removed. `messenger/overview.png` overwrote a same-name file and CloudFront was still serving the old one that day — invalidate `/docs/screenshots/messenger/overview.png` if it still looks stale. See §10 **2026-11-01 rename pass — shots**.

§8 step 3 checks shots against the CDN (it skips `local` ones). The 20 shots of the 2026-10-26 refresh are on
the CDN. The last placeholder, `authentication/signup-step2.png`, was captured and uploaded on 2026-10-26,
so no placeholders remained until 2026-10-28, which added two (see §10 **Inbox typing + header shots**).

**A screenshot that shows a control which no longer exists is worse than no screenshot.** When a
change removes or renames something visible in a captured shot: swap the `<ScreenShot>` back to an
`<ImagePlaceholder>` with a `{/* TODO: re-capture — … */}` saying what changed, **delete the stale
file** so nothing can re-reference it, and list it in §10.

Captures are automated and **redacted**: customer names, phone numbers, emails and message bodies
are swapped for consistent fake data _before_ the screenshot is taken, and avatar photos are
blurred. The `pipeline/` shots were redacted _after_ capture instead, by repainting the names and
avatar initials — see the fake-name table below. Prefer seeding fake data and re-shooting; patching
pixels works but has to be redone from scratch every time the screen is re-captured.

The names those shots now use, so a re-capture can stay consistent:

| Shown as                                                      | Avatar |
| ------------------------------------------------------------- | ------ |
| John Doe                                                      | JD     |
| Jane Roe                                                      | JR     |
| MARIA G                                                       | MG     |
| SAM PATEL RIVERA                                              | SP     |
| PRIYA.S.K                                                     | P      |
| ALEX MORGAN                                                   | AM     |
| Chris Lee                                                     | CL     |
| alexdemo                                                      | A      |
| demo test user                                                | DT     |
| `15550100142` (the unnamed contact)                           | ?      | Avatar initials are regenerated to match the fake names. If you re-capture, reuse that |
| pipeline — never publish a raw screenshot of the running app. |

---

## 6. Voice

Written for the person using RateUp, not for the person who built it.

- **British English.** "Organisation", "personalise", "colour".
- **Second person.** "Click **Close**", not "the user clicks Close".
- **Bold for UI text** the reader must find on screen: **Assign to me**, **Verify and Save**.
- **Backticks for code**, field names in payloads, headers, paths.
- **Concrete over abstract.** _"A message of only letters is rejected"_ beats _"passwords must be
  complex"_.
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

| Gotcha                                                       | Fix                                            |
| ------------------------------------------------------------ | ---------------------------------------------- |
| `{{1}}` breaks the build — MDX parses `{…}` as JS            | Wrap in backticks: `` `{{1}}` ``               |
| Relative links (`./page`, `../section/page`) resolve wrongly | **Always use absolute paths**: `/section/page` |
| A stray `<` or `>` in prose                                  | Wrap in backticks                              |
| Imports below content                                        | Move them to the top                           |

---

## 8. Verify Before You Finish

```bash
# 1. Build must pass (prints "✓ built" three times)
pnpm run build

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

**147 pages across 16 sections + 2 top-level pages** (2026-11-05: `contacts/identities` and `contacts/merging-contacts` added; otherwise as of 2026-11-01 — the rename pass for the
2026-10-28 Journeys section and the 2026-10-30 feature renames + sidebar regroup, rateup-ui `fc4a61522`).
**File names and slugs now follow the app's names** (see _Renamed URLs_ below). Every section maps to an
app sidebar entry, in sidebar order; the sidebar's **Automation** group is `automation/` (Rules + Journeys),
its **Meta** group is `whatsapp/` + `instagram/` + `messenger/`, and **Surveys & Links** is `surveys/` +
`qr-links/`. Build clean.

Each of the three WhatsApp builders now has a **detail page** alongside its list page — the pattern
to follow whenever a feature's real work happens on a `$id` route: the list page covers creating and
managing, the detail page covers the editor itself.

| Section            | Pages                     | Covers                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------ | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getting-started`  | 5                         | Register (account, then `/signup/business` after email verification: store, required WhatsApp business number, goals — the goals set the starting features), setup guide (`setup-guide`, `/dashboard/setup`: four bands incl. **Start with your features**, Mark done / Skip / Hide setup guide), login (**Keep me signed in** is not wired up — the page says so), reset password                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `inbox`            | 25                        | Tickets, 8 views named after the 2026-10-30 tab names (`inboxview/`: open, `unassigned`, closed, all, `assigned-to-me`, `unread-mentions`, `starred`, `spam-contacts`; `?tab=` values open/unassigned/closed/all/assigned/mentions/starred/spam), one-owner assignment (picker, **A** shortcut, team round-robin), replying (incl. the Meta AI handover pill), WhatsApp voice calls (`whatsapp-calls`), **Calls** (`calls`, `/dashboard/inbox/calls`: live strip + call log + call analytics — moved from Analytics 2026-10-30), private notes, closing, ticket details, filters, tags & labels, Inbox settings (3 tabs: **Auto-close** — previously Automation —, Conversation tags, Quick replies with attachments)                                                                                                                                                                                                                                                                                                                                                              |
| `analytics`        | 6                         | The four sidebar views since 2026-10-30: Overview, Team Performance (Agents → `agent-performance`, Teams → `team-performance`, drill-downs at `/dashboard/analytics/{agents,teams}/<id>`), Template Delivery (`template-delivery`), Message log (`message-log`). Calls moved to `inbox/calls`, the audit log to `settings/audit-log`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `contacts`         | 8                         | **Phones, Emails and Accounts** (`identities`: a contact's identities, the starred main phone/email, Edit Contact lists, the Identities/Accounts block), **Merging Contacts** (`merging-contacts`: what a merge moves, the dialog, **Possible duplicates** + **Scan for duplicates**, auto-merge only via Continue on WhatsApp, webchat never auto-merged, `contacts.merge`), Managing (incl. background import with progress, summary, limits and the update-mode warning), **Audiences** (`audiences`, previously Groups; `/dashboard/contacts/audiences`; **Add existing** / **New contact** / **Import**), labels, lifecycle, custom fields. **Lifecycle is hidden from the nav** (`"!lifecycle"` in `contacts/meta.json`), mirroring the app — the app dropped **Contacts → Lifecycle** from its sidebar when Pipelines took over. The route, the page and every inbound link still work; the inbox filter rail, the **Lifecycle Updated** trigger and the Zoho/Zapier mappings still read a lifecycle, so do not delete it                                                   |
| `campaigns`        | 4                         | Overview (`/dashboard/campaigns`), list and statuses; the 6-step wizard incl. test send and credits (the Template step's message preview is the **Device Preview** panel since 2026-10-16); campaign page tabs (Overview, Participants, Analytics) and exports; pausing, resuming (3 options), auto-pause banners, automatic and manual retries (`pausing-and-retrying`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `whatsapp`         | 8                         | The **WhatsApp** section of the sidebar's **Meta** group (`index` carries the `whatsapp/meta-panel.png` shot): templates (step-by-step wizard since 2026-10-27: Meta's library / RateUp starters / scratch, library **Details** step, **Customize the wording**) + template editor (per-step fields) + template analytics, flows (purpose-first create wizard, flow cards) + flow editor (incl. _"Fix this before saving to WhatsApp"_ validation), **Ice Breakers** (`ice-breakers`, `/dashboard/whatsapp/ice-breakers`; the page heading is **Ice Breakers & Commands**), settings (concept page pointing at Channels; per-number **Calling** tab). Journeys moved to `automation/`. There is no WhatsApp → Catalog or WhatsApp → Settings route any more: `/dashboard/whatsapp/catalog` redirects to Commerce → Catalogs                                                                                                                                                                                                                                                        |
| `instagram`        | 4                         | Overview (standalone connect, five tabs — **no Journeys tab since 2026-10-30**, an **Instagram journeys** button opens Automation → Journeys filtered to Instagram; needs _See automation rules_), `journeys` (wizard + examples, Instagram components, how each starts, Follow Check, comment private-reply limits), comments & story mentions, ice breakers / menu / ig.me links, **comment-to-buy** in `automations` (**Send products to buy**: direct checkout only for one product with one sellable option, otherwise the storefront; **Limited drop**; Comment to buy / Live drop templates). All Instagram tools except journeys belong to the account in the page's selector                                                                                                                                                                                                                                                                                                                                                                                              |
| `messenger`        | 5                         | Overview (connect a Facebook Page on its own; three tabs **Comments / m.me Links / Welcome & Menu** and a **Messenger journeys** button — journeys left the page 2026-10-30; Page selector), `journeys` (wizard + 10 examples, Messenger components, ways to start one), `comments` (**Facebook Page Comment** rules: private reply first, label/assign after, public replies, no post picker, 7-day window), `m-me-links` (**m.me Link Opened**, link names, **Any link**, QR, no open counts; new visitors start the rule only via Get Started), `welcome-menu` (Get Started, greeting, ice breakers, persistent menu; saves straight to Meta). Journeys are Page-less; the editor is `/dashboard/automation/journeys/<id>`                                                                                                                                                                                                                                                                                                                                                      |
| `meta-agent`       | 9                         | Mirrors the app's step names and, since 2026-10-30, its route slugs: `setup-guide`, `knowledge`, `skills`, `rich-replies`, `connectors` (incl. the built-in RateUp connector), `test`, `go-live` (rollout, handoff message, inbox handover, allowlist, usage caps), `insights`. Titles use the sidebar labels from `metaAgent.nav.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `automation`       | 8                         | The sidebar's **Automation** group. **Rules** (`index`, `/dashboard/automation/rules`, **Create rule**; `/dashboard/automation` redirects there): the step-by-step builder (`creating-a-rule`, header **Rules / New rule**: Template → Trigger → Conditions → Actions → Review; one rule on several channels; the **Device Preview** panel; the per-platform **Share** tab), triggers per platform, conditions, actions (incl. **Start a journey**, template variable mapping and **Send products to buy**), Shopify abandoned-cart reminders + **Results** tab. **Journeys** (previously Chatbots): `journeys` = the list for all three channels at `/dashboard/automation/journeys` (`?channel=` filter, runs + on/off switch per card, 3-step wizard that also creates the starting rule, starting one from the Inbox composer), `journey-builder` = the editor at `/dashboard/automation/journeys/<id>` (auto-saves ~1 s after an edit)                                                                                                                                        |
| `commerce`         | 11                        | Mirrors the 2026-10-18 rebuild's sidebar (Setup · Overview · Products · Orders · Coupons · Settings): `setup` (checklist; steps differ for Shopify/WooCommerce checkout), `overview` (KPIs, messaging cost vs revenue, click-to-WhatsApp ads, needs attention), `products` (editor, import Meta/Shopify/WooCommerce/CSV, bulk edit, duplicate, sync chips), `orders` (tabs incl. Needs action, order page, shipping/EasyPost, returns, invoices), `coupons`, `settings` (tab map + Delivery, Store → Connect Your Meta Catalog, Customer messages), `payments` = **Getting paid** tab (Stripe/Razorpay, WhatsApp Pay, COD, bank transfer + 72 h expiry, invoices), `checkout-settings` = **Checkout** tab (where customers pay, checkout in chat, cart reminders), `storefront` (public `/s/<slug>`, product links, SEO/sitemap, WhatsApp number confirmation), `catalogs` = **Legacy Catalog Tools** (old Meta-catalog page and catalog cart orders, reached from Settings → Legacy catalog). Old slugs kept; `/dashboard/commerce/payments` redirects to Settings → Getting paid |
| `loyalty`          | 19 (13 in nav + 6 hidden) | Setup wizard (`onboarding`), `overview` (previously Dashboard), Cashier (`cashier-portal`), `members` (previously Customers), Program (profile, earning rules, tiers), Rewards (per-tier, bonuses), Activity (ledger + approvals), Messages (automatic, replies, journey, templates), Reminders, Feedback (survey, Google review, review reward), Materials (brochure, QR card), Settings. `earning-rules`, `transactions`, `approvals`, `commands`, `notifications`, `templates` are hidden pages (`!name`) pointing to their new homes, so old links keep working                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `surveys`          | 10                        | **Surveys** (previously Web Forms; `/dashboard/surveys`, in the **Surveys & Links** group): creating (`creating-a-survey`), question types, logic, design, settings (response webhook — signed, queued), sharing, results (Happiness Index, NPS Overview, Team Analytics; Excel/ODS/Google Sheet export), automations, and `testimonials` (folded in from the old top-level `testimonials/`; `/dashboard/surveys/testimonials` has no sidebar entry or tab — its tab is commented out in `SurveySectionTabs.tsx`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `pipelines`        | 11                        | `/dashboard/pipelines`. Board types (Leads / Support / Projects / Custom), board, leads, list, forecast, insights, stages, import & export, automatic leads, settings. Only the **Leads** board is wired to the inbox, automations, contacts and CRM syncs; Forecast, probability, lost reasons, source/company and CAPI are Leads-only (`pipelineTypes.ts`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `qr-links`         | 3                         | **QR codes** (`qr-codes`, `/dashboard/qr-codes`) and **Link-in-bio Pages** (`link-in-bio-pages`, `/dashboard/link-pages`) from the **Surveys & Links** group (previously QR Studio). Customize Menu still calls the module **QR & Links**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `settings`         | 11                        | Mirrors the two sidebar groups. **You**: `profile` (Profile & Business, previously Account), notifications, `password` (Password & Account, previously Security). **Organization**: `members` (Members & Roles, previously Users; `/dashboard/settings/members`), teams, channels (incl. calling, standalone Messenger/Instagram), integrations (API keys manager + usage, signed org webhook and its events, **WooCommerce**), billing, `audit-log` (`/dashboard/settings/audit-log`, previously Analytics → Logs → Team activity; own date picker; _See the audit log_, Owner/Admin by default). Plus `customize-menu` (`/dashboard/customize-menu`, previously Features; opened from the rail's grid icon, not from Settings; org-wide; turning a feature off only hides it). **There is no per-team feature setting any more**                                                                                                                                                                                                                                                 |
| `external-api.mdx` | 1                         | Partner API **v2** (`/api/external/v2`, `rk_live_`/`rk_test_` keys, no org id) as the main surface: keys & feature access, error envelope + code list, cursor paging, optional `Idempotency-Key`, digits-only phones (country code, no `+`, like v1), rate limits, every v2 endpoint with examples; a **v1 (legacy)** section; a v1 → v2 field-by-field migration table. Source: `rateup-api/src/external/{shared,v1,v2}`, `src/modules/apiAccessToken`, `src/authz/apiKeyFeatures.ts`, `src/plugins/swagger.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

### Deleted on purpose — do not recreate

| Removed                                      | Why                                                                                                                                                                                                                                                                                                |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `menu/`                                      | No `dashboard/menu` route exists anywhere in the app                                                                                                                                                                                                                                               |
| `landingpage.mdx`                            | Route does not exist; nav entry is commented out                                                                                                                                                                                                                                                   |
| `whatsapp-survey/`                           | Legacy duplicate of whatsapp/, inbox/, campaign/, contacts/                                                                                                                                                                                                                                        |
| `whatsapp/logs.mdx`                          | No WhatsApp → Logs route; covered by `analytics/message-logs`                                                                                                                                                                                                                                      |
| `apidoc/`                                    | Folded into `external-api.mdx` and `settings/integrations`                                                                                                                                                                                                                                         |
| `profile-settings/`, `teams/`                | Consolidated into `settings/`                                                                                                                                                                                                                                                                      |
| `contacts/all-contacts/`, `contacts/groups/` | Flattened into `contacts/`                                                                                                                                                                                                                                                                         |
| `web-survey/`, `advanced-features/`          | Merged into `web-forms/`, now `surveys/`                                                                                                                                                                                                                                                           |
| `testimonials/`                              | Folded into `surveys/testimonials` (2026-11-01); the app moved Testimonials under Surveys                                                                                                                                                                                                          |
| `loyality/`                                  | Renamed to `loyalty/` (spelling)                                                                                                                                                                                                                                                                   |
| `tickets/`                                   | **Ticket boards were retired from the product** (announcement `2026-08-29-ticket-boards-retired`). No `/dashboard/tickets` route, no `modules/ticket` on the API, no **Tickets** row in a team's Feature Access. Replaced by `pipeline/`. Inbox _tickets_ — conversations — are unrelated and stay |

If a section looks "missing", check this table before adding it back.

### Renamed URLs

**Every old docs URL redirects (301).** The map is `src/lib/redirects.ts` (`REDIRECTS`), consulted by
the `$` route's server loader (`src/routes/$.tsx`) **only when no page exists at the requested path**,
so a rule can never shadow a real page. Rules are prefix-aware (`/web-forms` also covers
`/web-forms/logic-and-variables`), the longest key wins, rules chain, and an old URL whose exact page is
gone falls back to its nearest existing parent (`/loyality/cashier-portal/quick-actions` →
`/loyalty/cashier-portal`). It covers the 2026-11-01 renames (`whatsapp/chatbots` → `automation/journeys`,
`web-forms/` → `surveys/`, `qr-studio/` → `qr-links/`, `campaign/` → `campaigns/`, `pipeline/` →
`pipelines/`, `contacts/groups` → `audiences`, the analytics/settings/loyalty/meta-agent/inbox-view
slugs, …), the older `loyality/*`, `web-survey/*` and `advanced-features/*` paths, and the camel-case
deep links (`/advancedFt/*`, `/webSurvey/*`, `/loyality/earningRules`, `/testimonial`) older app builds
sent from their info buttons. **When you rename or move a page, `git mv` it, add a row to `REDIRECTS`,
and rewrite inbound links** (the 2026-11-01 pass did that with a one-off script that ran every link
through `resolveRedirect`). Test with `pnpm run build && PORT=3311 pnpm run start`, then
`curl -s -o /dev/null -w '%{http_code} %{redirect_url}' localhost:3311/web-forms/logic-and-variables`.

**The app links into the docs** with `docsPath` (`rateup-ui/src/utils/constants.ts`) from its info
buttons (`InfoButton docUrl=…`) and `WebhookSigningCard.tsx`. Grep `docsPath}/` there when a slug
changes.

---

## 10. Outstanding Work

| Item                                                                                         | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **2026-10-26 refresh shots**                                                                 | **20 captured and uploaded to the CDN on 2026-10-26 (no longer `local`)**: `commerce/{overview,overview-stats,message-cost,products,import-products,orders,order-detail,coupons,setup,settings-store,payments,checkout-settings,storefront}.png`, `messenger/{overview,comment-automations,m-me-links,welcome-menu}.png`, `instagram/comment-to-buy.png`, `settings/features.png`, `getting-started/setup-guide.png`. The commerce/messenger ones overwrote the stale CDN files of the same name. Captured in Brave from the local dev build (rateup-ui `alen/comerce-update`, 2 commits ahead of `main`) against demo data answered to the page's **GET** requests in the browser; every non-GET request was redirected to a local stub, so nothing reached the API. Demo business **Demo Cafe** (USD), §5 names, `+1 312-555-01xx` numbers, Unsplash product photos, avatars blurred, user shown as John Doe. 1440 wide; tall pages captured at their full height (up to 1864 px), the storefront at 390×1560 @2x. `settings/features` has no **Not on your plan** badge (the dev org's plan includes everything). `authentication/signup-step2.png` was captured later on 2026-10-26 with puppeteer-core driving Brave against the local dev build: a fake SuperTokens `sFrontToken` cookie (session + `st-ev: true`) passes the route's client-side guards, `GET /user/info` is answered in the browser with a John Doe user whose `profileCompleted` is `false`, and every other API call is stubbed, so nothing reached the API. Form filled with **Demo Cafe**, `+1 312 555 0142`, `https://democafe.example.com`, Hospitality, 6–25; TanStack devtools hidden; 1440×900. Uploaded to the CDN the same day; no longer `local`. `authentication/register.png` and `authentication/login.png` predate the redesigned auth screens — re-check                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Template wizard shots (2026-10-27)** — uploaded to the CDN the same day, no longer `local` | The template editor became a step-by-step wizard with Meta's template library (rateup-ui/rateup-api branch `feat/template-library-wizard`, announcement `2026-10-27-template-wizard-meta-library`). `whatsapp/templates.mdx` and `template-editor.mdx` were rewritten for it, and seven new shots: `whatsapp/{template-start-library,template-start-starters,template-setup,template-library-details,template-review,template-message,template-buttons}.png`. Captured in Brave from the local dev build against the real library (nothing saved or submitted). Redacted in the browser: org → **Demo Cafe**, number → **Main line** / `+1 312-555-0142`, user → **John Doe**, avatars blurred; samples **Jane** / `COFFEE20`, links on `democafe.example.com`. The Start/Setup shots are 1440×800 CSS px, the rest 1440×1000 so the step fits without scrolling. `whatsapp/template-editor.png` on the CDN shows the old one-page form and is no longer referenced — delete it. `whatsapp/templates-list.png` is still accurate (only the **Create Templates** picker dialog went away)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **`pipeline/` shots need a re-shoot**                                                        | Board types and import/export (2026-09-25/27) changed the screen. **Swapped to placeholders** because they showed removed UI: `pipelines/pipelines-overview.png` (sidebar **Teams** section), `pipelines/pipelines-board.png` (team chip on cards), `pipelines/pipelines-lead.png` (old drawer with Team / Lead age / Idle / Labels). Delete those three from the CDN. The overview, board, lead, new-board and import shots were captured and uploaded on 2026-10-16. **Still live but stale**: `pipelines-lists.png` (team name under assignees), `pipelines-forcast.png`, `pipelines-insights.png`, `pipelines-settings.png` (header lacks Export/Import; settings switch is now **Flag stalled cards**), `pipelines-stages.png` — each page carries a `TODO(shot)`. `pipeline-settings.png` stops at the **Teams** heading, and its title was repainted from **Sales** to **Default Pipeline**; a fresh capture with the §5 fake names replaces all of the patching                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **`qr-studio/` shots replaced**                                                              | The 2026-09-23 redesign removed every screen the old shots showed. `qr-studio/qr-list.png`, `qr-editor.png` and `access-links-list.png` were replaced by `qr-studio/qr-codes-list.png`, `qr-code-detail.png` and `link-page-editor.png` (captured and uploaded 2026-10-16); delete the old three from the CDN                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Pipeline expected close is read-only**                                                     | No dashboard control sets `expectedCloseAt` on a Leads card (only the import's **Expected close** column and the API). Documented as such in `pipeline/forecast.mdx` and `leads.mdx`; re-check if the lead window gains a date picker                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Screenshots**                                                                              | See **2026-11-01 rename pass — shots** for the placeholders. `meta-agent/overview.png` on the CDN showed the pre-setup-guide Overview and is no longer referenced — delete it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Last 9 shots — mock-data captures**                                                        | Captured 2026-10-16 and uploaded to the CDN the same day: `automation/shopify-results`, `campaign/resume-dialog`, `commerce/catalog-settings`, `inbox/incoming-call`, `instagram/ig-me-links`, `loyalty/feedback`, `messenger/trigger-prompt`, `whatsapp/chatbot-trigger-prompt`, `web-forms/webhook-settings`. The dev org has none of this data, so each was shot against the real components with demo data answered to their **GET** requests in the browser (nothing saved, no write reached the API; the incoming call came from a mocked `GET /api/wa/calls/ringing` poll, not Meta). Demo business "Demo Cafe", §5 names, 555 numbers. `automation/shopify-results` is 1440×1150 rather than 1440×900 so the per-day chart fits; the inbox behind `inbox/incoming-call` was repainted with the §5 names. Re-shoot any of them from real data when an org has it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **`whatsapp/catalogs.mdx` was deleted — resolved 2026-10-16**                                | Not restored: `/dashboard/whatsapp/catalog` now redirects to `/dashboard/commerce/catalogs`, so the four links were repointed to `/commerce/catalogs`. Since the 2026-10-26 refresh that page is **Legacy Catalog Tools**; connecting a catalog lives at `/commerce/settings#connect-your-meta-catalog`, and the old anchor `#connect-a-catalog-to-your-whatsapp-account` is kept. `public/docs/screenshots/whatsapp/catalog.png` is orphaned — delete it from the CDN                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **`settings/` + External API shots (2026-10-16 pass)**                                       | New, captured and uploaded 2026-10-16: `settings/api-key-create` (external-api), `settings/api-service` (integrations), `settings/members-list`, `settings/members-roles`, `settings/member-page`, `settings/notifications`, `settings/team-page`, `settings/billing`, `settings/channels`, `settings/channel-edit-tabs`, `settings/channel-profile-tab`. The members, member and team shots show a 2-member dev org, so they lack the Customised / Paused / Invited states their pages describe — re-shoot on a fuller org. Swapped out as stale — **delete from the CDN**: `settings/api-access-key.png` (single-key **Generate Api Key** panel), `settings/users.png` (old Users page), `settings/teams.png` (pre-Members/Channels/Details tabs), `settings/billing.png`, `settings/channels.png`. `settings/webhook-integration.png` was re-captured and uploaded on 2026-10-16 against the rebuilt Webhook page (a demo endpoint injected in the browser, nothing saved). `settings/integrations.png` was kept but predates the API-keys manager — re-shoot when convenient                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Automation builder shots (2026-10-16 rebuild)**                                            | Re-captured 2026-10-16 against the new builder and uploaded to the CDN the same evening (no longer `local`): `automation/rule-wizard.png`, `automation/trigger-select.png`, `automation/conditions.png`, `automation/actions.png`, `automation/abandoned-cart-rule.png` (these overwrote the old Basics/When/If/Then shots of the same name on the CDN), plus two new shots `automation/template-gallery.png` and `campaign/template-step.png`. Captured in Brave at 1440×900 (the template gallery is 1440×750) from a new, never-saved rule and an existing draft campaign whose template was picked but not saved. Redacted in the browser before capture: org and Page name → **Demo Cafe**, Instagram handle → **democafe**, WhatsApp numbers → **Main line** / **Support line**, team → **Support**, label → **Refund**, campaign → **Weekend offer**, user → §5 **John Doe**, avatars blurred. The Instagram, Messenger and ig.me entry points now open the builder on **Template**; the docs tell readers to click **Start from scratch** to keep the preset trigger                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Template analytics (2026-10-28)**                                                          | New page `whatsapp/template-analytics.mdx` (Meta's `template_analytics`: enable banner, per-template page at `/dashboard/whatsapp/templates/$templateId/analytics`, 7/30/90 days). Both shots, `whatsapp/{template-analytics,template-analytics-enable}.png`, were captured 2026-10-28 in Brave from the local dev build with the analytics responses answered in the browser (demo numbers, nothing sent to Meta; the enable banner forced on because the dev account already has analytics on). Redacted: template shown as **weekend_offer**, number as **Main line**, test template names renamed, avatars blurred. Uploaded to the CDN on 2026-10-28, no longer `local`. A re-capture needs a WhatsApp number with template analytics turned on and recent sends                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Inbox typing + header shots (2026-10-28)**                                                 | `inbox/responding-to-conversation.mdx` gained **What the Customer Sees While You Type** (typing bubble on WhatsApp / Instagram / Messenger, teammate _"is typing…"_ line) and `inbox/layout.mdx` now describes the header fitting the chat window (status pill drops first, then the countdown, then the Meta AI pill goes icon-only, then the name truncates; countdown and status now sit left of the star). `inbox/chat-header-narrow.png` was captured 2026-10-28 (header cropped from a 1536-wide window at 1.25×, customer shown as **John Doe** / `+1 312-555-0142`, avatar blurred; it shows the status pill already gone with the countdown still fitting) and was uploaded to the CDN the same day (no longer `local`). Two **placeholders** remain: `inbox/customer-typing-bubble.png` (customer's phone, needs a real WhatsApp test number) and `inbox/teammate-typing.png` (needs a second member typing in the same ticket — injecting a fake socket event froze Brave twice, do not retry that way). `inbox/chat-window-annotated.png` still works but shows the old header order (star before countdown) — re-shoot when convenient                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Stale captures to re-shoot**                                                               | `inbox/close-menu` (the menu no longer lists "Mark as Spam"; spam and block sit below a separator) and `inbox/toolbar-annotated` (the advanced-filters icon is gone). Both files were **deleted**; the pages carry `ImagePlaceholder`s with the shot instructions. `inbox/mark-as-spam` has been re-shot against the new menu. `inbox/staff-team-filters` and `inbox/layout-annotated` still work but predate the sidebar's **Channel** section                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **2026-11-01 rename pass — shots**                                                           | Files and slugs renamed to the 2026-10-30 names; redirects in `src/lib/redirects.ts` (§9 _Renamed URLs_). New redacted 1440×900 captures, **uploaded to the CDN 2026-11-02 and no longer `local`** (`messenger/overview` may need a CloudFront invalidation — the old same-name file was still cached): `automation/{journeys-list,rules-list,rule-wizard}`, `instagram/journeys`, `contacts/audiences`, `settings/{audit-log,profile,password,team-page}`, `analytics/{overview,agent-performance,team-performance,template-delivery,message-log}`, `inbox/{calls,sidebar-views,inbox-settings-tabs}`, `whatsapp/{ice-breakers,meta-panel}`, and `instagram/overview`, `messenger/{overview,journeys}` (captured after the 2026-11-01 Instagram/Messenger page redesign; `sidebar-views` is cropped from `inbox-settings-tabs`, `meta-panel` from `ice-breakers`). **Placeholders added** (old shot's subject was renamed/removed): `automation/journey-wizard`, `automation/journey-off-card`, `instagram/journey-wizard`, `messenger/journey-off-card`, `inbox/view-unassigned`, `inbox/view-assigned-to-me`, `inbox/view-unread-mentions`, `inbox/layout-annotated` (old sidebar was an annotated region), `contacts/audience-page` (old shot said Groups), `settings/customize-menu` (old `features.png` showed Pipeline / Web Forms / chatbots). **No longer referenced — delete from the CDN**: `whatsapp/{chatbots-list,chatbot-wizard-examples,chatbot-trigger-prompt,conversational-components}.png`, `instagram/{chatbots,chatbot-wizard}.png`, `messenger/{chatbot-wizard,trigger-prompt}.png`, `analytics/{calls,team-activity,message-analytics,message-logs}.png`, `inbox/{view-new,view-mine,view-mentions,inbox}.png`, `settings/{features,account,security}.png`, `contacts/{groups,group-page}.png`; `instagram/overview.png`, `messenger/overview.png` and `inbox/layout-annotated.png` on the CDN are stale under the same name. **Kept but dated** (old sidebar only in the background): `whatsapp/chatbot-builder.png`, `inbox/view-{open,all,closed}.png`, `contacts/list.png` (also shows a Lifecycle column — re-shoot), `instagram/comment-public-replies.png` (old Then step reading "Trigger Journey"; the menu now says **Start a journey**) |
| **Contact identities + merge pass (2026-11-05)**                                             | rateup-api/ui/admin branch `feat/contact-identities` (announcements `2026-11-05-merge-contacts`, `-multiple-businesses`, `-continue-on-whatsapp`). New pages `contacts/identities`, `contacts/merging-contacts`; updated `contacts/{index,managing-contacts}`, `inbox/{tickets,conversation-lifecycle,inbox-filter,toolbar,ticket-details,responding-to-conversation}`, `settings/{channels,integrations,members}`, `automation/journey-builder`, `{instagram,messenger}/journeys`, `campaigns/campaign-details`; `external-api.mdx` (v2 identities + merge) was updated earlier on the branch. **Nine new shots, uploaded to the CDN on 2026-11-05 and no longer `local`** (checked byte-for-byte against the captures): `contacts/{duplicates,merge-dialog,contact-view-identities,edit-contact-identities}.png`, `inbox/{ticket-panel-identities,channel-filter-webchat,reply-number-picker}.png`, `settings/channels-businesses.png`, `automation/continue-on-whatsapp.png`. Captured in Brave from the local dev build with the §5 names (customer **John Doe** / `+1 555 010 0123`, staff **Jane Roe**, demo pair **Chris Lee**), numbers **Main line** / **Support line**, business **Demo Cafe**, Instagram **acme_store**, Meta IDs faked, photos blurred, TanStack devtools hidden. The duplicates/merge shots used three temporary demo contacts and the journey shot a temporary copy of a journey — all deleted afterwards; the Edit Contact phone fields were overlaid with fake text (the phone input rejects swapped values) and the form was cancelled. The window would not hold 1440×900, so most are 1536 wide at 1.25×; the inbox/automation ones are crops. `inbox/reply-number-picker.png` shows one business (no business headings or greyed numbers) — re-shoot on an org with numbers from two businesses and a BSUID-only customer. The webhook **Events** picker gained **Contact merged** in rateup-ui on the same branch, which `settings/integrations.mdx` relies on                                                                                                                                                                                                                                                                        |
| **Old-URL redirects — done 2026-11-01**                                                      | `loyality/*`, `web-survey/*`, `advanced-features/*` and every 2026-11-01 rename redirect via `src/lib/redirects.ts`, verified with curl against the built server                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **App strings still saying the old names**                                                   | rateup-ui `en.json`: _"Ask an admin to turn on {feature} from Features in the menu."_ and the signup _"…change this any time from Features in the menu."_ — the rail button is **Customize Menu** now. The automation action **Send Web Survey** (`schema.ts`) and the Meta AI Agent's "Web survey (optional)" / **Add UI skill** are unchanged too; the docs quote them as they are. The Message log page is headed **Message log** but its card **Message logs**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Mostly written from source**                                                               | Pages are written from the code. The 2026-10-16 screenshot pass drove the running app for every captured shot, which is the only visual check so far; behaviour beyond what a shot shows is still unverified                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Stale CDN files to delete (2026-10-16 pass)**                                              | No longer referenced by any page: `loyalty/{dashboard,dashboard-stats,earning-rules,transactions,approvals,cashier-portal,commands,notifications,templates}.png`, `campaign/detail.png`, `contacts/contact_groups_page.png`, `analytics/quick-stats.png`, `inbox/auto-close-rules.png`, `whatsapp/catalog.png`, `meta-agent/overview.png`, `qr-studio/{qr-list,qr-editor,access-links-list}.png`, `settings/{api-access-key,users,teams}.png`. Files whose name was reused by a new local shot (e.g. `loyalty/customers.png`, `settings/billing.png`, `instagram/overview.png`, the `pipelines/` and `analytics/` shots) were overwritten by the 2026-10-16 upload                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

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
  `X-Webhook-Id`. The survey response webhook (`surveys/settings.mdx`) gets the same headers,
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
  enums only as a thread _event_ label and for pre-migration rows. The Spam tab is the one
  contact-grained list in the Inbox: one row per contact, and its badge counts contacts. Spam
  contacts are excluded from every other tab, **including All**. Documented in
  `inbox/inboxview/spam-contacts.mdx`; do not describe spam as a close outcome anywhere.
- **Team → Channel Access is visibility, not authorisation.** `wa_channel_access.ts` scopes what the
  dashboard shows; the endpoints stay open to any authenticated member, and External API keys are
  not limited by team or channel. Team-less users and org owners see every channel, and membership of several teams takes
  the _union_. Documented that way in `settings/teams.mdx`.
- **Any RateUp send takes a conversation off Meta AI** — a staff reply, an automation, a campaign or
  an API send (`MetaAgentThreadBadge.tsx` reason labels; `metaAgent.threadOwner.ts`). Documented as a
  warning in `meta-agent/go-live.mdx`. The **Insights → Conversation turns** field also accepts _"a
  conversation ID from the test console"_, but the Test card never displays that id, so the docs
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

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Built-in Commands vs Scripts

`vp <name>` runs a built-in command. `vp run <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so `vp dev` and `vp run dev` may do different things. Check `package.json` and `vite.config.ts` first, and run `vp run <name>` when the project defines a script or task with that name.

## Running Scripts

Run TypeScript and JavaScript files with `vpx <file>`, for example `vpx ./scripts/seed.ts --dry-run`. It handles enums, decorators, JSX, and tsconfig `paths`, so do not add `tsx` or `ts-node` to run scripts. `vpx --watch <file>` reruns the file when a file it uses changes, in place of `tsx watch`. `vp node <file>` runs plain Node.js.

## Tool Versions

Run `vp toolchain` to show versions and relationships in the active Vite+
release. Add a tool name to select part of the graph. For example, run
`vp toolchain vite`. Use `--global` to ignore the local `vite-plus` package. Use
`vp why <package>` to show the package-manager dependency graph.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->
