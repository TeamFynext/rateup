import { IconChecks, IconChevronLeft, IconLock } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useEffect, useEffectEvent } from "react";

import { useWaTemplates } from "@/backend/whatsapp/whatsapp.query";
import type { NameLookup, SentencePart } from "@/components/dashboard/automation/rule-sentence.ts";
import { actionPart } from "@/components/dashboard/automation/rule-sentence.ts";
import { stripWhatsAppFormatting } from "@/components/dashboard/automation/whatsapp-formatting.ts";
import { WaTemplateBubble } from "@/components/dashboard/campaign/wizard/CampaignTemplatePreview.tsx";
import type { PhonePlatform } from "@/components/ui/phone-preview.tsx";
import { PhonePreviewButton, usePhonePreview } from "@/components/ui/phone-preview.tsx";
import TextWithFormatting from "@/components/whatsapp/templates/Details/TextWithFormating.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { cn } from "@/lib/utils.ts";
import type { WaTemplateFetchBody } from "@/types/global";

import type { CreateRuleInput, Platform } from "../schema.ts";
import { asPlatform, PLATFORMS } from "../schema.ts";
import { useRuleSentence } from "./useRuleSentence.ts";

/** Actions the customer never sees; the preview lists them under the conversation instead. */
const BEHIND_THE_SCENES = new Set([
  "ASSIGN_TEAM",
  "ASSIGN_USER",
  "ATTACH_LABEL",
  "CLOSE_TICKET",
  "ASSIGN_STAGE",
  "ASSIGN_LIFECYCLE",
  "CALL_EXTERNAL_API",
]);

const CHAT_STYLE: Record<Platform, { header: string; mine: string; theirs: string }> = {
  WHATSAPP: {
    header: "bg-[#008069] text-white",
    mine: "bg-[#D9FDD3] text-[#1B2027]",
    theirs: "bg-white text-[#1B2027]",
  },
  INSTAGRAM: {
    header: "bg-white text-[#1B2027] border-b border-[#E4E7EC]",
    mine: "bg-[#3797F0] text-white",
    theirs: "bg-[#EFEFEF] text-[#1B2027]",
  },
  FACEBOOK: {
    header: "bg-white text-[#1B2027] border-b border-[#E4E7EC]",
    mine: "bg-[#0084FF] text-white",
    theirs: "bg-[#EFEFEF] text-[#1B2027]",
  },
};

const EVENT_NOTE: Record<string, string> = {
  CHAT_CLOSED: "Chat closed by your team",
  CHAT_ASSIGNED: "Chat assigned",
  STAGE_UPDATED: "Lead moved to a new stage",
  LIFECYCLE_UPDATED: "Lifecycle changed",
  INSTAGRAM_STORY_MENTION: "Mentioned you in their story",
  INSTAGRAM_REFERRAL: "Opened your ig.me link",
};

/** What the customer sends to set the rule off, read from its first keyword. */
function customerMessage(rule: CreateRuleInput): string | null {
  if (rule.triggerEvent === "CONTACT_CREATED") return "Hi!";
  if (rule.triggerEvent !== "MESSAGE_RECEIVED" && rule.triggerEvent !== "INSTAGRAM_COMMENT") {
    return null;
  }
  const keyword = rule.groups
    ?.flatMap((group) => group.conditions)
    .find((condition) => condition.field === "MESSAGE_BODY" && condition.value?.trim())
    ?.value?.trim();
  if (!keyword || keyword === "*") return "Hi, I have a question";
  return keyword;
}

/** The template's own example values, which is what Meta approved it with. */
function exampleValues(template: WaTemplateFetchBody): Record<string, string> {
  const body = template.components?.find((c) => c.type?.toUpperCase() === "BODY");
  const examples = body?.example?.body_text?.[0] ?? [];
  return Object.fromEntries(examples.map((value, index) => [String(index + 1), value]));
}

const upperFirst = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function Bubble({
  mine,
  className,
  children,
}: Readonly<{ mine?: boolean; className: string; children: ReactNode }>) {
  return (
    <div
      className={cn(
        "max-w-[85%] rounded-[10px] px-2.5 py-1.5 text-[12.5px] leading-snug whitespace-pre-line shadow-sm",
        mine ? "self-end" : "self-start",
        className,
      )}
    >
      {children}
    </div>
  );
}

function Note({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <span className="self-center rounded-md bg-white/90 px-2 py-0.5 text-center text-[10.5px] text-[#6B7480] shadow-sm">
      {children}
    </span>
  );
}

const PHONE_PLATFORM: Record<Platform, PhonePlatform> = {
  WHATSAPP: "whatsapp",
  INSTAGRAM: "instagram",
  FACEBOOK: "facebook",
};

/**
 * Opens the rule in the shared device preview. With more than one channel a switch picks which
 * app the phone shows; switching while the phone is open re-opens it on the new app.
 */
export function AutomationPreviewButton({
  rule,
  picked,
  onPick,
}: Readonly<{
  rule: CreateRuleInput;
  /** The app picked by hand. The builder owns it so the Share tab's switch follows it. */
  picked: Platform | undefined;
  onPick: (platform: Platform) => void;
}>) {
  const { open, platform: shown, openPreview } = usePhonePreview();
  const { parts: sentence, lookup } = useRuleSentence(rule);
  const platforms = (rule.platforms ?? []).map(asPlatform);
  const platform = picked && platforms.includes(picked) ? picked : (platforms[0] ?? "WHATSAPP");
  const preview = (
    <AutomationPreview rule={rule} sentence={sentence} lookup={lookup} platform={platform} />
  );

  const channelSwitch =
    platforms.length > 1 ? (
      <div className="bg-muted flex gap-0.5 rounded-lg p-0.5" role="group" aria-label="Preview on">
        {platforms.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={option === platform}
            onClick={() => onPick(option)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              option === platform
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {PLATFORMS.find((p) => p.value === option)?.label ?? option}
          </button>
        ))}
      </div>
    ) : null;

  // The open phone follows the platform, whether it changed from the switch or from the rule
  // (a template on another channel). Nothing else on this page uses the device preview.
  const followPlatform = useEffectEvent(() => {
    if (open && shown !== PHONE_PLATFORM[platform]) {
      openPreview(PHONE_PLATFORM[platform], preview, channelSwitch);
    }
  });
  useEffect(() => followPlatform(), [platform]);

  return (
    <PhonePreviewButton platform={PHONE_PLATFORM[platform]} toolbar={channelSwitch} defaultOpen>
      {preview}
    </PhonePreviewButton>
  );
}

/**
 * The rule as the customer will live it: what they send, then what comes back. The chat chrome
 * is the platform's own and fixed in both themes — it is a picture of another product.
 */
function AutomationPreview({
  rule,
  sentence,
  lookup,
  platform,
}: Readonly<{
  rule: CreateRuleInput;
  sentence: readonly SentencePart[];
  lookup: NameLookup;
  platform: Platform;
}>) {
  const { user } = useUser();
  const { data: templates } = useWaTemplates();
  const style = CHAT_STYLE[platform];
  const businessName = user?.orgName || "Your business";

  const incoming = customerMessage(rule);
  const isStoreEvent =
    rule.triggerEvent === "SHOPIFY_EVENT" || rule.triggerEvent === "WOOCOMMERCE_EVENT";
  const triggerText = sentence.find((part) => part.step === "trigger")?.text ?? "";
  const note = isStoreEvent ? upperFirst(triggerText) : EVENT_NOTE[rule.triggerEvent];
  const actions = rule.actions ?? [];
  const internal = actions
    .filter((action) => BEHIND_THE_SCENES.has(action.type))
    .map((action) => actionPart(action, lookup).text);
  const publicReply = rule.options?.instagramPublicReplies?.find((reply) => reply.trim());

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#EFEAE2]">
      <div className={cn("flex h-12 shrink-0 items-center gap-2 px-3", style.header)}>
        <IconChevronLeft className="size-4" aria-hidden />
        <span className="font-display flex size-7 items-center justify-center rounded-full bg-white/25 text-[10px] font-bold">
          {businessName.slice(0, 2).toUpperCase()}
        </span>
        <span className="truncate text-[13px] font-semibold">{businessName}</span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 py-3">
        {note && <Note>{note}</Note>}
        {incoming && rule.triggerEvent === "INSTAGRAM_COMMENT" && (
          <Note>Commented on your post: “{incoming}”</Note>
        )}
        {incoming && rule.triggerEvent === "INSTAGRAM_COMMENT" && publicReply && (
          <Note>You replied under it: “{publicReply}”</Note>
        )}
        {incoming && rule.triggerEvent !== "INSTAGRAM_COMMENT" && (
          <Bubble mine className={style.mine}>
            {incoming}
          </Bubble>
        )}

        {actions.map((action, index) => {
          if (BEHIND_THE_SCENES.has(action.type)) return null;
          const key = `${action.type}-${index}`;
          if (action.type === "SEND_TEMPLATE") {
            const templateId =
              typeof action.value === "string"
                ? action.value
                : action.value && "templateId" in action.value
                  ? action.value.templateId
                  : "";
            const template = templates?.find((t) => String(t.id) === templateId)?.data;
            return template ? (
              <div key={key} className="self-start">
                <WaTemplateBubble template={template} sampleValues={exampleValues(template)} />
              </div>
            ) : (
              <Bubble key={key} className={cn(style.theirs, "italic opacity-70")}>
                Pick a template to see it here
              </Bubble>
            );
          }
          if (action.type === "SEND_MESSAGE") {
            const text = typeof action.value === "string" ? action.value.trim() : "";
            return (
              <Bubble key={key} className={cn(style.theirs, !text && "italic opacity-70")}>
                {!text && "Your reply appears here"}
                {text &&
                  (platform === "WHATSAPP"
                    ? TextWithFormatting(text)
                    : stripWhatsAppFormatting(text))}
                <span className="ml-2 inline-flex translate-y-0.5 items-center gap-0.5 text-[10px] text-[#6B7480]">
                  <IconChecks className="size-3 text-[#53BDEB]" aria-hidden />
                </span>
              </Bubble>
            );
          }
          return (
            <Bubble key={key} className={cn(style.theirs, "italic")}>
              {upperFirst(actionPart(action, lookup).text)}
            </Bubble>
          );
        })}
      </div>

      {internal.length > 0 && (
        <div className="flex items-start gap-1.5 border-t border-[#E4E7EC] bg-white px-3 py-2 text-[11px] text-[#6B7480]">
          <IconLock className="mt-px size-3 shrink-0" aria-hidden />
          <span>Only your team sees: {internal.join(" · ")}</span>
        </div>
      )}
    </div>
  );
}
