import {
  IconChecklist,
  IconFilterBolt,
  IconGift,
  IconQrcode,
  IconRobotFace,
  IconShoppingCartBolt,
  type Icon,
} from "@tabler/icons-react";
import type { TFunction } from "i18next";

import { SubscriptionFeaturePathName } from "@/types/enums.ts";

/**
 * Product areas an org can hide from its navigation. Mirrors `ORG_MODULES` in
 * rateup-api/src/modules/org/modules.ts. Off hides, it never blocks: the API still serves
 * the area, so an automation or cron built on it keeps running.
 */
export const ORG_MODULES = [
  "pipeline",
  "loyalty",
  "commerce",
  "web_forms",
  "qr_links",
  "ai_agent",
] as const;

export type OrgModule = (typeof ORG_MODULES)[number];

export interface OrgModuleInfo {
  key: OrgModule;
  icon: Icon;
  /** The plan switch behind it, when one can be closed. */
  planGate?: SubscriptionFeaturePathName;
  /** Dashboard paths the module owns. */
  paths: readonly string[];
  /** `PERMISSION_GROUPS` keys hidden from role editors while the module is off. */
  permissionGroups: readonly string[];
}

export const ORG_MODULE_INFO: readonly OrgModuleInfo[] = [
  {
    key: "pipeline",
    icon: IconFilterBolt,
    paths: ["/dashboard/pipelines"],
    permissionGroups: ["pipelines"],
  },
  {
    key: "loyalty",
    icon: IconGift,
    planGate: SubscriptionFeaturePathName.WhatsappLoyalty,
    paths: ["/dashboard/loyalty"],
    permissionGroups: ["loyalty"],
  },
  {
    key: "commerce",
    icon: IconShoppingCartBolt,
    planGate: SubscriptionFeaturePathName.WhatsappCatalog,
    paths: ["/dashboard/commerce"],
    permissionGroups: ["catalog", "commerce"],
  },
  {
    key: "web_forms",
    icon: IconChecklist,
    planGate: SubscriptionFeaturePathName.WebSurvey,
    paths: ["/dashboard/surveys"],
    // `surveys` and `responses` also guard WhatsApp Flow forms, which stay on.
    permissionGroups: [],
  },
  {
    key: "qr_links",
    icon: IconQrcode,
    paths: ["/dashboard/qr-codes", "/dashboard/link-pages"],
    permissionGroups: [],
  },
  {
    key: "ai_agent",
    icon: IconRobotFace,
    planGate: SubscriptionFeaturePathName.AI,
    paths: ["/dashboard/meta-agent"],
    permissionGroups: ["meta_agent"],
  },
];

export function getModuleForDashboardPath(pathname: string): OrgModuleInfo | undefined {
  return ORG_MODULE_INFO.find((info) => info.paths.some((path) => pathname.startsWith(path)));
}

// Literal `t("…")` calls so the translation extractor sees every string.
export function moduleLabel(t: TFunction, key: OrgModule): string {
  switch (key) {
    case "pipeline":
      return t("Pipelines");
    case "loyalty":
      return t("Loyalty");
    case "commerce":
      return t("Commerce");
    case "web_forms":
      return t("Surveys");
    case "qr_links":
      return t("QR & Links");
    case "ai_agent":
      return t("Meta AI Agent");
  }
}

export function moduleDescription(t: TFunction, key: OrgModule): string {
  switch (key) {
    case "pipeline":
      return t("Track leads and work on boards, from first message to closed deal.");
    case "loyalty":
      return t("Points, tiers and rewards your customers collect over WhatsApp.");
    case "commerce":
      return t("Catalogs, orders and payments inside the chat.");
    case "web_forms":
      return t("Surveys and feedback forms you share as a link.");
    case "qr_links":
      return t("QR codes and link-in-bio pages that open a chat with you.");
    case "ai_agent":
      return t("Meta's AI agent answering customers on your WhatsApp number.");
  }
}

export interface ModuleDetails {
  /** What the feature is, in a sentence or two. */
  meaning: string;
  /** What a team does with it. */
  uses: string[];
}

export function moduleDetails(t: TFunction, key: OrgModule): ModuleDetails {
  switch (key) {
    case "pipeline":
      return {
        meaning: t(
          "A board for every conversation that turns into work: new leads, support requests or projects, each moving through stages you define.",
        ),
        uses: [
          t("Turn a chat into a lead card in one click"),
          t("Move cards across stages and see what is stuck"),
          t("Run separate boards for sales, support or projects"),
        ],
      };
    case "loyalty":
      return {
        meaning: t(
          "A points programme your customers join and use on WhatsApp, with no app to download or card to carry.",
        ),
        uses: [
          t("Give points for purchases at the counter or online"),
          t("Reward regulars with tiers, rewards and referral bonuses"),
          t("Send balances, reminders and offers automatically"),
        ],
      };
    case "commerce":
      return {
        meaning: t(
          "Sell inside the chat: show your products, take orders and collect payments without sending customers to a website.",
        ),
        uses: [
          t("Share product catalogs in WhatsApp"),
          t("Track orders and their status in one place"),
          t("Choose how customers pay for orders placed in WhatsApp"),
        ],
      };
    case "web_forms":
      return {
        meaning: t(
          "Surveys and feedback forms that open in a browser, for customers you reach by link, email or QR code rather than in a chat.",
        ),
        uses: [
          t("Run NPS, CSAT and custom surveys"),
          t("Brand forms with your own theme and languages"),
          t("Read every response and its summary in one place"),
        ],
      };
    case "qr_links":
      return {
        meaning: t(
          "QR codes and link pages that bring people from posters, packaging and social profiles straight into a chat with you.",
        ),
        uses: [
          t("Print QR codes that open WhatsApp with a message ready"),
          t("Build a link page for your social bios"),
          t("See how often each QR code is scanned"),
        ],
      };
    case "ai_agent":
      return {
        meaning: t(
          "Meta's own AI agent replying to customers on your WhatsApp number, trained on your business details. Meta bills its usage directly.",
        ),
        uses: [
          t("Answer common questions at any hour"),
          t("Hand a conversation to your team when it needs a person"),
          t("Teach it from your FAQs, files and website"),
        ],
      };
  }
}

/** What every org has, whatever it picks — listed so a choice never looks like a loss. */
export function alwaysIncluded(t: TFunction): string[] {
  return [
    t("Inbox"),
    t("Contacts"),
    t("Campaigns"),
    t("Automation Rules"),
    t("WhatsApp templates, journeys and flows"),
    t("Instagram and Messenger"),
    t("Analytics"),
  ];
}
