/**
 * Product announcements — the source for the sidebar's "What's new" card.
 *
 * Add an entry in the same PR that ships the change. Order here does not matter;
 * the UI sorts by `publishedAt`, newest first.
 *
 * `id` is what read state is keyed on, and that state lives in the reader's
 * browser. Never reuse or renumber an id: an entry that changes id comes back as
 * unread for everyone, and an entry that inherits a retired id is never seen.
 *
 * Keep `title` under ~50 characters — the card is 224px wide and clamps to two
 * lines. `summary` is only rendered in the full list, so it can breathe.
 */

export type AnnouncementKind = "new" | "improvement" | "fix";

export interface AnnouncementLink {
  /** In-app route, e.g. "/dashboard/inbox". */
  readonly to: string;
  /** Optional search params for the route, e.g. `{ tab: "spam" }`. */
  readonly search?: Record<string, unknown>;
  /** Call to action; falls back to "Take a look". */
  readonly label?: string;
}

export interface Announcement {
  /** Stable, never reused. Convention: `YYYY-MM-DD-short-slug`. */
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  /** ISO date (YYYY-MM-DD). */
  readonly publishedAt: string;
  readonly kinds: readonly AnnouncementKind[];
  /** Product area chip, e.g. "Inbox". Keep to one or two words. */
  readonly area?: string;
  readonly link?: AnnouncementLink;
}

export const ANNOUNCEMENTS: readonly Announcement[] = [
  {
    id: "2026-08-22-conversation-packs",
    title: "Buy conversation packs from Billing",
    summary:
      "Running short before the month is out? Buy a conversation pack for 5,000 extra conversations, good for 30 days. It is a one-off charge — nothing renews and there is nothing to cancel — and packs stack, so buy as many as you need. Packs top up a paid plan: on Free the answer is still to upgrade, which raises every limit rather than just conversations, and Enterprise is already invoiced on the usage it actually runs.",
    publishedAt: "2026-08-22",
    kinds: ["new"],
    area: "Billing",
    link: { to: "/dashboard/settings/billing", label: "See packs" },
  },
  {
    id: "2026-08-22-five-tier-plans",
    title: "A new plan sits between Plus and Max",
    summary:
      "Starter is now Plus and the old Pro is now Max — same price, same limits, nothing to do. A new Pro plan fills the gap between them at 40,000 conversations and form submissions a month, with 5 teams and 30 users, so scaling past 10,000 no longer means jumping straight to the top tier. Existing subscriptions were renamed in place: your price, your allowances and your renewal date are all unchanged.",
    publishedAt: "2026-08-22",
    kinds: ["new", "improvement"],
    area: "Billing",
    link: { to: "/dashboard/settings/billing", label: "See the plans" },
  },
  {
    id: "2026-08-22-plan-usage-banner",
    title: "A heads-up when you run out of an allowance",
    summary:
      "A line now sits above the dashboard whenever your organisation has used up an allowance for the billing period — conversations, form submissions, seats or AI tokens — so a feature going quiet is explained rather than mysterious. Admins also get an in-app notification and the account owner gets an email, at most once a week. Free organisations see a dismissible note about upgrading; paid ones are only nudged once an allowance is most of the way gone, not while there is room to spare.",
    publishedAt: "2026-08-22",
    kinds: ["new"],
    area: "Billing",
    link: { to: "/dashboard/settings/billing", label: "See your usage" },
  },
  {
    id: "2026-08-22-plans-return-to-free",
    title: "Cancelled plans now return to Free",
    summary:
      "When a subscription is cancelled or its paid period runs out, the organisation now moves back to the Free plan and its limits, one day after the period ends. Until now a cancelled or lapsed plan kept its full allowances indefinitely. Cancelling still keeps everything you paid for until the end of the current period — nothing changes mid-cycle — and you can resubscribe at any time from Billing.",
    publishedAt: "2026-08-22",
    kinds: ["improvement"],
    area: "Billing",
    link: { to: "/dashboard/settings/billing", label: "Open billing" },
  },
  {
    id: "2026-08-20-billing-invoices-and-charges",
    title: "Change plans, and see invoices, on billing",
    summary:
      "You can now move between plans without cancelling first: Change plan on an active subscription schedules the switch without you cancelling first — downgrades take effect at your next renewal so you keep what you have already paid for, and upgrades apply straight away where your bank mandate allows it (the dialog tells you which before you confirm). The page also shows what you will be charged and when, what your plan includes, and one Billing History covering every charge — renewals included, which the old order list never showed — with a Download link for each invoice and Details that actually opens.",
    publishedAt: "2026-08-20",
    kinds: ["new", "improvement"],
    area: "Billing",
    link: { to: "/dashboard/settings/billing", label: "Open billing" },
  },
  {
    id: "2026-08-17-pipeline-feature-access",
    title: "Pipeline is its own team permission",
    summary:
      "Feature Access on a team now lists Pipeline alongside Tickets, so you can give a team the board without the ticket queue or the other way round. Until now the pipeline rode the Tickets permission. Teams that already had Tickets on keep seeing Tickets, but Pipeline starts off — switch it on for each team that works a board, under Settings → Teams → a team → Feature Access.",
    publishedAt: "2026-08-17",
    kinds: ["new", "improvement"],
    area: "Pipeline",
    link: { to: "/dashboard/settings/team", label: "Open teams" },
  },
  {
    id: "2026-08-15-inbox-sending-feedback",
    title: "Sends show up straight away in the inbox",
    summary:
      "A message, template or flow now appears in the conversation the moment you send it, marked with a clock until WhatsApp confirms it — templates show the card you previewed and flows their invitation message and button, rather than the thread sitting unchanged until the send completes. A send that fails now says so instead of passing quietly.",
    publishedAt: "2026-08-15",
    kinds: ["improvement", "fix"],
    area: "Inbox",
    link: { to: "/dashboard/inbox", label: "Open inbox" },
  },
  {
    id: "2026-08-14-flows-per-number",
    title: "Flows now belong to a WhatsApp number",
    summary:
      "WhatsApp scopes a flow to the number it was created on, so a flow from one number cannot be sent or attached to a template built on another. Creating a flow now asks which number it is for, and the Flow picker on a template's button only offers flows from the number that template is being created on. If a template still points at a flow from another number, saving it now says so instead of failing with WhatsApp's \"invalid parameter\". Existing flows stay on your first connected number.",
    publishedAt: "2026-08-14",
    kinds: ["improvement", "fix"],
    area: "Flows",
    link: { to: "/dashboard/whatsapp/flows", label: "Open flows" },
  },
  {
    id: "2026-08-13-wa-display-name",
    title: "Manage your WhatsApp channel and profile",
    summary:
      "Editing a WhatsApp number now opens three tabs. Channel is your own label for the number inside RateUp, saved on its own without touching Meta. Display name is what customers see in WhatsApp — submit a new one for review, check where it stands with Sync from Meta, then re-register the number once approved. Profile is the photo, about line, description, category, address, email and websites customers see when they open your business; upload a JPEG or PNG up to 5 MB to change the photo. Manually configured numbers get the same sections on their card.",
    publishedAt: "2026-08-13",
    kinds: ["new", "improvement"],
    area: "Channels",
    link: { to: "/dashboard/settings/channels", label: "Open channels" },
  },
  {
    id: "2026-08-13-team-pipelines",
    title: "Send each team's contacts to its own board",
    summary:
      "Lifecycle setup now carries a Team pipelines section: pick the board each team works, and turn on Auto-add contacts to have a lead open there the moment a contact reaches a lifecycle stage that board maps — Sales onto the sales pipeline, Support onto theirs. The lead lands in the column for that stage, and a contact already on the board is left alone. Teams pointing at the same pipeline share one lead rather than opening one each. Changing a contact's lifecycle anywhere — the contacts table, the inbox, an automation — now also moves their existing leads into the matching column, so the board and the customer record never disagree.",
    publishedAt: "2026-08-13",
    kinds: ["new"],
    area: "Pipeline",
    link: { to: "/dashboard/contacts/lifecycle", label: "Open lifecycle setup" },
  },
  {
    id: "2026-08-12-lead-pipeline",
    title: "Lead Pipeline",
    summary:
      'A new Pipeline section in the sidebar turns your conversations into a sales board. Its columns are your contact lifecycle stages, so a board speaks the same language as the inbox and moving a lead updates the contact automatically — add a lifecycle stage and the column appears on every pipeline. Drag leads between stages, or onto the Lost zone to close them out. Each stage carries a win probability and a rotting window, so leads that go quiet surface themselves as "Needs attention" instead of being forgotten. Leads are worked by a set of assignees rather than a single owner, so a handover adds a name to the card instead of replacing one. Beyond the board there are four more views: a grouped List with bulk reassign, a Forecast that weights each open lead by its stage probability, Insights covering the funnel, where leads stall, sources and per-assignee win rates, and Settings for stages, lost reasons and the automation rules. Opening a lead shows its full timeline and notes.',
    publishedAt: "2026-08-12",
    kinds: ["new"],
    area: "Pipeline",
    link: { to: "/dashboard/pipeline", label: "Open the pipeline" },
  },
  {
    id: "2026-08-19-plan-tiers",
    title: "New plans, priced per conversation",
    summary:
      "Free, Starter, Pro and Enterprise replace the old catalog. Your allowance is now counted in conversations — one 24-hour window with a customer on any channel — rather than inbox tickets, so a thread that stays open no longer ties up your quota. Upgrading from billing only offers plans above your current one.",
    publishedAt: "2026-08-19",
    kinds: ["new", "improvement"],
    area: "Billing",
    link: { to: "/dashboard/settings/billing", label: "See your plan" },
  },
  {
    id: "2026-08-11-meta-agent-rebuild",
    title: "Meta Business Agent, rebuilt",
    summary:
      "Every area of the agent — Overview, Knowledge, Skills, UI Skills, Connectors, Settings and Operate — is now its own page, listed under Meta AI Agent in the main sidebar, so you no longer drill in and out of cards to move between them. New: UI skills, so the agent can answer with carousels, link buttons and WhatsApp Flows; a connector workspace with per-tool definitions, a live test runner and Meta's error logs; never-say phrases and an eval runner that picks scenarios from a list. Every form now validates against Meta's own limits before it sends — required fields are marked, phone numbers use the country picker, and a rejected value is shown against the field rather than as a toast.",
    publishedAt: "2026-08-11",
    kinds: ["new", "improvement"],
    area: "AI Agent",
    link: { to: "/dashboard/meta-agent", label: "Open the agent" },
  },
  {
    id: "2026-08-07-inbox-settings-redesign",
    title: "Inbox Settings, rebuilt",
    summary:
      "Inbox Settings has a new layout with everything on one row of tabs, and two new ones: Teams shows which teams conversations can be assigned to and who is on each, and Channels shows the accounts the inbox receives on and whether each is still connected. Quick replies and automation are unchanged, just relocated.",
    publishedAt: "2026-08-07",
    kinds: ["improvement"],
    area: "Inbox",
    link: { to: "/dashboard/inbox", search: { tab: "settings" }, label: "Open settings" },
  },
  {
    id: "2026-08-07-conversation-tags",
    title: "Conversation tags, separate from contact labels",
    summary:
      "Tickets can now carry their own tags. A conversation tag describes one ticket — Bug Report, Escalated, Follow-up — while a label stays on the customer and shows on every ticket they open; the sidebar names them apart as Conversation Tags and Contact Labels, and both filter the list. Create and rename either one under Inbox Settings.",
    publishedAt: "2026-08-07",
    kinds: ["new"],
    area: "Inbox",
    link: { to: "/dashboard/inbox", search: { tab: "settings" }, label: "Manage tags" },
  },
  {
    id: "2026-08-05-campaign-whatsapp-participants",
    title: "Campaigns only pick WhatsApp contacts",
    summary:
      "Adding participants to a campaign now lists only WhatsApp contacts — Instagram and Facebook Messenger contacts are left out — and a group's member count reflects the WhatsApp members it holds, so the people you add are the people the campaign can actually message.",
    publishedAt: "2026-08-05",
    kinds: ["improvement"],
    area: "Campaigns",
    link: { to: "/dashboard/campaign", label: "Open campaigns" },
  },
  {
    id: "2026-08-05-ig-comment-post-link",
    title: "Jump to the post a comment is on",
    summary:
      "An Instagram comment in the inbox now carries a View post link that opens the original post on instagram.com, so you can see what the customer is replying to before you answer.",
    publishedAt: "2026-08-05",
    kinds: ["new"],
    area: "Inbox",
    link: { to: "/dashboard/inbox", search: { tab: "open" }, label: "Open inbox" },
  },
  {
    id: "2026-07-25-docs-shortcut",
    title: "Documentation is one click away",
    summary:
      "A book icon now sits in the sidebar rail, next to the theme toggle and What's new. It opens docs.rateup.app in a new tab from wherever you are in the app.",
    publishedAt: "2026-07-25",
    kinds: ["new"],
    area: "Navigation",
  },
  {
    id: "2026-07-25-inbox-channel-filter",
    title: "Channel filter moved to the sidebar",
    summary:
      "Pick the channel you are working in from the inbox sidebar, alongside lifecycle, labels, users and teams — it scopes every tab. The advanced filters popover in the conversation list is gone.",
    publishedAt: "2026-07-25",
    kinds: ["improvement"],
    area: "Inbox",
    link: { to: "/dashboard/inbox", search: { tab: "open" }, label: "Open inbox" },
  },
  {
    id: "2026-07-23-spam-tab",
    title: "Spam has its own tab",
    summary:
      "Flag a contact as spam and every conversation with them leaves your working tabs for the new Spam tab. The flag is per contact, so unflagging brings the whole history back.",
    publishedAt: "2026-07-23",
    kinds: ["new"],
    area: "Inbox",
    link: { to: "/dashboard/inbox", search: { tab: "spam" }, label: "Open Spam" },
  },
  {
    id: "2026-07-22-inbox-conversations",
    title: "The inbox is conversation-first",
    summary:
      "Each row is now a conversation rather than a contact, so a contact who writes back after a closed ticket opens a fresh one — the resolved thread stays resolved, and Mine, Mentions and Spam counts follow the same grain.",
    publishedAt: "2026-07-22",
    kinds: ["improvement"],
    area: "Inbox",
    link: { to: "/dashboard/inbox", label: "Open inbox" },
  },
  {
    id: "2026-07-22-team-channel-permissions",
    title: "Per-team channel permissions",
    summary:
      "Decide which teams can see and reply on which channels. Agents only get the conversations their team is entitled to, and assignment respects the same boundary.",
    publishedAt: "2026-07-22",
    kinds: ["new"],
    area: "Settings",
    link: { to: "/dashboard/settings/team", label: "Manage teams" },
  },
  {
    id: "2026-07-22-survey-builder",
    title: "Rebuilt survey builder",
    summary:
      "Question editing, settings and theming are now separate panes, so you can restyle a survey without touching its questions — and preview the result as you go.",
    publishedAt: "2026-07-22",
    kinds: ["new", "improvement"],
    area: "Surveys",
    link: { to: "/dashboard/surveys", label: "Open surveys" },
  },
];
