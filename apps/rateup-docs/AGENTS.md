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
| `rateup-api` | `src/modules/**`, `src/external/v1/**` | Endpoints, payloads, retry behaviour, error strings |

Before writing about a feature, grep its labels out of the source:

```bash
cd rateup-ui/src
grep -rhoE 't\("[^"]{3,45}"\)|"[A-Z][A-Za-z /&-]{4,40}"' components/dashboard/<feature>/ \
  | sort -u | head -40
```

Quoting the app's exact strings — *"No campaigns found"*, *"Verify and Save"* — is what makes the
docs findable and trustworthy. Invented labels are worse than no docs.

**Never document a route that is commented out.** Several exist (`/dashboard/landingPages`,
Meta AI Agent, campaign participants in the external API, loyalty Coupons). They were deliberately
excluded.

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
import { CDN } from "@/lib/cdn";
```

Put all imports **at the top**, directly after the frontmatter.

---

## 5. Screenshots

Most screenshots have not been captured yet. Rather than link broken images, the site uses a
placeholder that renders a labelled dashed frame:

```mdx
<ImagePlaceholder
  file="inbox/ticket-row-annotated.png"
  shot="A single conversation-list row, zoomed, with callouts on: star, ticket number, status pill, mention chip, assignee avatar."
  caption="Anatomy of a ticket row."
/>

{/* TODO: capture a zoomed, annotated single row */}
```

- `file` — the path the final image should be uploaded to, under `<CDN>/docs/screenshots/`
- `shot` — precise instructions for whoever takes it
- Always pair it with a `{/* TODO: … */}` comment

**To replace one**, upload the image and swap the tag:

```mdx
<ScreenShot src={`${CDN}/docs/screenshots/inbox/ticket-row-annotated.png`} alt="…" />
```

There are currently **~102 placeholders**. The highest-value ones are the annotated overviews:
`inbox/layout-annotated`, `inbox/ticket-row-annotated`, `inbox/chat-window-annotated`,
`inbox/composer-annotated`, `inbox/toolbar-annotated`.

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

# 3. Every section has a meta.json and appears in the root meta.json
```

A build failure naming a `.mdx` file with "Could not parse expression with acorn" is almost always
an unescaped `{{ }}`.

---

## 9. Where We Are Now

**101 pages across 15 sections + 2 top-level pages.** Every section maps 1:1 to an app sidebar
entry. Build clean, zero broken links.

| Section | Pages | Covers |
|---------|-------|--------|
| `getting-started` | 4 | Register, login, reset password |
| `inbox` | 22 | Tickets, 8 views, replying, private notes, closing, ticket details, filters, settings |
| `analytics` | 7 | All six analytics tabs |
| `contacts` | 6 | Managing, groups, labels, lifecycle, custom fields |
| `campaign` | 3 | Creating, details, broadcast vs drip |
| `whatsapp` | 7 | Flows, chatbots, templates, conversational components, catalog, settings |
| `instagram` | 4 | Chatbots, comment/story automations, entry points |
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
| **Screenshots** | ~102 placeholders awaiting capture |
| **Old-URL redirects** | For the two renamed sections |
| **Nothing is visually verified** | Every page was written from source, not from a running app |

### Known accuracy caveats

- **Commerce → Checkout Settings** is local UI state in the current build; it does not persist. The
  page describes what it presents without claiming the values save. Re-check if that changes.
- **The External API key is effectively root** — `verifyApiAccessTokenHook` assigns
  `Role.SUPER_ADMIN`. There is no scoping. Documented as such.
- **The WhatsApp message-status webhook is unsigned and unretried.** Both are documented as
  warnings; if either changes, `settings/integrations.mdx` must be updated.

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
