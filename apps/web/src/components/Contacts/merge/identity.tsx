import { Tooltip, TooltipContent, TooltipTrigger } from "@rateup/ui/components/tooltip";
import {
  IconBrandInstagram,
  IconBrandMessenger,
  IconBrandWhatsapp,
  IconId,
  IconMail,
  IconPhone,
  IconWorld,
} from "@tabler/icons-react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

import type {
  ContactIdentity,
  IdentityKind,
  MergeContact,
  MergeSuggestionReason,
  MergeWarning,
} from "@/backend/campaign/contacts/merge.api";
import { cn } from "@/lib/utils.ts";
import { getContactLabel } from "@/utils/whatsapp/inbox.ts";

export const KIND_ICON: Record<IdentityKind, typeof IconPhone> = {
  PHONE: IconPhone,
  EMAIL: IconMail,
  WA_BSUID: IconBrandWhatsapp,
  IG_SCOPED: IconBrandInstagram,
  FB_PSID: IconBrandMessenger,
  WEBCHAT: IconWorld,
  EXTERNAL: IconId,
};

const withPlus = (phone: string) => (phone.startsWith("+") ? phone : `+${phone}`);

/**
 * What a person reads for an identity. Instagram and Messenger ids are not shown raw: they
 * mean nothing to anyone and look like a phone number. A BSUID is led by the WhatsApp
 * name, with the id itself beside it (see {@link IdentityRow}), since it is what tells two
 * businesses' ids for the same person apart.
 */
export function identityLabel(identity: ContactIdentity, t: TFunction): string {
  const handle = identity.username ? `@${identity.username.replace(/^@/, "")}` : null;
  switch (identity.kind) {
    case "PHONE":
      return withPlus(identity.value);
    case "EMAIL":
      return identity.value;
    case "WA_BSUID":
      return handle ?? identity.displayName ?? t("WhatsApp user");
    case "IG_SCOPED":
      return handle ?? identity.displayName ?? t("Instagram user");
    case "FB_PSID":
      return identity.displayName ?? handle ?? t("Messenger user");
    case "WEBCHAT": {
      // Usually a random visitor id, but some widgets use the phone or email the visitor typed.
      const typed = identity.value.trim();
      if (/^\+?\d{7,15}$/.test(typed)) return withPlus(typed);
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(typed)) return typed;
      return identity.displayName ?? t("Web visitor");
    }
    default:
      return identity.value;
  }
}

function platformName(platform: string | undefined, t: TFunction): string | null {
  switch (platform?.toUpperCase()) {
    case "WHATSAPP":
      return t("WhatsApp");
    case "INSTAGRAM":
      return t("Instagram");
    case "FACEBOOK":
    case "MESSENGER":
      return t("Messenger");
    case "WEBCHAT":
      return t("Webchat");
    default:
      return null;
  }
}

/** "WhatsApp · Acme Retail": the channel (or business) the identity was seen on. */
export function identityBadge(identity: ContactIdentity, t: TFunction): string | null {
  if (identity.kind === "EXTERNAL") return t("External ID");
  const channel = identity.channel;
  if (!channel) return null;
  const business =
    channel.whatsapp?.businessPortfolioName ||
    channel.name ||
    (channel.username ? `@${channel.username}` : null);
  return [platformName(channel.platform, t), business].filter(Boolean).join(" · ") || null;
}

export function IdentityRow({
  identity,
  className,
  trailing,
}: Readonly<{ identity: ContactIdentity; className?: string; trailing?: React.ReactNode }>) {
  const { t } = useTranslation();
  const Icon = KIND_ICON[identity.kind] ?? IconId;
  const badge = identityBadge(identity, t);
  const bsuid = identity.kind === "WA_BSUID" ? identity.value : null;
  // Stacked, so nothing is cut off in the narrow inbox panel: the name on top, then the
  // BSUID and the channel each on a line of small print, wrapping rather than truncating.
  return (
    <div className={cn("flex min-h-7 items-start gap-2 text-[13px]", className)}>
      <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{identityLabel(identity, t)}</p>
        {bsuid && (
          <Tooltip>
            <TooltipTrigger
              render={<p className="w-fit font-mono text-xs break-all text-muted-foreground" />}
            >
              {bsuid}
            </TooltipTrigger>
            <TooltipContent side="top">{t("Business-scoped user ID (BSUID)")}</TooltipContent>
          </Tooltip>
        )}
        {badge && <p className="text-xs break-words text-muted-foreground">{badge}</p>}
      </div>
      {trailing && <span className="ml-auto flex shrink-0 items-center">{trailing}</span>}
    </div>
  );
}

/** A contact's name, or the best handle it has. Never a raw BSUID. */
export function contactName(
  contact:
    | Pick<MergeContact, "name" | "phone" | "email" | "bsuid" | "igsId" | "whatsappUserName">
    | null
    | undefined,
  t: TFunction,
): string {
  return (
    getContactLabel(contact) ??
    (contact?.email || (contact?.igsId ? t("Instagram user") : null) || t("Unnamed contact"))
  );
}

const PLATFORM_OF_KIND: Partial<Record<IdentityKind, string>> = {
  WA_BSUID: "WHATSAPP",
  IG_SCOPED: "INSTAGRAM",
  FB_PSID: "FACEBOOK",
  WEBCHAT: "WEBCHAT",
};

/**
 * Every platform a contact has been seen on — WhatsApp, Instagram, Messenger, Webchat —
 * from its accounts, where it came from, and where it last wrote. A bare phone counts as
 * WhatsApp only when nothing else says otherwise (a plain import, a WhatsApp contact).
 */
export function contactPlatforms(contact: MergeContact, t: TFunction): string[] {
  const found = new Set<string>();
  for (const identity of contact.identities ?? []) {
    const platform = identity.channel?.platform ?? PLATFORM_OF_KIND[identity.kind];
    if (platform) found.add(platform.toUpperCase());
  }
  if (contact.bsuid || contact.whatsappUserName) found.add("WHATSAPP");
  if (contact.igsId) found.add("INSTAGRAM");
  if (contact.psid) found.add("FACEBOOK");
  const source = contact.source?.toUpperCase();
  if (source && ["WHATSAPP", "INSTAGRAM", "FACEBOOK", "WEBCHAT"].includes(source)) {
    found.add(source);
  }
  const last = contact.lastMessagePlatform?.toUpperCase();
  if (last && last !== "INTERNAL") found.add(last);
  if (found.size === 0 && contact.phone) found.add("WHATSAPP");
  return [...found]
    .map((platform) => platformName(platform, t))
    .filter((name): name is string => !!name);
}

/** The channel a contact is mainly reached on, for "Rahul (WhatsApp)". */
export function contactChannelHint(contact: MergeContact, t: TFunction): string | null {
  return contactPlatforms(contact, t)[0] ?? (contact.email ? t("Email") : null);
}

/**
 * The phones, emails and handles to tell two contacts apart by: every one it is known by,
 * not only the main ones. A webchat visitor's typed id is shown as what it is.
 */
export function contactDetails(contact: MergeContact, t: TFunction): string[] {
  const identities = contact.identities ?? [];
  const out: string[] = [];
  const add = (value: string | null | undefined) => {
    if (value && !out.includes(value)) out.push(value);
  };
  for (const identity of identities) {
    if (identity.kind === "PHONE") add(withPlus(identity.value));
    else if (identity.kind === "EMAIL") add(identity.value);
  }
  if (!identities.some((identity) => identity.kind === "PHONE") && contact.phone) {
    add(withPlus(contact.phone));
  }
  if (!identities.some((identity) => identity.kind === "EMAIL")) add(contact.email);
  for (const identity of identities) {
    if (identity.kind === "WA_BSUID" || identity.kind === "IG_SCOPED") {
      add(identity.username ? `@${identity.username.replace(/^@/, "")}` : null);
    }
  }
  if (!identities.some((identity) => identity.kind === "WA_BSUID") && contact.whatsappUserName) {
    add(`@${contact.whatsappUserName}`);
  }
  const typed =
    identities.find((identity) => identity.kind === "WEBCHAT")?.value ??
    (contact.source?.toUpperCase() === "WEBCHAT" ? contact.other : null);
  if (typed) add(t("Typed in chat: {value}", { value: typedValue(typed) }));
  return out;
}

/** A phone-looking value gets its "+", anything else (an email, a visitor id) as is. */
const typedValue = (value: string) => (/^\d{7,15}$/.test(value) ? withPlus(value) : value);

export function suggestionReasonText(
  suggestion: { reason: MergeSuggestionReason; detail?: string | null },
  other: MergeContact | null,
  t: TFunction,
): string {
  switch (suggestion.reason) {
    case "SAME_PHONE":
      return t("Same phone");
    case "SAME_EMAIL":
      return t("Same email");
    case "BSUID_PHONE_SPLIT":
      return t("Same WhatsApp customer");
    case "CUSTOMER_PROVIDED": {
      // Both cards often carry the same name, so the label names the value, not a person.
      const value = suggestion.detail ? typedValue(suggestion.detail) : null;
      if (value) return t("Typed {value} in chat, which another contact already has", { value });
      const name = other ? contactName(other, t) : t("another contact");
      return t("Gave a phone that belongs to {name}", { name });
    }
    default:
      return t("Possible duplicate");
  }
}

export function mergeWarningText(warning: MergeWarning, t: TFunction): string {
  switch (warning) {
    case "SPAM_CARRIES_OVER":
      return t("One of these contacts is marked as spam. The merged contact will be too.");
    case "BLOCK_CARRIES_OVER":
      return t("One of these contacts is blocked. The merged contact stays blocked.");
    case "OPT_OUT_CARRIES_OVER":
      return t(
        "One of these contacts has not given marketing consent. The merged contact keeps the stricter setting.",
      );
    case "LOYALTY_ACCOUNT_REMOVED":
      return t(
        "Both contacts have a loyalty account in the same programme. The smaller one is closed and its points do not move.",
      );
    case "SHARED_CAMPAIGNS":
      return t("Both contacts were in the same campaign. Only one participation is kept.");
    default:
      return warning;
  }
}
