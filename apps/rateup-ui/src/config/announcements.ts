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
 * lines — and `summary` to one or two sentences. Customers read these, and they
 * want what changed and what it means for them, not how it was built: no
 * reasoning, no edge cases, no internal names. The rest belongs in the PR.
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
    id: "2026-09-30-shopify-cart-reminder-results",
    title: "See the revenue your cart reminders bring back",
    summary:
      "The Shopify page now has a Results tab with orders and revenue recovered by your abandoned-cart reminders. Their links are tagged so Shopify's own reports credit WhatsApp too.",
    publishedAt: "2026-09-30",
    kinds: ["new"],
    area: "Shopify",
    link: { to: "/dashboard/settings/integrations/shopify" },
  },
  {
    id: "2026-09-30-shopify-cart-reminders",
    title: "Abandoned-cart reminders, sent on time",
    summary:
      "Choose how long a Shopify checkout sits untouched before your reminder goes out, and add a second rule for a follow-up. Reminders stop as soon as the order comes through.",
    publishedAt: "2026-09-30",
    kinds: ["improvement"],
    area: "Automation",
  },

  {
    id: "2026-09-26-quick-reply-media",
    title: "Quick replies with images, audio and video",
    summary:
      "Attach images, voice notes or videos to a quick reply in Inbox Settings, and they are added to your message when you use it.",
    publishedAt: "2026-09-26",
    kinds: ["new"],
    area: "Inbox",
    link: { to: "/dashboard/inbox", search: { tab: "settings" } },
  },
  {
    id: "2026-09-26-inbox-one-click-assign",
    title: "Assign a chat in one click",
    summary:
      "Click the assignee in a chat's side panel (or press A), search for a teammate and pick them. You can also let a team hand the chat to whoever's turn it is.",
    publishedAt: "2026-09-26",
    kinds: ["improvement"],
    area: "Inbox",
    link: { to: "/dashboard/inbox" },
  },

  {
    id: "2026-09-25-notification-settings",
    title: "Choose your own notifications",
    summary:
      "Pick what RateUp tells you about and where: in the app, on your phone, by email or as desktop alerts. Find it under Settings → Notifications.",
    publishedAt: "2026-09-25",
    kinds: ["new"],
    area: "Settings",
    link: { to: "/dashboard/settings/notifications", label: "Open settings" },
  },
  {
    id: "2026-09-25-pipeline-import",
    title: "Import cards from a spreadsheet",
    summary:
      "Bring leads, tickets or tasks into any pipeline from a CSV or Excel file. Download the board's template, fill it in and upload it.",
    publishedAt: "2026-09-25",
    kinds: ["new"],
    area: "Pipeline",
    link: { to: "/dashboard/pipeline" },
  },
  {
    id: "2026-09-25-pipeline-types",
    title: "More boards in Pipeline",
    summary:
      "Add Support, Projects or Custom boards alongside your Leads pipeline, each with its own columns. The inbox and automations keep using your Leads pipeline.",
    publishedAt: "2026-09-25",
    kinds: ["new"],
    area: "Pipeline",
    link: { to: "/dashboard/pipeline" },
  },
  {
    id: "2026-09-23-meta-agent-rateup-connector",
    title: "Your AI agent can use RateUp data",
    summary:
      "Install the RateUp connector in one click and your AI agent can check a customer's loyalty points and rewards, and label, move or route their conversation to the right team.",
    publishedAt: "2026-09-23",
    kinds: ["new"],
    area: "AI Agent",
    link: { to: "/dashboard/meta-agent/connectors", label: "Open connectors" },
  },
  {
    id: "2026-09-23-meta-agent-insights",
    title: "AI agent insights and usage caps",
    summary:
      "A new Insights page shows how many conversations your AI agent handled, which chats are waiting on your team, and how your tools performed. On Go live you can now cap the agent's usage so costs stay predictable.",
    publishedAt: "2026-09-23",
    kinds: ["new"],
    area: "AI Agent",
    link: { to: "/dashboard/meta-agent/insights", label: "Open insights" },
  },
  {
    id: "2026-09-23-meta-agent-handoff-message",
    title: "Choose your AI agent's handoff message",
    summary:
      "When the agent hands a customer to your team, it can now use Meta's standard line, write its own, or send yours. Releasing the conversation to your team is now a separate switch.",
    publishedAt: "2026-09-23",
    kinds: ["improvement"],
    area: "AI Agent",
    link: { to: "/dashboard/meta-agent/settings", label: "Open Go live" },
  },
  {
    id: "2026-09-23-qr-codes-link-pages",
    title: "QR codes and link pages, redesigned",
    summary:
      "QR Studio is now QR & Links: QR Creator is QR codes and Access Links is Link pages. The link page editor shows a live phone preview as you add links and change the look.",
    publishedAt: "2026-09-23",
    kinds: ["improvement"],
    area: "QR & Links",
    link: { to: "/dashboard/link-pages", label: "Open link pages" },
  },
  {
    id: "2026-09-22-meta-ai-handover-badge",
    title: "See when Meta AI hands a chat to you",
    summary:
      "The inbox now shows whether Meta AI or your team is answering each customer, and lets you hand a chat back to Meta AI. Closing a ticket hands it back automatically; you can turn that off in the agent's settings.",
    publishedAt: "2026-09-22",
    kinds: ["new"],
    area: "Inbox",
    link: { to: "/dashboard/inbox", label: "Open the inbox" },
  },
  {
    id: "2026-09-22-meta-agent-setup-flow",
    title: "A guided setup for your AI agent",
    summary:
      "Meta AI Agent now opens on a setup guide that walks you from connecting with Meta to going live, with your progress shown as you go. Every page has Back and Continue, so you can follow the steps in order.",
    publishedAt: "2026-09-22",
    kinds: ["improvement"],
    area: "AI Agent",
    link: { to: "/dashboard/meta-agent/overview", label: "Open the setup guide" },
  },
  {
    id: "2026-09-20-fine-tune-abilities",
    title: "Each member on their own page",
    summary:
      "Click a name in Settings → Members to open that person's page: their role, teams and profile on one tab, and everything they have changed on an Activity tab. You can also add an ability their role lacks or take one away.",
    publishedAt: "2026-09-20",
    kinds: ["new"],
    area: "Settings",
    link: { to: "/dashboard/settings/members", label: "Open Members" },
  },
  {
    id: "2026-09-20-members-and-roles",
    title: "Members and roles, in one place",
    summary:
      "Settings → Members now lists everyone with their role and teams, and a new Roles page shows exactly what each of the six roles can do. Roles decide what a person may do; teams decide where.",
    publishedAt: "2026-09-20",
    kinds: ["new", "improvement"],
    area: "Settings",
    link: { to: "/dashboard/settings/members", label: "Open Members" },
  },
  {
    id: "2026-09-19-analytics-redesign",
    title: "Analytics, now loads faster with a clean UI",
    summary:
      "Analytics is now Overview, Conversations, Messages and Logs, with one set of filters that applies everywhere, including by team. The Overview puts conversation and WhatsApp delivery health side by side, with changes against the previous period.",
    publishedAt: "2026-09-19",
    kinds: ["improvement"],
    area: "Analytics",
    link: { to: "/dashboard/analytics", label: "Open Analytics" },
  },
  {
    id: "2026-09-18-integrations-redesign",
    title: "Integrations, redesigned",
    summary:
      "Every integration page now shares one layout, and the status line names what you actually connected instead of showing a generic badge. Forms, empty states and page width are consistent across all of them.",
    publishedAt: "2026-09-18",
    kinds: ["improvement"],
    area: "Integrations",
    link: { to: "/dashboard/settings/integrations", label: "Open Integrations" },
  },
  {
    id: "2026-09-18-admins-manage-teams",
    title: "Admins can now invite and manage team members",
    summary:
      "Admins can now invite users into a team, manage its members and edit its settings. Creating and deleting teams, Feature Access and granting Super Admin stay with the owner.",
    publishedAt: "2026-09-18",
    kinds: ["improvement"],
    area: "Settings",
    link: { to: "/dashboard/settings/team", label: "Open Teams" },
  },
  {
    id: "2026-09-17-settings-ui-improvements",
    title: "Settings menu improvements",
    summary: "General UI improvements across the settings menu.",
    publishedAt: "2026-09-17",
    kinds: ["improvement"],
    area: "Settings",
    link: { to: "/dashboard/settings/account", label: "Open Settings" },
  },
  {
    id: "2026-09-12-loyalty-keyword-menu-chatbot",
    title: "Turn your keyword replies into a tappable menu",
    summary:
      "Messages has a new Chatbot tab that turns your keyword replies into a tappable WhatsApp menu. Customers pick from a list instead of having to know that POINTS or REFER are the magic words.",
    publishedAt: "2026-09-12",
    kinds: ["new"],
    area: "Loyalty",
    link: {
      to: "/dashboard/loyalty/messages",
      search: { tab: "chatbot" },
      label: "Open Messages",
    },
  },
  {
    id: "2026-09-11-loyalty-message-opens-editor",
    title: "Loyalty messages open straight in the template editor",
    summary:
      "Loyalty messages now open straight in the WhatsApp template editor, and nothing is saved until you save it yourself. A draft you started shows up on the message card, ready to carry on.",
    publishedAt: "2026-09-11",
    kinds: ["improvement", "fix"],
    area: "Loyalty",
    link: {
      to: "/dashboard/loyalty/messages",
      search: { tab: "automatic" },
      label: "Open Messages",
    },
  },
  {
    id: "2026-09-11-brochure-background-colour",
    title: "Brochure: your photo in the header, any background",
    summary:
      "Your hero photo is now the background of the rewards brochure header, and the card background is a full colour picker rather than eleven fixed papers. Text and accent colours adjust to stay readable on whatever you choose.",
    publishedAt: "2026-09-11",
    kinds: ["improvement"],
    area: "Loyalty",
    link: {
      to: "/dashboard/loyalty/materials",
      search: { tab: "brochure" },
      label: "Open Materials",
    },
  },
  {
    id: "2026-09-11-activity-customer-links",
    title: "Open a customer from the Activity ledger",
    summary:
      "Customer names on the Activity ledger are now links that open that member's full record. The page can also be bookmarked, reloaded and shared.",
    publishedAt: "2026-09-11",
    kinds: ["improvement"],
    area: "Loyalty",
    link: { to: "/dashboard/loyalty/activity", label: "Open Activity" },
  },
  {
    id: "2026-09-10-loyalty-reminders",
    title: "Reminders: choose when each one sends",
    summary:
      "Scheduled messages, such as birthdays, quiet customers and expiring points, now have their own Reminders page where you set how far ahead and what hour each one sends, in your own time zone. Three new occasions were added, including a warning before a member loses their VIP tier.",
    publishedAt: "2026-09-10",
    kinds: ["new", "fix"],
    area: "Loyalty",
    link: { to: "/dashboard/loyalty/reminders", label: "Open Reminders" },
  },
  {
    id: "2026-09-10-flow-purpose-grid",
    title: "Creating a Flow starts with what it is for",
    summary:
      "Creating a Flow now starts with what it is for, from sign up and booking to support and surveys, and that choice sets the flow's category for you. One fewer thing to fill in later.",
    publishedAt: "2026-09-10",
    kinds: ["improvement", "fix"],
    area: "WhatsApp",
    link: {
      to: "/dashboard/whatsapp/flows",
      search: { action: "create" },
      label: "Create a Flow",
    },
  },
  {
    id: "2026-09-10-loyalty-feedback",
    title: "Feedback: a WhatsApp survey after every visit",
    summary:
      "A new Feedback page sends a WhatsApp survey a set time after a customer earns points, with ready-made questions for your kind of business. Happy customers are asked to leave a Google review, and you can reward them for it.",
    publishedAt: "2026-09-10",
    kinds: ["new"],
    area: "Loyalty",
    link: { to: "/dashboard/loyalty/feedback", label: "Set up Feedback" },
  },
  {
    id: "2026-09-10-rewards-per-tier-brochure-redesign",
    title: "Rewards per tier, and a new brochure",
    summary:
      "Rewards can now be set per tier, so a perk can be Gold-only. The rewards brochure has been redrawn as a menu card in your brand colour.",
    publishedAt: "2026-09-10",
    kinds: ["new", "improvement"],
    area: "Loyalty",
    link: {
      to: "/dashboard/loyalty/materials",
      search: { tab: "brochure" },
      label: "Open the brochure",
    },
  },
  {
    id: "2026-09-10-loyalty-three-tiers",
    title: "Loyalty tiers: up to three, with members re-placed on save",
    summary:
      "Loyalty now takes up to three tiers. Save the ladder and every member is re-placed on the tier their spend earns, with promotions messaged as usual.",
    publishedAt: "2026-09-10",
    kinds: ["new", "improvement"],
    area: "Loyalty",
    link: { to: "/dashboard/loyalty/program", search: { section: "tiers" }, label: "Open Tiers" },
  },
  {
    id: "2026-09-10-program-sections-full-editors",
    title: "Program: every section opens its full editor",
    summary:
      "Sections on the Loyalty Program page now open their full editor at full width, instead of a short form with a link to the real one.",
    publishedAt: "2026-09-10",
    kinds: ["improvement"],
    area: "Loyalty",
    link: { to: "/dashboard/loyalty/program", label: "Open Program" },
  },
  {
    id: "2026-09-10-cashier-add-from-contacts",
    title: "Cashier: add from contacts, birthday and gender",
    summary:
      "The cashier can now enrol someone from your existing contacts instead of retyping their details. The register form also takes an optional date of birth and gender.",
    publishedAt: "2026-09-10",
    kinds: ["new", "improvement"],
    area: "Loyalty",
    link: { to: "/dashboard/loyalty/cashier", label: "Open the cashier" },
  },
  {
    id: "2026-09-09-loyalty-materials",
    title: "Loyalty Materials: QR card and rewards brochure",
    summary:
      "A new Materials page holds the print-ready pieces for your venue: the counter QR card, and a rewards brochure you can edit, download and print.",
    publishedAt: "2026-09-09",
    kinds: ["new"],
    area: "Loyalty",
    link: { to: "/dashboard/loyalty/materials", label: "Open Materials" },
  },
  {
    id: "2026-09-09-loyalty-onboarding-profile-launch",
    title: "Loyalty setup: profile, VIP tier and a QR poster",
    summary:
      "Loyalty setup now opens with a branding profile that seeds every later step for your kind of business, and ends with a printable QR poster. Points from a web signup are held until the customer's first real activity, so bots gain nothing.",
    publishedAt: "2026-09-09",
    kinds: ["new", "improvement"],
    area: "Loyalty",
    link: { to: "/dashboard/loyalty/onboarding", label: "Open setup" },
  },
  {
    id: "2026-09-08-loyalty-onboarding-simplified",
    title: "Simplified loyalty onboarding flow",
    summary:
      "Setting up loyalty is now a guided six-step flow that fills in points, tiers, rewards and WhatsApp messages tuned to your kind of business. The Loyalty menu is down from eleven entries to seven, with a new Overview leading on what your programme gives back.",
    publishedAt: "2026-09-08",
    kinds: ["new", "improvement", "fix"],
    area: "Loyalty",
    link: { to: "/dashboard/loyalty/program", label: "Open Program" },
  },
  {
    id: "2026-09-15-campaign-auto-pause",
    title: "Campaigns pause when your account can't send",
    summary:
      "A campaign now pauses instead of failing when your conversation allowance runs out or Meta rejects your payment method. Fix the cause and Resume sends to exactly the people who were missed.",
    publishedAt: "2026-09-15",
    kinds: ["improvement"],
    area: "Campaigns",
    link: { to: "/dashboard/campaign", label: "Open campaigns" },
  },
  {
    id: "2026-09-12-inbox-channel-on-ticket",
    title: "See which number a ticket came in on",
    summary:
      "Every inbox row now shows which of your numbers the ticket came in on, read from the ticket's own messages. A number you have since disconnected is still named and marked.",
    publishedAt: "2026-09-12",
    kinds: ["new"],
    area: "Inbox",
    link: { to: "/dashboard/inbox", label: "Open inbox" },
  },
  {
    id: "2026-09-12-inbox-delete-conversation",
    title: "Delete a conversation",
    summary:
      "Admins can now delete a conversation and all its messages outright, one at a time or several at once. The contact and their other tickets are left untouched.",
    publishedAt: "2026-09-12",
    kinds: ["new"],
    area: "Inbox",
    link: { to: "/dashboard/inbox", label: "Open inbox" },
  },
  {
    id: "2026-09-11-facebook-page-picker",
    title: "Pick your Page for Messenger and Instagram",
    summary:
      "Connecting Messenger or Instagram now shows your Pages as a list that refreshes itself, so a Page you only just granted appears without pressing sync. Pages that cannot be used are greyed out before you pick them.",
    publishedAt: "2026-09-11",
    kinds: ["improvement"],
    area: "Channels",
    link: { to: "/dashboard/settings/channels", label: "Open channels" },
  },
  {
    id: "2026-09-08-inbox-image-download",
    title: "Save an image from the inbox",
    summary:
      "Images in a conversation now carry a download button, on the thumbnail and again in the full-size view.",
    publishedAt: "2026-09-08",
    kinds: ["new"],
    area: "Inbox",
    link: { to: "/dashboard/inbox", label: "Open inbox" },
  },
  {
    id: "2026-09-08-campaign-retry-failed",
    title: "Retry a campaign's failures from Overview",
    summary:
      "A finished campaign now shows its failures on Overview with one button to re-send to them. Messages rejected the instant they were sent are now retried too, which they never used to be.",
    publishedAt: "2026-09-08",
    kinds: ["new", "improvement", "fix"],
    area: "Campaigns",
    link: { to: "/dashboard/campaign", label: "Open campaigns" },
  },
  {
    id: "2026-09-08-campaign-resume-when",
    title: "Choose when a paused campaign resumes",
    summary:
      "Resuming a paused campaign now asks when: keep the original schedule, send immediately, or pick a new time. The numbers across Overview were renamed to say what they actually count.",
    publishedAt: "2026-09-08",
    kinds: ["new", "improvement"],
    area: "Campaigns",
    link: { to: "/dashboard/campaign", label: "Open campaigns" },
  },
  {
    id: "2026-09-07-campaign-page-controls",
    title: "Pause a campaign, retry one recipient",
    summary:
      "A sending campaign can now be paused and picked back up without messaging anyone twice. A single failed recipient can also be retried on its own.",
    publishedAt: "2026-09-07",
    kinds: ["new", "improvement"],
    area: "Campaigns",
    link: { to: "/dashboard/campaign", label: "Open campaigns" },
  },
  {
    id: "2026-09-06-campaign-wizard",
    title: "Campaigns: a guided setup, and retries",
    summary:
      "Creating a campaign is now a six-step guided flow, saved as a draft as you go, with a live preview and a test send before you commit. The campaign page adds an Analytics tab, and campaign status finally reads accurately.",
    publishedAt: "2026-09-06",
    kinds: ["new", "improvement"],
    area: "Campaigns",
    link: { to: "/dashboard/campaign", label: "Create a campaign" },
  },
  {
    id: "2026-08-31-channels-page-rebuilt",
    title: "Channels, rebuilt to match setup",
    summary:
      "Settings then Channels is now laid out like the setup guide, one row per channel with its status and its action. Nothing moved and nothing was removed.",
    publishedAt: "2026-08-31",
    kinds: ["improvement"],
    area: "Channels",
    link: { to: "/dashboard/settings/channels", label: "Open channels" },
  },
  {
    id: "2026-08-31-setup-guide-v2",
    title: "A rebuilt setup guide",
    summary:
      "The setup guide now lives inside the app as Get started in the sidebar, ordered around the three Meta steps that actually block you from sending. Channels connect in place, and anything optional can be skipped.",
    publishedAt: "2026-08-31",
    kinds: ["improvement"],
    area: "Onboarding",
    link: { to: "/dashboard/setup", label: "Open the setup guide" },
  },
  {
    id: "2026-08-29-ticket-boards-retired",
    title: "Ticket boards have been retired",
    summary:
      "The Tickets board is no longer part of RateUp. Use the Inbox, where every conversation is already a ticket, or a Pipeline board for anything sales-shaped.",
    publishedAt: "2026-08-29",
    kinds: ["improvement"],
    area: "Tickets",
    link: { to: "/dashboard/inbox", search: { tab: "open" }, label: "Open the Inbox" },
  },
  {
    id: "2026-08-28-lifecycle-to-pipeline-stages",
    title: "Lifecycle stages are now pipeline stages",
    summary:
      "Pipeline columns are now the board's own, named for your sales process and each marked Open, Won or Lost. Contact lifecycle is unchanged; the two are simply no longer tied together.",
    publishedAt: "2026-08-28",
    kinds: ["new", "improvement"],
    area: "Pipeline",
    link: { to: "/dashboard/pipeline", label: "Open the pipeline" },
  },
  {
    id: "2026-08-22-conversation-packs",
    title: "Buy conversation packs from Billing",
    summary:
      "Buy a one-off pack of 5,000 extra conversations from Billing, good for 30 days. Nothing renews, and packs stack.",
    publishedAt: "2026-08-22",
    kinds: ["new"],
    area: "Billing",
    link: { to: "/dashboard/settings/billing", search: { tab: "usage" }, label: "See packs" },
  },
  {
    id: "2026-08-22-five-tier-plans",
    title: "A new plan sits between Plus and Max",
    summary:
      "A new Pro plan fills the gap between Plus and Max at 40,000 conversations a month. Existing subscriptions were renamed in place, with no change to price, allowances or renewal date.",
    publishedAt: "2026-08-22",
    kinds: ["new", "improvement"],
    area: "Billing",
    link: { to: "/dashboard/settings/billing", label: "See the plans" },
  },
  {
    id: "2026-08-22-plan-usage-banner",
    title: "A heads-up when you run out of an allowance",
    summary:
      "A banner now appears when your organisation has used up an allowance for the billing period, so a feature going quiet is explained rather than mysterious. Admins are notified in-app and the owner by email, at most once a week.",
    publishedAt: "2026-08-22",
    kinds: ["new"],
    area: "Billing",
    link: { to: "/dashboard/settings/billing", label: "See your usage" },
  },
  {
    id: "2026-08-22-plans-return-to-free",
    title: "Cancelled plans now return to Free",
    summary:
      "A cancelled or lapsed plan now returns to Free limits a day after the paid period ends. Nothing changes mid-cycle, and you can resubscribe at any time.",
    publishedAt: "2026-08-22",
    kinds: ["improvement"],
    area: "Billing",
    link: { to: "/dashboard/settings/billing", label: "Open billing" },
  },
  {
    id: "2026-08-20-billing-invoices-and-charges",
    title: "Change plans, and see invoices, on billing",
    summary:
      "You can now switch plans without cancelling first, and Billing shows what you will be charged and when. One Billing History covers every charge, renewals included, with a downloadable invoice for each.",
    publishedAt: "2026-08-20",
    kinds: ["new", "improvement"],
    area: "Billing",
    link: { to: "/dashboard/settings/billing", label: "Open billing" },
  },
  {
    id: "2026-08-17-pipeline-feature-access",
    title: "Pipeline is its own team permission",
    summary:
      "Pipeline is now its own team permission instead of riding on Tickets. Switch it on for each team that works a board.",
    publishedAt: "2026-08-17",
    kinds: ["new", "improvement"],
    area: "Pipeline",
    link: { to: "/dashboard/settings/team", label: "Open teams" },
  },
  {
    id: "2026-08-15-inbox-sending-feedback",
    title: "Sends show up straight away in the inbox",
    summary:
      "A message, template or flow now appears in the conversation the moment you send it, marked with a clock until WhatsApp confirms it. A send that fails now says so instead of passing quietly.",
    publishedAt: "2026-08-15",
    kinds: ["improvement", "fix"],
    area: "Inbox",
    link: { to: "/dashboard/inbox", label: "Open inbox" },
  },
  {
    id: "2026-08-14-flows-per-number",
    title: "Flows now belong to a WhatsApp number",
    summary:
      "Flows now belong to the WhatsApp number they were created on, which is how WhatsApp itself scopes them. Template pickers only offer flows from the matching number.",
    publishedAt: "2026-08-14",
    kinds: ["improvement", "fix"],
    area: "Flows",
    link: { to: "/dashboard/whatsapp/flows", label: "Open flows" },
  },
  {
    id: "2026-08-13-wa-display-name",
    title: "Manage your WhatsApp channel and profile",
    summary:
      "Editing a WhatsApp number now opens three tabs: your own label for it inside RateUp, the display name customers see, and the business profile.",
    publishedAt: "2026-08-13",
    kinds: ["new", "improvement"],
    area: "Channels",
    link: { to: "/dashboard/settings/channels", label: "Open channels" },
  },
  {
    id: "2026-08-13-team-pipelines",
    title: "Send each team's contacts to its own board",
    summary:
      "Pick the board each team works, and a lead opens there automatically when a contact reaches a matching lifecycle stage. Changing a contact's lifecycle now moves their existing leads too.",
    publishedAt: "2026-08-13",
    kinds: ["new"],
    area: "Pipeline",
    link: { to: "/dashboard/contacts/lifecycle", label: "Open lifecycle setup" },
  },
  {
    id: "2026-08-12-lead-pipeline",
    title: "Lead Pipeline",
    summary:
      "A new Pipeline section turns your conversations into a sales board, with leads you drag between stages and assign to several people at once. It comes with List, Forecast, Insights and Settings views alongside the board.",
    publishedAt: "2026-08-12",
    kinds: ["new"],
    area: "Pipeline",
    link: { to: "/dashboard/pipeline", label: "Open the pipeline" },
  },
  {
    id: "2026-08-19-plan-tiers",
    title: "New plans, priced per conversation",
    summary:
      "Free, Starter, Pro and Enterprise replace the old catalog. Your allowance is now counted in conversations rather than inbox tickets, so a thread that stays open no longer ties up your quota.",
    publishedAt: "2026-08-19",
    kinds: ["new", "improvement"],
    area: "Billing",
    link: { to: "/dashboard/settings/billing", label: "See your plan" },
  },
  {
    id: "2026-08-11-meta-agent-rebuild",
    title: "Meta Business Agent, rebuilt",
    summary:
      "Every area of the Meta Business Agent is now its own page under Meta AI Agent in the sidebar. New: UI skills so the agent can answer with carousels and buttons, a connector workspace with a live test runner, and validation against Meta's limits before you send.",
    publishedAt: "2026-08-11",
    kinds: ["new", "improvement"],
    area: "AI Agent",
    link: { to: "/dashboard/meta-agent", label: "Open the agent" },
  },
  {
    id: "2026-08-07-inbox-settings-redesign",
    title: "Inbox Settings, rebuilt",
    summary:
      "Inbox Settings has a new layout with everything on one row of tabs, plus new Teams and Channels tabs. Quick replies and automation are unchanged, just relocated.",
    publishedAt: "2026-08-07",
    kinds: ["improvement"],
    area: "Inbox",
    link: { to: "/dashboard/inbox", search: { tab: "settings" }, label: "Open settings" },
  },
  {
    id: "2026-08-07-conversation-tags",
    title: "Conversation tags, separate from contact labels",
    summary:
      "Tickets can now carry their own tags, separate from the labels that stay on the customer. Both filter the conversation list.",
    publishedAt: "2026-08-07",
    kinds: ["new"],
    area: "Inbox",
    link: { to: "/dashboard/inbox", search: { tab: "settings" }, label: "Manage tags" },
  },
  {
    id: "2026-08-05-campaign-whatsapp-participants",
    title: "Campaigns only pick WhatsApp contacts",
    summary:
      "Adding participants to a campaign now lists only WhatsApp contacts, so the people you add are the people the campaign can actually message.",
    publishedAt: "2026-08-05",
    kinds: ["improvement"],
    area: "Campaigns",
    link: { to: "/dashboard/campaign", label: "Open campaigns" },
  },
  {
    id: "2026-08-05-ig-comment-post-link",
    title: "Jump to the post a comment is on",
    summary:
      "An Instagram comment in the inbox now carries a View post link, so you can see what the customer is replying to before you answer.",
    publishedAt: "2026-08-05",
    kinds: ["new"],
    area: "Inbox",
    link: { to: "/dashboard/inbox", search: { tab: "open" }, label: "Open inbox" },
  },
  {
    id: "2026-07-25-docs-shortcut",
    title: "Documentation is one click away",
    summary:
      "A book icon now sits in the sidebar rail and opens docs.rateup.app in a new tab, from wherever you are in the app.",
    publishedAt: "2026-07-25",
    kinds: ["new"],
    area: "Navigation",
  },
  {
    id: "2026-07-25-inbox-channel-filter",
    title: "Channel filter moved to the sidebar",
    summary:
      "Pick the channel you are working in from the inbox sidebar, alongside lifecycle, labels, users and teams. It scopes every tab.",
    publishedAt: "2026-07-25",
    kinds: ["improvement"],
    area: "Inbox",
    link: { to: "/dashboard/inbox", search: { tab: "open" }, label: "Open inbox" },
  },
  {
    id: "2026-07-23-spam-tab",
    title: "Spam has its own tab",
    summary:
      "Flag a contact as spam and every conversation with them moves to the new Spam tab. The flag is per contact, so unflagging brings the whole history back.",
    publishedAt: "2026-07-23",
    kinds: ["new"],
    area: "Inbox",
    link: { to: "/dashboard/inbox", search: { tab: "spam" }, label: "Open Spam" },
  },
  {
    id: "2026-07-22-inbox-conversations",
    title: "The inbox is conversation-first",
    summary:
      "Each inbox row is now a conversation rather than a contact, so a customer who writes back after a closed ticket opens a fresh one and the resolved thread stays resolved.",
    publishedAt: "2026-07-22",
    kinds: ["improvement"],
    area: "Inbox",
    link: { to: "/dashboard/inbox", label: "Open inbox" },
  },
  {
    id: "2026-09-03-campaigns-on-free",
    title: "Campaigns are open on every plan",
    summary:
      "Campaigns no longer need a paid plan. A free account can build and send one against its 100 monthly conversations.",
    publishedAt: "2026-09-03",
    kinds: ["new"],
    area: "Campaigns",
    link: { to: "/dashboard/campaign", label: "Open campaigns" },
  },
  {
    id: "2026-09-03-campaign-allowance-warning",
    title: "Campaigns warn before they outrun your allowance",
    summary:
      "The send dialog now says how many conversations you have left and how many recipients may not be reached, before the campaign starts rather than after messages have quietly failed.",
    publishedAt: "2026-09-03",
    kinds: ["new"],
    area: "Campaigns",
    link: { to: "/dashboard/campaign", label: "Open campaigns" },
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
      "Question editing, settings and theming are now separate panes, so you can restyle a survey without touching its questions, and preview the result as you go.",
    publishedAt: "2026-07-22",
    kinds: ["new", "improvement"],
    area: "Surveys",
    link: { to: "/dashboard/surveys", label: "Open surveys" },
  },
];
