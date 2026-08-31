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
    id: "2026-08-31-loyalty-earning-rules-rework",
    title: "Earning Rules now shows what your program costs",
    summary:
      'The Earning Rules page never showed your base earning rule — the one number every purchase is scored on — so it could only be changed by rerunning setup. It is now the first thing on the page, and editable, including the points earned per unit spent. Tiers get the same on/off switch as setup, and turning it off now genuinely stops tier earning rather than only stopping promotions. Above both sits the same live cost estimate you saw during setup, which now accounts for tiers: a tier that earns at a multiple raises what you give back, and the estimate says so instead of quoting only the base rate. New tiers are also created at 1x rather than 10x, and the tier rate reads as a multiplier ("2x the base rate") rather than a points-per-currency figure it never was. The ambiguous Add Rule button is gone, replaced by Add tier and Add earning rule in the sections they belong to.',
    publishedAt: "2026-08-31",
    kinds: ["improvement", "fix"],
    area: "Loyalty",
    link: { to: "/dashboard/loyalty/earning-rules", label: "Open earning rules" },
  },
  {
    id: "2026-08-30-loyalty-reward-examples-page",
    title: "Reward examples on the Rewards page too",
    summary:
      "Create Reward on the Rewards page now opens the same picker as setup: reward types with worked examples, each priced against your typical order so it lands where a loyalty program should. Pick one and the create form opens prefilled, with every field still yours to change before it goes live — or start blank as before. Free Gifts gets the picker too, offering the free-item examples. Typical order value has also moved into loyalty settings, so the cost estimates work whether or not you went through setup.",
    publishedAt: "2026-08-30",
    kinds: ["new", "improvement"],
    area: "Loyalty",
    link: { to: "/dashboard/loyalty/rewards", label: "Open rewards" },
  },
  {
    id: "2026-08-30-loyalty-reward-types",
    title: "Free items and cash-off rewards in loyalty setup",
    summary:
      "Setup could only really offer a percentage discount — everything else meant finishing the wizard and hunting through the Rewards page. Add reward now opens a picker with all three kinds: something free, a percentage off, or a flat amount off, each with examples already priced against your typical order so they land where a loyalty program should. Pick one and edit anything, including switching a reward from one kind to another. Removing or renaming a reward in setup now does what it says: renaming updates the reward instead of quietly creating a second one, and removing takes it out (a reward customers already hold is retired rather than deleted).",
    publishedAt: "2026-08-30",
    kinds: ["new", "improvement", "fix"],
    area: "Loyalty",
    link: {
      to: "/dashboard/loyalty/onboarding",
      search: { step: "rewards" },
      label: "Add a reward",
    },
  },
  {
    id: "2026-08-30-loyalty-giveback",
    title: "See what your loyalty program costs you",
    summary:
      "Setting an earn rate and a reward price told you nothing about what the two add up to. Loyalty setup now shows what share of revenue your program gives back, live as you type, with the arithmetic spelled out — and warns when it is more than a typical margin can carry. Each reward carries its own line too, in setup and on the Rewards page: what it is worth in cash, what a customer spends to earn it, and the percentage that works out to. Setup asks for a typical order value to work from, and the starter packs have been repriced — several were giving away more than they took in.",
    publishedAt: "2026-08-30",
    kinds: ["new", "improvement"],
    area: "Loyalty",
    link: { to: "/dashboard/loyalty/onboarding", label: "Open loyalty setup" },
  },
  {
    id: "2026-08-21-loyalty-guided-setup",
    title: "Guided setup for your loyalty program",
    summary:
      "Building a loyalty program used to mean piecing it together across five screens with no idea what good numbers look like. There is now a guided setup that does it in six steps: pick your kind of business and it fills in points, tiers, rewards and WhatsApp messages tuned for it, which you accept or edit as you go. Everything saves as you go and nothing reaches customers until you activate, so you can stop halfway and pick it up later. Loyalty steps have moved out of the general setup checklist, which now covers connecting RateUp itself.",
    publishedAt: "2026-08-21",
    kinds: ["new", "improvement"],
    area: "Loyalty",
    link: { to: "/dashboard/loyalty/onboarding", label: "Set up your program" },
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
