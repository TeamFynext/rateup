/* Copy for the inbox landing page. Everything here describes something the dashboard inbox
   really does — check `components/whatsapp/inbox` before adding a claim. */

export interface InboxFaq {
  question: string;
  answer: string;
}

/** Feeds both the accordion and the route's `FAQPage` JSON-LD. */
export const INBOX_FAQS: readonly InboxFaq[] = [
  {
    question: "Which channels does the RateUp inbox support?",
    answer:
      "WhatsApp, Instagram and Facebook Messenger. Instagram covers both direct messages and comments. Every channel lands in the same queue, and you can filter the inbox down to a single number, account or Page whenever you need to.",
  },
  {
    question: "Do we keep our own WhatsApp number?",
    answer:
      "Yes. The inbox runs on your own WhatsApp Business number through the official WhatsApp Business API, and on your own Instagram account and Facebook Page. Customers keep messaging the number they already know.",
  },
  {
    question: "What happens when WhatsApp's 24-hour window closes?",
    answer:
      "Each WhatsApp conversation shows a live countdown of the session window. When it runs out, the reply box locks for free text and you can send an approved message template to reopen the conversation — so nobody writes a reply that WhatsApp would reject.",
  },
  {
    question: "Can customers see private notes?",
    answer:
      "No. Private notes are written from their own tab in the reply box and stay inside your team. You can @mention a teammate in a note, and their mentions are collected in a dedicated view.",
  },
  {
    question: "How are conversations assigned?",
    answer:
      "Assign a conversation to a teammate or to a whole team, or pick one up yourself with Assign to me from the unassigned banner. Automation rules can also assign new conversations for you, including round-robin inside a team.",
  },
  {
    question: "Is there a mobile app?",
    answer:
      "Yes. RateUp has iOS and Android apps with push notifications, so your team can read, reply and assign conversations away from their desk.",
  },
];

export const PROBLEMS = [
  {
    title: "Nobody owns the reply",
    body: "Everyone sees the message, so everyone assumes someone else answered. The ones that get missed are the ones that were about to buy.",
    icon: "owner",
  },
  {
    title: "No record of what happened",
    body: "Was it sorted? Did the customer come back? A chat thread can't tell you — there's no ticket, no result, no history.",
    icon: "record",
  },
  {
    title: "No numbers to manage by",
    body: "You can't see who's overloaded or how fast the team really replies, so every staffing decision is a guess.",
    icon: "numbers",
  },
] as const;

export const LIFECYCLE_STEPS = [
  {
    title: "Message lands",
    body: "WhatsApp, Instagram or Messenger — into one queue, on your own number and accounts.",
  },
  {
    title: "Ticket opens",
    body: "Each conversation gets a number and a subject. An auto-reply can acknowledge it while you read.",
  },
  {
    title: "Owner assigned",
    body: "To a teammate or a team — or picked up with Assign to me from the unassigned banner.",
  },
  {
    title: "Worked in the open",
    body: "Private notes and @mentions pull in whoever knows the answer. The customer never sees them.",
  },
  {
    title: "Closed with a result",
    body: "Resolved, answered, no response or duplicate. Reopen anytime — the history stays on the contact.",
  },
] as const;

/* Illustrative rows for the analytics mock. Plain counts and times only: a percentage here
   would read as a performance claim. */
export const AGENT_ROWS = [
  {
    initials: "RK",
    name: "Rohan K.",
    tone: "bg-ru-blue-600",
    handled: "312",
    response: "3m 04s",
    open: 11,
    load: "w-[84%]",
  },
  {
    initials: "FA",
    name: "Fatima A.",
    tone: "bg-ru-green-600",
    handled: "287",
    response: "4m 38s",
    open: 8,
    load: "w-[62%]",
  },
  {
    initials: "SN",
    name: "Sneha N.",
    tone: "bg-ru-amber-600",
    handled: "241",
    response: "5m 51s",
    open: 5,
    load: "w-[38%]",
  },
  {
    initials: "VR",
    name: "Vikram R.",
    tone: "bg-ru-blue-400",
    handled: "198",
    response: "6m 22s",
    open: 3,
    load: "w-[23%]",
  },
] as const;
