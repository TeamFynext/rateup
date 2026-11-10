import { FRONTEND_URL } from "../../../utils/constants/constants.js";
import type { ActivationSignals } from "./signals.js";

export interface DripEmail {
  subject: string;
  /** Inbox preview line. */
  preview: string;
  title: string;
  /** Blank-line separated, like GeneralEmail. `{name}` and `{org}` are filled per person. */
  body: string;
  cta?: { label: string; path: string };
  highlights?: { title: string; description: string; path?: string }[];
  /** A plain note from a person: no layout, replies go to `ROOT_ORG_MAIL_ID`. */
  plain?: boolean;
}

export interface DripWhatsapp {
  /** Approved in RateUp's own WABA. Body variables: {{1}} first name, {{2}} org name. */
  template: string;
}

export interface DripStep {
  key: string;
  /** Days after the org was created. */
  day: number;
  label: string;
  /** The step is skipped once this is true, and conversion is read from it afterwards. */
  goalMet: (s: ActivationSignals) => boolean;
  email: DripEmail;
  whatsapp?: DripWhatsapp;
}

/**
 * The onboarding sequence. Keys are stored on CustomerMessage, so renaming one re-sends it
 * to every org still inside its window.
 */
export const DRIP_STEPS: DripStep[] = [
  {
    key: "onb_welcome",
    day: 0,
    label: "Welcome",
    goalMet: () => false,
    email: {
      subject: "Welcome to RateUp, {name}",
      preview: "One five-minute step gets {org} live on WhatsApp.",
      title: "Welcome to RateUp",
      body: "Hi {name},\n\nThanks for signing up {org}. Everything in RateUp (the shared inbox, broadcasts, loyalty and feedback) runs on your WhatsApp Business number, so that is the one thing to do first.\n\nIt takes about five minutes with your Facebook login.",
      cta: { label: "Connect WhatsApp", path: "/dashboard/setup" },
    },
    whatsapp: { template: "rateup_welcome_v1" },
  },
  {
    key: "onb_connect_help",
    day: 1,
    label: "Connect WhatsApp help",
    goalMet: (s) => s.whatsappConnected,
    email: {
      subject: "Stuck connecting WhatsApp?",
      preview: "The three things that usually get in the way, and how to get past them.",
      title: "Getting your number connected",
      body: "Hi {name},\n\n{org} isn't connected to WhatsApp yet. When a connection stalls it is almost always one of these:",
      highlights: [
        {
          title: "The number is still on the WhatsApp app",
          description:
            "Delete the account from the WhatsApp or WhatsApp Business app first, or use a fresh number.",
        },
        {
          title: "No Facebook Business account",
          description:
            "The connect window creates one for you; pick your business name when asked.",
        },
        {
          title: "The code never arrived",
          description: "Choose a voice call instead of SMS on the verification step.",
        },
      ],
      cta: { label: "Finish connecting", path: "/dashboard/setup" },
    },
    whatsapp: { template: "rateup_connect_help_v1" },
  },
  {
    key: "onb_first_broadcast",
    day: 3,
    label: "First broadcast",
    goalMet: (s) => s.campaignSent || !s.whatsappConnected,
    email: {
      subject: "Send your first WhatsApp broadcast",
      preview: "Three messages that work for almost any business.",
      title: "Your first broadcast",
      body: "Hi {name},\n\nWith WhatsApp connected, {org} can message every customer who opted in, with read rates email can't match. Not sure what to send first? These three work for almost any business:",
      highlights: [
        { title: "A this-week offer", description: "One product, one price, one reply button." },
        { title: "A festival greeting", description: "Warm, short, with a small thank-you code." },
        { title: "A feedback ask", description: "Two taps for the customer, a review for you." },
      ],
      cta: { label: "Create a broadcast", path: "/dashboard/campaigns/new" },
    },
  },
  {
    key: "onb_loyalty",
    day: 5,
    label: "Launch loyalty",
    goalMet: (s) => s.loyaltyActive,
    email: {
      subject: "A WhatsApp loyalty program in 10 minutes",
      preview: "Points, rewards and a QR poster for your counter.",
      title: "Bring customers back",
      body: "Hi {name},\n\nRateUp Loyalty gives {org} a points program that lives in WhatsApp: no app for your customers to download, no cards to print.\n\nSet your earning rule and a first reward, print the QR poster for the counter, and your staff award points from the RateUp app at the till.",
      cta: { label: "Set up loyalty", path: "/dashboard/loyalty/onboarding" },
    },
  },
  {
    key: "onb_founder_checkin",
    day: 7,
    label: "Founder check-in",
    goalMet: () => false,
    email: {
      subject: "Quick question about {org}",
      preview: "What are you hoping RateUp will do for you?",
      title: "Quick question",
      body: "Hi {name},\n\nYou've had RateUp for a week now. What are you hoping it will do for {org}? More repeat customers, more reviews, a calmer inbox?\n\nJust reply to this email. It comes to me, and I read every one.\n\nThe RateUp team",
      plain: true,
    },
  },
  {
    key: "onb_automations",
    day: 10,
    label: "Automations",
    goalMet: (s) => s.automationsSet || !s.whatsappConnected,
    email: {
      subject: "Let RateUp reply while you're busy",
      preview: "Business hours, away messages and auto-replies for {org}.",
      title: "Answer every message, even after hours",
      body: "Hi {name},\n\nCustomers message when it suits them, not when you're free. A few minutes of setup covers the gaps:",
      highlights: [
        {
          title: "Business hours",
          description: "An away message outside opening times, so no one waits in silence.",
          path: "/dashboard/settings/profile#business-hours",
        },
        {
          title: "Keyword auto-replies",
          description: "Prices, location, menu: answered the moment someone asks.",
          path: "/dashboard/automation/rules",
        },
      ],
      cta: { label: "Set up auto-replies", path: "/dashboard/automation/rules" },
    },
  },
  {
    key: "onb_need_help",
    day: 14,
    label: "Need a hand?",
    goalMet: (s) => s.activeLast7Days,
    email: {
      subject: "Want us to set {org} up with you?",
      preview: "A free 20-minute call to get you running.",
      title: "Need a hand?",
      body: "Hi {name},\n\nIt looks quiet on {org}'s RateUp account this week. If setup got in the way, we're happy to do it with you on a free 20-minute call: connect your number, import contacts and send your first message together.",
      cta: { label: "Book a setup call", path: "/book-a-demo" },
    },
    whatsapp: { template: "rateup_need_help_v1" },
  },
  {
    key: "onb_invite_team",
    day: 21,
    label: "Invite your team",
    goalMet: (s) => s.teammateInvited,
    email: {
      subject: "Bring your team into RateUp",
      preview: "Share the inbox, assign chats, reply from the mobile app.",
      title: "RateUp works better as a team",
      body: "Hi {name},\n\nInvite the people who talk to {org}'s customers. Each of them gets their own login, chats can be assigned to whoever owns them, and the RateUp mobile app keeps replies going away from the desk.",
      cta: { label: "Invite teammates", path: "/dashboard/settings/members" },
    },
  },
];

/** How long after its day a step may still go out, e.g. when the frequency cap held it back. */
export const STEP_GRACE_DAYS = 3;

export const dripStepByKey = (key: string) => DRIP_STEPS.find((s) => s.key === key);

export function absoluteUrl(path: string): string {
  return /^https?:\/\//.test(path) ? path : `${FRONTEND_URL.replace(/\/+$/, "")}${path}`;
}

export function fill(text: string, vars: { name: string; org: string }): string {
  return text.replaceAll("{name}", vars.name).replaceAll("{org}", vars.org);
}
