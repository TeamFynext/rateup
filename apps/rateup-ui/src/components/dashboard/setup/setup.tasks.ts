// The setup guide's step list — shared by the page (`RateUpOnboarding`) and the
// sidebar's "Get started" section (`setup.nav.tsx`), so the two can never disagree
// about what is left to do.

import {
  IconBrandInstagram,
  IconBrandMessenger,
  IconClock,
  IconCreditCard,
  IconFileText,
  IconGift,
  IconMessageCircle,
  IconMessageReply,
  IconRosetteDiscountCheck,
  IconUsers,
  type TablerIcon,
} from "@tabler/icons-react";
import type { TFunction } from "i18next";

import type { OnboardingChecklist } from "@/backend/org/org.api";
import type { RowTint } from "@/components/common/setup-row-card.tsx";

/**
 * The setup steps rendered by the guide. A subset of the API's checklist keys —
 * the loyalty sub-steps ("tiers", "rewards", ...) are no longer listed separately,
 * so any value already stored under them is left untouched.
 */
export type CardId =
  | "api"
  | "verify"
  | "payment"
  | "instagram"
  | "messenger"
  | "cmds"
  | "hours"
  | "auto"
  | "points"
  | "invite";

/** Per-step completion flags. */
export type ChecklistMap = Partial<Record<CardId, boolean>>;

/** The three bands the guide groups steps into; each renders its own heading. */
export type TaskGroup = "required" | "channels" | "optional";

/** Meta's billing hub — external, so it opens in a new tab rather than routing. */
export const META_BILLING_URL =
  "https://business.facebook.com/latest/billing_hub/accounts/details/";

export const SETUP_PATH = "/dashboard/setup";

/**
 * In-app destination per step, for the steps that send you somewhere. The ones that
 * act in place have no entry: "verify" is checked inline, "payment" is external (see
 * {@link META_BILLING_URL}), and the three Meta connections all run their own flow on
 * the guide itself.
 */
export const CARD_ROUTES = {
  // Only reached once WhatsApp is connected, to manage it. The channel page is the
  // `$channel` route, so it needs params rather than a literal path.
  api: { to: "/dashboard/settings/channels/$channel", params: { channel: "whatsapp" } },
  cmds: { to: "/dashboard/whatsapp/templates" },
  // Business hours are a section of the account page, not their own route.
  hours: { to: "/dashboard/settings/account", hash: "business-hours" },
  auto: { to: "/dashboard/automation" },
  points: { to: "/dashboard/loyalty/settings" },
  invite: { to: "/dashboard/settings/users" },
} as const;

export type NavigableCardId = keyof typeof CARD_ROUTES;

/** Every step except "verify" and "payment", which act rather than route. */
export const isNavigable = (id: CardId): id is NavigableCardId => id in CARD_ROUTES;

/** Everything about a step that does not need translating. */
export interface TaskDef {
  id: CardId;
  group: TaskGroup;
  icon: TablerIcon;
  tint: RowTint;
  /** Rough time-to-finish, summed into the "N min left" estimate. */
  mins: number;
  /** Step that must be done first; until then this one is disabled. */
  needs?: CardId;
  /** Hidden unless the plan includes the loyalty feature. */
  loyaltyOnly?: boolean;
}

export const TASKS: readonly TaskDef[] = [
  { id: "api", group: "required", icon: IconMessageCircle, tint: "accent", mins: 3 },
  {
    id: "verify",
    group: "required",
    icon: IconRosetteDiscountCheck,
    tint: "accent",
    mins: 5,
    needs: "api",
  },
  { id: "payment", group: "required", icon: IconCreditCard, tint: "green", mins: 2 },
  // Meta hangs both off the WhatsApp connection, so neither can be configured first.
  {
    id: "instagram",
    group: "channels",
    icon: IconBrandInstagram,
    tint: "brand",
    mins: 1,
    needs: "api",
  },
  {
    id: "messenger",
    group: "channels",
    icon: IconBrandMessenger,
    tint: "brand",
    mins: 1,
    needs: "api",
  },
  { id: "cmds", group: "optional", icon: IconFileText, tint: "accent", mins: 4 },
  { id: "hours", group: "optional", icon: IconClock, tint: "accent", mins: 2 },
  { id: "auto", group: "optional", icon: IconMessageReply, tint: "accent", mins: 2 },
  { id: "points", group: "optional", icon: IconGift, tint: "warm", mins: 3, loyaltyOnly: true },
  { id: "invite", group: "optional", icon: IconUsers, tint: "accent", mins: 1 },
];

/** A step's translated copy: card text plus the shorter label the sidebar uses. */
export interface CardCopy {
  title: string;
  desc: string;
  btnLabel: string;
  navLabel: string;
}

/**
 * Takes `t` rather than calling `useTranslation` so the sidebar — which builds its
 * nav as data, not markup — can reuse the same strings.
 */
export function setupCopy(t: TFunction): Record<CardId, CardCopy> {
  return {
    api: {
      title: t("Connect WhatsApp Business API"),
      desc: t(
        "Link your WhatsApp Business account to enable customer messaging, loyalty commands, and broadcast campaigns.",
      ),
      // Only shown once connected — connecting itself is the Facebook button.
      btnLabel: t("Manage connection"),
      navLabel: t("Connect WhatsApp"),
    },
    verify: {
      title: t("Verify your WhatsApp Business account"),
      desc: t("Complete Meta Business verification to unlock higher messaging limits."),
      btnLabel: t("Check Status"),
      navLabel: t("Verify account"),
    },
    payment: {
      title: t("Add payment in Meta"),
      desc: t("Add a payment method to send WhatsApp messages and notification to customers."),
      btnLabel: t("Add payment"),
      navLabel: t("Add payment"),
    },
    instagram: {
      title: t("Connect an Instagram Business Account to RateUp"),
      desc: t("Story replies and DMs land next to your WhatsApp threads."),
      btnLabel: t("Connect Instagram"),
      navLabel: t("Instagram"),
    },
    messenger: {
      title: t("Connect Facebook Messenger to RateUp"),
      desc: t(
        "Page messages join the same queue, with the same auto-replies and assignment rules.",
      ),
      btnLabel: t("Connect Messenger"),
      navLabel: t("Messenger"),
    },
    cmds: {
      title: t("Create your first message template"),
      desc: t(
        "Meta approves templates before you can send them. An order update is the easiest place to start.",
      ),
      btnLabel: t("Open templates"),
      navLabel: t("Message template"),
    },
    hours: {
      title: t("Set your business hours"),
      desc: t("Tell RateUp when you are open, so replies and rules know when you are not."),
      btnLabel: t("Set hours"),
      navLabel: t("Business hours"),
    },
    auto: {
      title: t("Set up auto-replies"),
      desc: t("Reply in seconds when you are closed. Your business never sleeps."),
      btnLabel: t("Open automation"),
      navLabel: t("Auto-replies"),
    },
    points: {
      title: t("Launch a loyalty or referral program"),
      desc: t("No apps. No forms. Customers join by replying on WhatsApp."),
      btnLabel: t("Set up loyalty"),
      navLabel: t("Loyalty program"),
    },
    invite: {
      title: t("Invite your team"),
      desc: t("Give your team access to the shared inbox so replies never wait on one person."),
      btnLabel: t("Invite team"),
      navLabel: t("Team invites"),
    },
  };
}

/** Which Meta connections exist, as the app can see them. */
export interface ConnectionState {
  whatsapp?: boolean;
  instagram?: boolean;
  messenger?: boolean;
}

/**
 * The steps that complete themselves. Connecting Instagram links the Facebook Page
 * it belongs to, so Messenger comes with it — which is why this reads the connection
 * rather than trusting either step to be ticked by hand.
 */
export function derivedDone(connected: ConnectionState): ChecklistMap {
  const done: ChecklistMap = {};

  if (connected.whatsapp) done.api = true;
  if (connected.instagram) done.instagram = true;
  if (connected.messenger) done.messenger = true;

  return done;
}

/** What both the page and the sidebar derive from the stored checklist. */
export interface SetupProgress {
  /** Every step on offer, skipped ones included — the guide still lists those. */
  visibleTasks: TaskDef[];
  checklistMap: ChecklistMap;
  /** Steps the org has waved off; they count for nothing and leave the sidebar. */
  skippedMap: ChecklistMap;
  doneTasks: number;
  totalTasks: number;
  /** Summed `mins` of everything still outstanding. */
  minsLeft: number;
  pct: number;
  allDone: boolean;
}

export interface SetupProgressInput {
  /** The checklist as stored on the org. */
  checklist?: OnboardingChecklist;
  /**
   * What is actually connected in Meta. These complete their steps on their own:
   * having done the thing is what "done" means, whatever the stored checklist says.
   */
  connected?: ConnectionState;
  /** `null` while the subscription is still loading — the loyalty step stays hidden. */
  hasLoyaltyFeature?: boolean | null;
  /** Unsaved toggles and the live verification verdict, applied over the stored state. */
  overrides?: ChecklistMap;
  /** Unsaved skip toggles, applied over the stored skips. */
  skipOverrides?: ChecklistMap;
}

export function getSetupProgress({
  checklist = {},
  connected = {},
  hasLoyaltyFeature = null,
  overrides = {},
  skipOverrides = {},
}: SetupProgressInput): SetupProgress {
  const { skipped: storedSkips, ...storedDone } = checklist;

  const derived = derivedDone(connected);
  const checklistMap: ChecklistMap = {
    ...storedDone,
    ...derived,
    ...overrides,
    // A live connection outranks an unsaved un-tick: the channel is connected
    // whether or not someone just cleared the box.
    ...derived,
  };
  const skippedMap: ChecklistMap = { ...storedSkips, ...skipOverrides };

  const visibleTasks = TASKS.filter((task) => !task.loyaltyOnly || hasLoyaltyFeature);
  // A skipped step is off the books entirely: it is neither done nor outstanding,
  // so the guide can still finish for someone who will never add Instagram.
  const countedTasks = visibleTasks.filter((task) => !skippedMap[task.id]);
  const totalTasks = countedTasks.length;
  const doneTasks = countedTasks.filter((task) => checklistMap[task.id]).length;

  return {
    visibleTasks,
    checklistMap,
    skippedMap,
    doneTasks,
    totalTasks,
    minsLeft: countedTasks
      .filter((task) => !checklistMap[task.id])
      .reduce((sum, task) => sum + task.mins, 0),
    pct: totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100),
    allDone: doneTasks === totalTasks,
  };
}

/**
 * The three Meta steps genuinely gate sending, so they cannot be waved off; the
 * channels and the optional work can.
 */
export function isTaskSkippable(task: TaskDef): boolean {
  return task.group !== "required";
}

/** A step is held back until whatever it `needs` is done. */
export function isTaskBlocked(task: TaskDef, checklistMap: ChecklistMap): boolean {
  return task.needs !== undefined && !checklistMap[task.needs] && !checklistMap[task.id];
}
