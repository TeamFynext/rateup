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
    id: "2026-09-12-loyalty-keyword-menu-chatbot",
    title: "Turn your keyword replies into a tappable menu",
    summary:
      'Messages has a fourth tab, Chatbot. It builds a WhatsApp chatbot out of the keywords you already answer on Replies \u2014 one tappable row per keyword, with the description you gave it \u2014 and a rule so that texting one word ("menu" by default) brings the list up. Customers no longer have to know that POINTS or REFER are the magic words. The answers do not move: tapping a row sends that keyword, so the reply that comes back is the same live one they get by typing it, balance and referral code and current rewards included. The bot itself lands under WhatsApp \u203a Chatbot and is yours to edit in the flow editor afterwards \u2014 add a greeting before the menu, branch off it, whatever you like. Add or rename a keyword later and the tab says which rows are out of date, with a button that rewrites just the list and leaves your edits alone. A keyword longer than 24 characters cannot be a row and is called out rather than quietly shortened, because the row title is what triggers the reply.',
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
      'On Messages \u203a Automatic, a message you have not written yet used to offer to design it: you picked a WhatsApp account in a dialog, a draft was written for you, and only then did the editor open. It now says "Open in WhatsApp template editor" and does exactly that \u2014 the editor opens on that message\'s suggested words, with the account picker it has always had, and nothing is saved until you press Save as draft or Save & Submit yourself. Two things follow. A message whose template you saved as a draft and never submitted now shows that draft on its card, with its words and its Draft badge, and the button opens the draft rather than starting again. And opening a message twice can no longer leave two templates in the library, which is what creating the draft up front did every time the editor was opened and closed.',
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
      "Two changes to the rewards brochure under Materials. On the menu card, your hero photo is now the background of the top section rather than a separate strip beneath it \u2014 the business name, the programme name and the tagline sit on the photo over a scrim built to keep them readable whatever the picture is, and a card with no photo still gets the flat brand band it always had. And the background is no longer one of eleven named papers: it is a colour picker. The eleven remain as swatches to start from, next to a colour wheel and a hex box, so a card can be any shade you like. What the card cannot do is become unreadable \u2014 the text and the accent colour are worked out from the background you choose rather than picked separately, so a dark card prints light type and gives up the brand accent that would disappear into it, and a pale one keeps dark type. A small sample under the picker shows the body text and the accent in the colour they will actually print. Brochures saved before today keep the exact paper they were designed with.",
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
      "Every line on Loyalty \u2192 Activity names the customer it belongs to, and until now that name was a dead end \u2014 finding the person behind a redemption meant going to Customers and searching for them by hand. The name is now a link: it opens that member on the Customers page, the same view their own row there opens, with their points, tier, rewards and full history. A line with no phone number behind it stays plain text, since that view is found by number. The customer you have open is also part of the address now, so the page can be bookmarked, reloaded without dropping back to the list, and shared with a colleague, and the browser's back button returns you to where you came from instead of leaving the screen.",
    publishedAt: "2026-09-11",
    kinds: ["improvement"],
    area: "Loyalty",
    link: { to: "/dashboard/loyalty/activity", label: "Open Activity" },
  },
  {
    id: "2026-09-10-loyalty-reminders",
    title: "Reminders: choose when each one sends",
    summary:
      "The messages your programme sends on a schedule — a birthday, a customer who has gone quiet, points about to expire — have a page of their own under Loyalty \u2192 Reminders. Until now two of those settings were buried on the Messages page and the rest could not be changed at all. Each reminder is a card: switch it on, say how far ahead it should go, and pick the hour it sends at. That hour is read in your own time zone, which is new — reminders used to go out at midnight on our servers, so a venue several hours ahead had its birthday greetings arriving in the small hours. The warning before points expire was fixed at fourteen days and is now yours to set. A customer who has gone quiet is nudged once, and nudged again only if they come back and go quiet a second time; before, they were nudged again every month forever. Three occasions are new: a heads-up before a member loses their VIP tier while they can still keep it, a reminder before a reward they already claimed runs out of time, and a note on the anniversary of the day they joined. What each message says is still written in one place, on Messages \u2192 Automatic, and every card links straight to it.",
    publishedAt: "2026-09-10",
    kinds: ["new", "fix"],
    area: "Loyalty",
    link: { to: "/dashboard/loyalty/reminders", label: "Open Reminders" },
  },
  {
    id: "2026-09-10-flow-purpose-grid",
    title: "Creating a Flow starts with what it is for",
    summary:
      "The Create Flow wizard used to open on a choice between Loyalty feedback and everything else, which gave one use case the same weight as all of Meta's categories put together. It now opens on the purposes themselves — sign up, sign in, appointment booking, lead generation, contact us, customer support, survey, loyalty feedback and other — as one grid, each with a line saying what it is for, and the purpose you pick is the flow's category. That means one fewer thing to fill in later: the Categories field is gone from the details step, since the tile already answered it. A flow now carries the single purpose you chose rather than a set of them, and the steps along the top show only the ones your purpose actually visits. Loyalty feedback is one tile among nine and still the only one that comes with ready-made questions for your kind of business, and Loyalty → Feedback opens the wizard with it already chosen. Flow cards now name the purpose the flow was created for instead of labelling everything \"Customer Engagement\". Looking at the loyalty surveys and then changing your mind no longer carries one of them into a flow that is not a survey, which the create step used to refuse.",
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
      "Creating a WhatsApp Flow now starts by asking what it is for. Choose Loyalty feedback and you get a ready-made survey for your kind of business — a restaurant asks about the overall experience, the food and the service; the retail, salon and gym templates ask what matters there — previewed screen by screen on a phone before you name it. Publish it from the editor, then open the new Feedback page under Loyalty and select it, along with the team whose Google review link to use. Submit to Meta, switch it on, and a set time after a customer earns points they get the survey; anyone who rates you well is asked to leave a Google review. A new Review reward, granted once to each customer who taps that link, can be created right there in Feedback and shows up read-only under Rewards. Results show how many were asked and answered, how many were happy, review-link taps and rewards granted, the average for each question, and every request with its rating and status.",
    publishedAt: "2026-09-10",
    kinds: ["new"],
    area: "Loyalty",
    link: { to: "/dashboard/loyalty/feedback", label: "Set up Feedback" },
  },
  {
    id: "2026-09-10-rewards-per-tier-brochure-redesign",
    title: "Rewards per tier, and a new brochure",
    summary:
      "With more than one tier above Member, the Rewards step in setup now shows a band for each — Rewards for everyone, then Silver and above, then Gold-only perks — each with its own Add button; a reward added into a band can be redeemed by that tier and every tier above it. The rewards brochure under Materials has been redrawn as a menu card: a slim band in your brand colour with your logo, business and programme names, a paper-white body, your earn rate as a stamped pill, and every reward as a menu line with a dotted leader to its points. Rewards a tier unlocks print under a labelled rule in that tier's colour, and the editor marks them with the tier's name beside the points.",
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
      "The Tiers step — in setup and under Program — now takes up to two tiers above Member, three in all. Add a tier above sets a sensible spend for the new rung; each tier has its own name, colour, spend, multiplier and perks, and any tier can be removed with the bin icon. The moment you save, every member is re-checked against the new ladder and moved to the tier their spend now earns: a raised threshold moves people down, a lowered one or a new rung in the middle moves them up, and the save message says how many went each way. Anyone promoted gets the usual WhatsApp tier message; demotions are quiet. One spend window still applies to the whole ladder.",
    publishedAt: "2026-09-10",
    kinds: ["new", "improvement"],
    area: "Loyalty",
    link: { to: "/dashboard/loyalty/program", search: { section: "tiers" }, label: "Open Tiers" },
  },
  {
    id: "2026-09-10-program-sections-full-editors",
    title: "Program: every section opens its full editor",
    summary:
      "Opening a section on the Loyalty Program page now shows the whole editor for it, full width, with a single Back to Program button at the top — the breadcrumb and the side list of other sections are gone. Earning and Rewards open the complete editors directly, with time windows and tier restrictions on rules, and coupons, free gifts, limits and validity on rewards, instead of a short form with an open the full editor link at the bottom. Profile, VIP tier and Messages are unchanged apart from the new header.",
    publishedAt: "2026-09-10",
    kinds: ["improvement"],
    area: "Loyalty",
    link: { to: "/dashboard/loyalty/program", label: "Open Program" },
  },
  {
    id: "2026-09-10-cashier-add-from-contacts",
    title: "Cashier: add from contacts, birthday and gender",
    summary:
      "The cashier can now enrol someone you already have a number for. Add from contacts lists your contacts — from WhatsApp chats, imports and surveys — with a search over name, phone and email; anyone already in the programme is marked Member and opens at the counter instead of being registered twice. Picking a contact carries their name, number and any birthday you hold into the register form. That form also has two new optional fields, date of birth and gender, so a birthday reward has a date to fire on and you learn a little more about who joins. Neither field is required, and nothing already on the contact is overwritten.",
    publishedAt: "2026-09-10",
    kinds: ["new", "improvement"],
    area: "Loyalty",
    link: { to: "/dashboard/loyalty/cashier", label: "Open the cashier" },
  },
  {
    id: "2026-09-09-loyalty-materials",
    title: "Loyalty Materials: QR card and rewards brochure",
    summary:
      "A new Materials page in Loyalty holds the print-ready pieces for your venue. The QR card is the counter card from setup — edit its headline, the promise in the coloured pill and the line under the code, and switch the hero photo on or off; the code itself opens WhatsApp with your join keyword ready to send. The brochure is new: a tall card in your brand colour with your photo and logo, the programme name, a tagline, your earn rate in plain words (₹1 spent = 1 point), and every point reward as a line — the points on the left, what the customer gets on the right — with a Terms & Conditions box at the foot. Tick which rewards go on it, rewrite any line, and download or print. Logo, colour and photo come from Program › Profile.",
    publishedAt: "2026-09-09",
    kinds: ["new"],
    area: "Loyalty",
    link: { to: "/dashboard/loyalty/materials", label: "Open Materials" },
  },
  {
    id: "2026-09-09-loyalty-onboarding-profile-launch",
    title: "Loyalty setup: profile, VIP tier and a QR poster",
    summary:
      "The loyalty setup guide has been rebuilt around what a venue actually needs on day one. It opens with a two-minute Venue & Branding profile — pick your kind of business and every later step is seeded to suit it, then your business and programme names, a contact, currency and time zone, plus your logo, brand colour and a hero image, with a live preview of the card customers will see. Earning is now one rule: spend this, earn that, with the typical spend that drives every estimate edited right beside it. Tiers are a single VIP tier above Member: set the spend that unlocks it and the window it must happen in — spend ₹5,000 in 6 months, say — and list the perks; both tiers earn at the same rate, so VIP is about treatment, not a faster ladder. Rewards are split into two bands, for everyone and VIP-only, so a reward only VIPs can reach is one click. Messages are unchanged. Activation now ends with a printable QR poster — your hero, logo and colour, the join code, and powered by rateup.app at the foot — with Download, Print and Copy link; the same poster is one click from Settings. The public join page wears your branding too, and a web signup's joining points are held until the customer's first WhatsApp message or purchase, so bots gain nothing.",
    publishedAt: "2026-09-09",
    kinds: ["new", "improvement"],
    area: "Loyalty",
    link: { to: "/dashboard/loyalty/onboarding", label: "Open setup" },
  },
  {
    id: "2026-09-08-loyalty-onboarding-simplified",
    title: "Simplified loyalty onboarding flow",
    summary:
      "Setting up a loyalty program used to mean piecing it together across eleven menu entries with no idea what good numbers look like. It is now a guided setup in six steps: pick your kind of business and it fills in points, tiers, rewards and WhatsApp messages tuned for it, saving as you go, with nothing reaching customers until you activate. Everything that defines what your program promises — basics, earning, tiers, rewards, messages — then lives on one Program page as five cards, each opening the same form the setup guide uses. Earning rules are written the way you would say them: spend ₹100, earn 10 points, with the rate underneath showing what that works out to per unit and what a typical purchase earns. Rewards get a picker with worked examples for all three kinds — something free, a percentage off, a flat amount off — priced against your earn rate, so a ₹150 coffee costs about 500 points rather than 5,000, and a Re-price from my earn rate button brings rewards you saved earlier back into line whenever you change the rate. Beside it a live cost estimate says what share of revenue your program gives back, tiers included, and warns when that is more than a typical margin can carry. Everything your program says on WhatsApp is one Messages page with three tabs — Automatic, Replies and Templates — where you write the words, press Save and it is submitted to Meta for you; the welcome reply can be written from the program you just built, each message says what WhatsApp fills into {{1}} and {{2}}, and inside a 24-hour chat the text goes out as a normal message rather than a template. The Loyalty menu is down from eleven entries to seven: the cashier opens on your recent customers and ends every action with a receipt showing the new balance, Transactions and Approvals are one Activity page with inline approve and reject, and a new Overview leads with what your program gives back, compares every number with the previous period and names the figure behind each thing it suggests you do next. Old links redirect.",
    publishedAt: "2026-09-08",
    kinds: ["new", "improvement", "fix"],
    area: "Loyalty",
    link: { to: "/dashboard/loyalty/program", label: "Open Program" },
    id: "2026-09-15-campaign-auto-pause",
    title: "Campaigns pause when your account can't send",
    summary:
      "If your plan's conversation allowance runs out, or Meta rejects the payment method on your WhatsApp Business account, a campaign now pauses instead of marking every remaining recipient as failed. The campaign page shows a banner with the reason and a link to fix it: your plan for the allowance, Meta's billing settings for a payment problem. Recipients who were not messaged yet stay waiting, so Resume sends to exactly them once the cause is fixed.",
    publishedAt: "2026-09-15",
    kinds: ["improvement"],
    area: "Campaigns",
    link: { to: "/dashboard/campaign", label: "Open campaigns" },
  },
  {
    id: "2026-09-12-inbox-channel-on-ticket",
    title: "See which number a ticket came in on",
    summary:
      "Each inbox row now carries a chip naming the channel the ticket arrived on, and the thread's Ticket Info panel names it in full — your own label for the number where you have set one, otherwise the number itself. It reads the channel off the ticket's own messages rather than the contact's last activity, so a customer who writes to two of your numbers no longer makes both tickets claim the same one. A number you have since disconnected is still named, marked as no longer connected and outlined with a dashed border so it reads differently from a live channel. Webchat tickets now also show the number the visitor typed into the widget, which the inbox used to leave blank.",
    publishedAt: "2026-09-12",
    kinds: ["new"],
    area: "Inbox",
    link: { to: "/dashboard/inbox", label: "Open inbox" },
  },
  {
    id: "2026-09-12-inbox-delete-conversation",
    title: "Delete a conversation",
    summary:
      "Admins can now delete a conversation outright, from the … menu in the thread header or the ticket details sidebar, and several at once by ticking chats in the list and using the bin in the selection bar. It removes that one ticket and every message in it — the contact and their other tickets stay exactly as they are. This is meant for threads that should not be kept at all, such as a test chat or something a customer asked you to erase, and it cannot be undone, so you are asked to confirm first. Anyone below admin will not see the option.",
    publishedAt: "2026-09-12",
    kinds: ["new"],
    area: "Inbox",
    link: { to: "/dashboard/inbox", label: "Open inbox" },
  },
  {
    id: "2026-09-11-facebook-page-picker",
    title: "Pick your Page for Messenger and Instagram",
    summary:
      "Connecting Messenger or Instagram now shows the Pages you gave RateUp access to as a list, so you can tick the one you want instead of opening a dropdown. For Instagram, Pages without a linked Instagram Business account are greyed out with a note, rather than failing after you pick them. The list refreshes from Facebook on its own each time you open it, so a Page you only just granted shows up without pressing sync first. The sync button is still there if you need it.",
    publishedAt: "2026-09-11",
    kinds: ["improvement"],
    area: "Channels",
    link: { to: "/dashboard/settings/channels", label: "Open channels" },
  },
  {
    id: "2026-09-08-inbox-image-download",
    title: "Save an image from the inbox",
    summary:
      "Images in a conversation now carry a download button — on the thumbnail itself, and again next to the close button when you open one full size. Until now the only way to keep a photo a customer had sent was to open it and fish it out of the browser, which is also what happens as a fallback if the file cannot be fetched directly. Documents and videos already had this; images were the gap.",
    publishedAt: "2026-09-08",
    kinds: ["new"],
    area: "Inbox",
    link: { to: "/dashboard/inbox", label: "Open inbox" },
  },
  {
    id: "2026-09-08-campaign-retry-failed",
    title: "Retry a campaign's failures from Overview",
    summary:
      'A campaign that has finished sending now shows its failures on Overview, with how many are worth another attempt and one button that re-sends to them — until now the only campaign-wide retry was hidden behind ticking a row in Participants. That control is still there and now does what it says: it re-attempts the recipients you ticked, while "Retry all failed" sits in the Participants header where you can find it without selecting anything first. Adding people to a campaign that already went out is clearer too: after "Send to more", the last step spells out that only the recipients it has never messaged will be sent to, and the button reads "Send to 120 new recipients" instead of "Launch campaign". Behind all of it, a fix: a message rejected the moment it was sent — including one that never reached WhatsApp at all — was stored without its error code, which is what the automatic retries are chosen by. Those failures were never retried and the campaign finished as though nothing could be done. They are now.',
    publishedAt: "2026-09-08",
    kinds: ["new", "improvement", "fix"],
    area: "Campaigns",
    link: { to: "/dashboard/campaign", label: "Open campaigns" },
  },
  {
    id: "2026-09-08-campaign-resume-when",
    title: "Choose when a paused campaign resumes",
    summary:
      'Resume now asks when. A campaign paused before its send time offers that schedule back, and alongside it you can send immediately or pick a new date and time — so a schedule overtaken by events no longer means editing the campaign just to start it again. Whichever you pick, only the recipients who were never messaged are sent to. The numbers across the top of Overview changed with it: "Sent" is now "Dispatched", because it counts every message handed to WhatsApp including the ones that came back rejected, and "Delivered" below it is the one that means it arrived. "Recipients" made way for "Pending" — how many are still waiting — and "Failed" now counts recipients that are failed right now rather than every failure ever recorded, so a recipient a retry rescued no longer stays in the count forever. The failure breakdown on the Analytics tab is measured against that same number, so its shares finally add up, and the campaign export follows the page: its \"Count Sent\" column is now \"Count Dispatched\" and its \"Count Failed\" counts recipients that are failed now.',
    publishedAt: "2026-09-08",
    kinds: ["new", "improvement"],
    area: "Campaigns",
    link: { to: "/dashboard/campaign", label: "Open campaigns" },
  },
  {
    id: "2026-09-07-campaign-page-controls",
    title: "Pause a campaign, retry one recipient",
    summary:
      'A sending campaign can now be paused and picked back up: Pause takes the recipients it has not reached off the queue, and Resume sends to exactly those, so nobody is messaged twice. A campaign paused before its send time goes back on that schedule when resumed, rather than out immediately. A recipient that failed offers "Retry now" in the Participants tab, so you can send to one person again without resending the campaign; recipients who were reached still open in the inbox as before. The campaign page also has a refresh button — delivery receipts and automatic retries land while you are looking at it — and the "Next batch" card now shows a campaign scheduled for later, not only a booked retry, with the date it goes out and a Cancel schedule button on it.',
    publishedAt: "2026-09-07",
    kinds: ["new", "improvement"],
    area: "Campaigns",
    link: { to: "/dashboard/campaign", label: "Open campaigns" },
  },
  {
    id: "2026-09-06-campaign-wizard",
    title: "Campaigns: a guided setup, and retries",
    summary:
      "Creating a campaign is now a six-step flow you can leave and come back to — name, template, audience, schedule and retries in one place, saved as a draft as you go, with a live preview of the message as it will arrive and a test send before you commit. The Audience step shows who is already on the campaign next to what you are adding, and either can be taken off from there — \"Send to more\" on a campaign opens it, replacing the old add-participants dialog. Messages Meta blocks with a frequency cap are re-sent automatically. The campaign page is rebuilt around that: Overview shows the next attempt and what has happened so far, Participants shows every recipient's attempt history and why any of them failed, and a new Analytics tab has the delivery funnel, a failure breakdown by Meta error code, and what each send and retry actually recovered. Campaign status now reads the way you'd say it — Draft, Scheduled, Sending, Paused, Completed — on the cards, the campaign page and the status filter, and it is finally accurate: a campaign you are still building stays a draft instead of showing as paused, and one that has sent everything says so instead of sending forever.",
    publishedAt: "2026-09-06",
    kinds: ["new", "improvement"],
    area: "Campaigns",
    link: { to: "/dashboard/campaign", label: "Create a campaign" },
  },
  {
    id: "2026-08-31-channels-page-rebuilt",
    title: "Channels, rebuilt to match setup",
    summary:
      "Settings \u2192 Channels is now laid out like the setup guide, overview and channel pages alike: one row per thing with its icon, what it is, its status, and its action on the right \u2014 instead of cards side by side. On the overview WhatsApp leads, because Meta hangs Messenger and Instagram off that connection, and those two say plainly that they are waiting on it rather than only greying out. Open one and the page now names the channel you opened, and each linked account reads as a row: the Page or Instagram account attached to it, a button to connect or change it, and a quieter way to disconnect. Nothing moved and nothing was removed \u2014 the same connect, edit and disconnect actions, in a layout that matches the rest of the app.",
    publishedAt: "2026-08-31",
    kinds: ["improvement"],
    area: "Channels",
    link: { to: "/dashboard/settings/channels", label: "Open channels" },
  },
  {
    id: "2026-08-31-setup-guide-v2",
    title: "A rebuilt setup guide",
    summary:
      'The setup guide has been rebuilt and now lives inside the app, as Get started at the top of the sidebar, instead of on its own page outside it — so you can work through it without leaving whatever you were doing. It is organised around what actually blocks you from sending: the three Meta steps — connect WhatsApp, verify the business, add payment — come first and are marked required, with verification held back until you are connected. Connecting now happens on the guide itself: Log in with Facebook opens Meta\'s signup in place, so you never leave the page to do it. Below them, Instagram and Facebook Messenger are steps of their own, and they connect in place as well \u2014 the same picker channel settings uses, opened right on the row \u2014 so every channel that shares the inbox is connected without ever leaving the guide. Everything else — your first message template, business hours, auto-replies, loyalty, team invites — sits under "Make it work for you" and can be done in any order. Anything that is not one of the three Meta steps can also be skipped outright, if you are never going to do it \u2014 a skipped step dims, stops counting toward your progress, and leaves the sidebar, so the guide can still reach the end without it. You can undo that from the same row whenever you change your mind. The sidebar lists every step with its progress and jumps straight to it. Once you have finished or skipped them all, or hidden the guide, Get started leaves the sidebar.',
    publishedAt: "2026-08-31",
    kinds: ["improvement"],
    area: "Onboarding",
    link: { to: "/dashboard/setup", label: "Open the setup guide" },
  },
  {
    id: "2026-08-29-ticket-boards-retired",
    title: "Ticket boards have been retired",
    summary:
      "The Tickets board is no longer part of RateUp. The Tickets entry has left the sidebar, Tickets is gone from a team's Feature Access, and the settings that fed it are gone too: a survey can no longer raise a ticket from a response or a per-question rule, and the Create Ticket step has been removed from the automation builder. Flows you saved with that step still open — the step is skipped rather than run. Work that used to live on a board is better tracked in the Inbox, where each conversation is already a ticket with its own number, assignee and tags, or on a Pipeline board for anything sales-shaped.",
    publishedAt: "2026-08-29",
    kinds: ["improvement"],
    area: "Tickets",
    link: { to: "/dashboard/inbox", search: { tab: "open" }, label: "Open the Inbox" },
  },
  {
    id: "2026-08-28-lifecycle-to-pipeline-stages",
    title: "Lifecycle stages are now pipeline stages",
    summary:
      "Your board's columns are its own now, instead of being your contact lifecycle stages. Name them what your sales process calls them, and give each a status of Open, Won or Lost — Won and Lost are real columns you drop onto, so the separate Lost zone is gone. Pipeline stage replaces lifecycle elsewhere too: in the contacts table, when editing one contact or several, in Zoho Bigin's stage mapping, and in Meta conversion tracking, which now lives in pipeline settings and fires when a lead reaches a Won column. In settings you can reorder columns by dragging a handle or with the arrow keys, and deleting one asks where its leads should go rather than moving them for you. Lifecycle itself is unchanged for contacts and the inbox — the two are simply no longer tied together.",
    publishedAt: "2026-08-28",
    kinds: ["new", "improvement"],
    area: "Pipeline",
    link: { to: "/dashboard/pipeline", label: "Open the pipeline" },
  },
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
    id: "2026-09-03-campaigns-on-free",
    title: "Campaigns are open on every plan",
    summary:
      "Campaigns no longer need a paid plan. A free account can build and send one against its 100 monthly conversations, so you can see how it works before deciding what volume you need.",
    publishedAt: "2026-09-03",
    kinds: ["new"],
    area: "Campaigns",
    link: { to: "/dashboard/campaign", label: "Open campaigns" },
  },
  {
    id: "2026-09-03-campaign-allowance-warning",
    title: "Campaigns warn before they outrun your allowance",
    summary:
      "The send dialog now says how many conversations you have left, and how many recipients may not be reached — before the campaign starts, instead of after some messages have quietly failed.",
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
      "Question editing, settings and theming are now separate panes, so you can restyle a survey without touching its questions — and preview the result as you go.",
    publishedAt: "2026-07-22",
    kinds: ["new", "improvement"],
    area: "Surveys",
    link: { to: "/dashboard/surveys", label: "Open surveys" },
  },
];
