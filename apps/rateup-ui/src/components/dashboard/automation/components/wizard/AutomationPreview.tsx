import { IconLock } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useEffect, useEffectEvent } from "react";

import { formatMoney, toMoney } from "@/backend/commerce/shop.api";
import { useShopProduct, useShopStore } from "@/backend/commerce/shop.query";
import { useWaTemplates } from "@/backend/whatsapp/whatsapp.query";
import {
  DmBubble,
  DmChatShell,
  DmComposer,
  DmIncomingGroup,
  DmNote,
  DmTimestamp,
} from "@/components/common/dm-preview-shell.tsx";
import type { NameLookup, SentencePart } from "@/components/dashboard/automation/rule-sentence.ts";
import { actionPart } from "@/components/dashboard/automation/rule-sentence.ts";
import { stripWhatsAppFormatting } from "@/components/dashboard/automation/whatsapp-formatting.ts";
import { WaTemplateBubble } from "@/components/dashboard/campaign/wizard/CampaignTemplatePreview.tsx";
import type { PhonePlatform } from "@/components/ui/phone-preview.tsx";
import { PhonePreviewButton, usePhonePreview } from "@/components/ui/phone-preview.tsx";
import TextWithFormatting from "@/components/whatsapp/templates/Details/TextWithFormating.tsx";
import {
  WaBubble,
  WaDateChip,
  WaThread,
  WhatsAppChatHeader,
  WhatsAppChatInputBar,
} from "@/components/whatsapp/whatsapp-preview-shell.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { cn } from "@/lib/utils.ts";
import type { WaTemplateFetchBody } from "@/types/global";

import type { CreateRuleInput, Platform } from "../schema.ts";
import { asPlatform, isCommentTrigger, PLATFORMS } from "../schema.ts";
import { asShopProductsValue } from "../ShopProductsAction.tsx";
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

const EVENT_NOTE: Record<string, string> = {
  CHAT_CLOSED: "Chat closed by your team",
  CHAT_ASSIGNED: "Chat assigned",
  STAGE_UPDATED: "Lead moved to a new stage",
  LIFECYCLE_UPDATED: "Lifecycle changed",
  INSTAGRAM_STORY_MENTION: "Mentioned you in their story",
  INSTAGRAM_REFERRAL: "Opened your ig.me link",
  WHATSAPP_AD_REFERRAL: "Tapped your ad",
  MESSENGER_REFERRAL: "Opened your m.me link",
};

/** What the customer sends to set the rule off, read from its first keyword. */
function customerMessage(rule: CreateRuleInput): string | null {
  if (rule.triggerEvent === "CONTACT_CREATED") return "Hi!";
  if (rule.triggerEvent !== "MESSAGE_RECEIVED" && !isCommentTrigger(rule.triggerEvent)) {
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
  wa,
  className,
  children,
}: Readonly<{ mine?: boolean; wa?: boolean; className?: string; children: ReactNode }>) {
  const Message = wa ? WaBubble : DmBubble;
  return (
    <Message outgoing={mine} className={className}>
      {children}
    </Message>
  );
}

function Note({ wa, children }: Readonly<{ wa?: boolean; children: ReactNode }>) {
  return wa ? <WaDateChip>{children}</WaDateChip> : <DmNote>{children}</DmNote>;
}

function ProductLine({ id }: Readonly<{ id: string }>) {
  const { data: product } = useShopProduct(id);
  const { data: store } = useShopStore();
  if (!product) return null;
  const price = product.variants[0]?.price;
  return (
    <>
      {"\n"}• {product.title}
      {price != null && store ? ` · ${formatMoney(toMoney(price), store.currency)}` : ""}
    </>
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
  const wa = platform === "WHATSAPP";

  const intro = (
    <>
      {note && <Note wa={wa}>{note}</Note>}
      {incoming && isCommentTrigger(rule.triggerEvent) && (
        <Note wa={wa}>Commented on your post: “{incoming}”</Note>
      )}
      {incoming && isCommentTrigger(rule.triggerEvent) && publicReply && (
        <Note wa={wa}>You replied under it: “{publicReply}”</Note>
      )}
      {incoming && !isCommentTrigger(rule.triggerEvent) && (
        <Bubble wa={wa} mine>
          {incoming}
        </Bubble>
      )}
    </>
  );

  const replies = actions.map((action, index) => {
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
        <WaTemplateBubble
          key={key}
          template={template}
          sampleValues={exampleValues(template)}
          className="w-[calc(100%-0.5rem)] max-w-64"
        />
      ) : (
        <Bubble wa={wa} key={key} className="italic opacity-70">
          Pick a template to see it here
        </Bubble>
      );
    }
    if (action.type === "SEND_SHOP_PRODUCTS") {
      const value = asShopProductsValue(action.value);
      if (platform === "WHATSAPP" && value.productIds.length) {
        return (
          <Bubble wa={wa} key={key}>
            {value.message || "A few picks for you"}
            {value.productIds.slice(0, 5).map((id) => (
              <ProductLine key={id} id={id} />
            ))}
            {"\n"}
            <span className="font-semibold underline">View items</span>
          </Bubble>
        );
      }
      return value.productIds.length ? (
        <Bubble wa={wa} key={key}>
          {value.message || "Thanks for your comment! Here it is:"}
          {value.productIds.slice(0, 5).map((id) => (
            <ProductLine key={id} id={id} />
          ))}
          {"\n"}
          {value.productIds.length === 1 ? "Buy it here: " : "Shop here: "}
          <span className="underline">link</span>
        </Bubble>
      ) : (
        <Bubble wa={wa} key={key} className="italic opacity-70">
          Pick products to see the reply here
        </Bubble>
      );
    }
    if (action.type === "SEND_MESSAGE") {
      const text = typeof action.value === "string" ? action.value.trim() : "";
      return (
        <Bubble wa={wa} key={key} className={cn(!text && "italic opacity-70")}>
          {!text && "Your reply appears here"}
          {text && (wa ? TextWithFormatting(text) : stripWhatsAppFormatting(text))}
        </Bubble>
      );
    }
    return (
      <Bubble wa={wa} key={key} className="italic">
        {upperFirst(actionPart(action, lookup).text)}
      </Bubble>
    );
  });

  const teamNote = internal.length > 0 && (
    <div className="flex shrink-0 items-start gap-1.5 border-t border-[#E4E7EC] bg-white px-3 py-2 text-[11px] text-[#6B7480]">
      <IconLock className="mt-px size-3 shrink-0" aria-hidden />
      <span>Only your team sees: {internal.join(" · ")}</span>
    </div>
  );

  if (wa) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <WhatsAppChatHeader contactName={businessName} />
        <WaThread
          className="gap-1.5"
          footer={
            <>
              {teamNote}
              <WhatsAppChatInputBar />
            </>
          }
        >
          {intro}
          {replies}
        </WaThread>
      </div>
    );
  }

  // Instagram and Messenger: the business's replies run together beside its picture.
  const hasReplies = actions.some((action) => !BEHIND_THE_SCENES.has(action.type));
  return (
    <DmChatShell
      name={businessName}
      threadClassName="justify-end"
      footer={
        <>
          {teamNote}
          <DmComposer />
        </>
      }
    >
      <DmTimestamp />
      {intro}
      {hasReplies && <DmIncomingGroup>{replies}</DmIncomingGroup>}
    </DmChatShell>
  );
}
