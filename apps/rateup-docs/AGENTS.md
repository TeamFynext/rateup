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
| `rateup-api` | `src/modules/**`, `src/external/v1/**` | Endpoints, payloads, retry behaviour, error strings |

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
**Meta AI Agent is no longer one of them** — `/dashboard/meta-agent` and its seven sub-routes are
live in `hooks.tsx`, gated on `TeamFeature.AiChatbot`, and are documented in `meta-agent/`.

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

**99 screenshots are referenced from `public/docs/screenshots/`** as `/docs/screenshots/<file>` —
served from `public/`, not the CDN. Every reference resolves. **7 placeholders remain** (§10), and 8
older inbox shots still point at the CDN.

**A screenshot that shows a control which no longer exists is worse than no screenshot.** When a
change removes or renames something visible in a captured shot: swap the `<ScreenShot>` back to an
`<ImagePlaceholder>` with a `{/* TODO: re-capture — … */}` saying what changed, **delete the stale
file** so nothing can re-reference it, and list it in §10.

Captures are automated and **redacted**: customer names, phone numbers, emails and message bodies
are swapped for consistent fake data *before* the screenshot is taken, and avatar photos are
blurred. Avatar initials are regenerated to match the fake names. If you re-capture, reuse that
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

# 3. Every referenced screenshot exists on disk
grep -rho 'src="/docs/screenshots/[^"]*"' src/content/docs | sed 's/src="\///;s/"//' | sort -u \
  | while read -r f; do [ -f "public/$f" ] || echo "MISSING $f"; done

# 4. Every section has a meta.json and appears in the root meta.json
```

A build failure naming a `.mdx` file with "Could not parse expression with acorn" is almost always
an unescaped `{{ }}`.

---

## 9. Where We Are Now

**112 pages across 16 sections + 2 top-level pages.** Every section maps 1:1 to an app sidebar
entry. Build clean.

Each of the three WhatsApp builders now has a **detail page** alongside its list page — the pattern
to follow whenever a feature's real work happens on a `$id` route: the list page covers creating and
managing, the detail page covers the editor itself.

| Section | Pages | Covers |
|---------|-------|--------|
| `getting-started` | 4 | Register, login, reset password |
| `inbox` | 23 | Tickets, 8 views, replying, private notes, closing, ticket details, filters, tags & labels, settings |
| `analytics` | 7 | All six analytics tabs |
| `contacts` | 6 | Managing, groups, labels, lifecycle, custom fields |
| `campaign` | 3 | Creating, details, broadcast vs drip |
| `whatsapp` | 9 | Flows + flow editor, chatbots + chatbot builder, templates + template editor, conversational components, settings |
| `instagram` | 4 | Chatbots, comment/story automations, entry points |
| `meta-agent` | 8 | Overview & onboarding, knowledge, skills, UI skills, connectors, settings, operate |
| `automation` | 4 | Triggers, conditions, actions |
| `commerce` | 6 | Overview, catalogs, orders, payments, checkout settings |
| `loyalty` | 12 | Dashboard, earning rules, rewards, customers, transactions, approvals, cashier, commands, notifications, templates, settings |
| `web-forms` | 9 | Creating, question types, logic, design, settings, sharing, results, automations |
| `tickets` | 3 | Boards, working with tickets |
| `testimonials` | 1 | Collections, styling, embedding |
| `qr-studio` | 3 | QR creator, access links |
| `settings` | 8 | Account, users, teams, channels, integrations, security, billing |
| `external-api.mdx` | 1 | Auth + worked examples, links to `api.rateup.app/reference` |

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

If a section looks "missing", check this table before adding it back.

### Renamed URLs

`loyality/*` → `/loyalty/*` and `web-survey/*` → `/web-forms/*`. If those old URLs are linked
externally, they need redirects — **this has not been done.**

---

## 10. Outstanding Work

| Item | Notes |
|------|-------|
| **Onboarding / setup page** | `/login/setup` — the post-signup checklist. Three sections (Connect WhatsApp, Team & automation, Design your loyalty program), 11 task cards, progress tracking, **Continue to Dashboard**. Belongs in `getting-started/`. **Not written.** |
| **Screenshots** | **7 placeholders**: `inbox/toolbar-annotated` and `inbox/close-menu` (stale captures, deleted — see below), `web-forms/webhook-settings`, `settings/channel-edit-tabs` + `settings/channel-profile-tab` (the Edit channel dialog), and `inbox/conversation-tags-panel`. In `meta-agent/`, only the section index is shot (`meta-agent/overview.png`) — the seven inner pages have no screenshots at all |
| **`whatsapp/catalogs.mdx` was deleted** | The deletion is staged, but `/whatsapp/catalogs` is still linked from `commerce/catalogs.mdx` (×2), `commerce/index.mdx` and `whatsapp/index.mdx`, and `public/docs/screenshots/whatsapp/catalog.png` is now orphaned. Either restore the page or repoint those four links — the `/dashboard/whatsapp/catalog` route does still exist |
| **Stale captures to re-shoot** | `inbox/close-menu` (the menu no longer lists "Mark as Spam"; spam and block sit below a separator) and `inbox/toolbar-annotated` (the advanced-filters icon is gone). Both files were **deleted**; the pages carry `ImagePlaceholder`s with the shot instructions. `inbox/mark-as-spam` has been re-shot against the new menu. `inbox/staff-team-filters` and `inbox/layout-annotated` still work but predate the sidebar's **Channel** section |
| **Old-URL redirects** | For the two renamed sections |
| **Nothing is visually verified** | Every page was written from source, not from a running app |

### Known accuracy caveats

- **Commerce → Checkout Settings** is local UI state in the current build; it does not persist. The
  page describes what it presents without claiming the values save. Re-check if that changes.
- **The External API key is effectively root** — `verifyApiAccessTokenHook` assigns
  `Role.SUPER_ADMIN`. There is no scoping. Documented as such.
- **The WhatsApp message-status webhook is unsigned and unretried.** Both are documented as
  warnings; if either changes, `settings/integrations.mdx` must be updated.
- **Spam is a flag on the contact** (`Contact.isSpam`), not a ticket status — `SPAM` survives in the
  enums only as a thread *event* label and for pre-migration rows. The Spam tab is the one
  contact-grained list in the Inbox: one row per contact, and its badge counts contacts. Spam
  contacts are excluded from every other tab, **including All**. Documented in
  `inbox/inboxview/spam.mdx`; do not describe spam as a close outcome anywhere.
- **Team → Channel Access is visibility, not authorisation.** `wa_channel_access.ts` scopes what the
  dashboard shows; the endpoints stay open to any authenticated member, and the External API key is
  unscoped. Team-less users and org owners see every channel, and membership of several teams takes
  the *union*. Documented that way in `settings/teams.mdx`.
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
