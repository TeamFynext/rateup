import {
  IconAt,
  IconBolt,
  IconBrandInstagram,
  IconBrandMessenger,
  IconBrandWhatsapp,
  IconCircleCheck,
  IconLayoutKanban,
  IconLink,
  IconMessageCircle,
  IconMessageDots,
  IconRefresh,
  IconShoppingBag,
  IconShoppingCart,
  IconUserPlus,
  IconUserShare,
} from "@tabler/icons-react";
import { Controller, useFormContext, useWatch } from "react-hook-form";

import { PLAIN_TRIGGERS } from "@/components/dashboard/automation/rule-sentence.ts";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field.tsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { cn } from "@/lib/utils.ts";
import { shopifyEventData, wooEventData } from "@/utils/constants.ts";

import type { CreateRuleInput, CreateRuleValues, Platform } from "../schema.ts";
import {
  actionChannelProblem,
  asPlatform,
  getTriggerEventsForPlatforms,
  isCommentTrigger,
  PLATFORMS,
  triggerChannelProblem,
} from "../schema.ts";
import { AccountPicker, useRuleAccounts } from "./AccountPicker.tsx";
import { WizardSection } from "./WizardSection.tsx";

const CHANNEL_ICON: Record<Platform, typeof IconBolt> = {
  WHATSAPP: IconBrandWhatsapp,
  INSTAGRAM: IconBrandInstagram,
  FACEBOOK: IconBrandMessenger,
};

/** What each event card shows besides its name. */
const EVENT_META: Record<string, { icon: typeof IconBolt; hint: string }> = {
  MESSAGE_RECEIVED: { icon: IconMessageCircle, hint: "Reply to keywords, or to any message." },
  CONTACT_CREATED: { icon: IconUserPlus, hint: "Welcome someone the first time they write." },
  CHAT_CLOSED: { icon: IconCircleCheck, hint: "Follow up once your team closes a chat." },
  CHAT_ASSIGNED: { icon: IconUserShare, hint: "Tell the customer who is helping them." },
  STAGE_UPDATED: { icon: IconLayoutKanban, hint: "React when a lead moves on your board." },
  LIFECYCLE_UPDATED: { icon: IconRefresh, hint: "Use lead stages for new automations." },
  SHOPIFY_EVENT: { icon: IconShoppingCart, hint: "Orders, payments, refunds and lost checkouts." },
  WOOCOMMERCE_EVENT: { icon: IconShoppingBag, hint: "Message the buyer as their order moves." },
  INSTAGRAM_COMMENT: { icon: IconMessageDots, hint: "Reply privately to comments on your posts." },
  INSTAGRAM_STORY_MENTION: { icon: IconAt, hint: "Thank people who tag you in their story." },
  INSTAGRAM_REFERRAL: { icon: IconLink, hint: "Greet people who arrive from a link you shared." },
  MESSENGER_REFERRAL: { icon: IconLink, hint: "Greet people who open your Page from a link." },
  FACEBOOK_COMMENT: {
    icon: IconMessageDots,
    hint: "Reply privately in Messenger to comments on your Page's posts.",
  },
};

const EMPTY_KEYWORD_GROUP: CreateRuleInput["groups"] = [
  { operator: "AND", conditions: [{ field: "MESSAGE_BODY", operator: "CONTAINS", value: "" }] },
];

/** Where the automation listens and what has to happen: channel, event, accounts. */
export function TriggerStep() {
  const form = useFormContext<CreateRuleInput, unknown, CreateRuleValues>();
  const { platformOf } = useRuleAccounts();
  const watchedPlatforms = useWatch({ control: form.control, name: "platforms" });
  const platforms = (watchedPlatforms ?? []).map(asPlatform);
  const triggerEvent = useWatch({ control: form.control, name: "triggerEvent" });
  const actions = useWatch({ control: form.control, name: "actions" }) ?? [];
  // Passing the rule's own event keeps a legacy one listed on the rule that uses it.
  const events = getTriggerEventsForPlatforms(platforms, triggerEvent).map((event) => ({
    value: event.value,
    label: PLAIN_TRIGGERS[event.value] ?? event.label,
  }));
  const sendsOnly = triggerEvent === "SHOPIFY_EVENT" || triggerEvent === "WOOCOMMERCE_EVENT";

  /** Why a channel cannot be added to what the rule already does, or null when it can. */
  const blockedBy = (platform: Platform): string | null => {
    if (platforms.includes(platform)) return null;
    const next = [...platforms, platform];
    return (
      triggerChannelProblem(triggerEvent, next) ??
      actions.map((action) => actionChannelProblem(action.type, next)).find(Boolean) ??
      null
    );
  };

  const toggleChannel = (platform: Platform) => {
    const on = platforms.includes(platform);
    if (on && platforms.length === 1) return;
    // Kept in PLATFORMS order, so the rule's first channel does not depend on click order.
    const next = PLATFORMS.map((option) => option.value).filter((value) =>
      value === platform ? !on : platforms.includes(value),
    );
    form.setValue("platforms", next);
    form.setValue("platform", next[0]);
    if (on) {
      const accounts = form.getValues("whatsappSettingsPhoneIds") ?? [];
      form.setValue(
        "whatsappSettingsPhoneIds",
        accounts.filter((id) => platformOf.get(id) !== platform),
      );
    }
  };
  const dimmed = PLATFORMS.map((option) => blockedBy(option.value)).find(Boolean);

  // Each event owns its own options; leaving one clears them so a hidden value is never saved.
  const changeEvent = (value: string) => {
    form.setValue("triggerEvent", value, { shouldValidate: false });
    if (value !== "SHOPIFY_EVENT") {
      form.setValue("options.shopifyEvent", undefined);
      form.setValue("options.shopifyProductIds", []);
    }
    if (value !== "WOOCOMMERCE_EVENT") {
      form.setValue("options.wooEvent", undefined);
      form.setValue("options.wooProductIds", []);
    }
    if (value !== "INSTAGRAM_COMMENT" && value !== "INSTAGRAM_STORY_MENTION") {
      form.setValue("options.instagramScope", "ALL");
      form.setValue("options.instagramPostIds", []);
    }
    if (value !== "INSTAGRAM_COMMENT") form.setValue("options.instagramCommentSource", undefined);
    if (value !== "INSTAGRAM_REFERRAL") form.setValue("options.instagramRef", undefined);
    if (value !== "MESSENGER_REFERRAL") form.setValue("options.messengerRef", undefined);
    const groups = form.getValues("groups");
    if (value === "MESSAGE_RECEIVED") {
      if (groups.length === 0) form.setValue("groups", EMPTY_KEYWORD_GROUP);
    } else if (!isCommentTrigger(value)) {
      form.setValue("groups", []);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <WizardSection
        title="Channels"
        hint={dimmed ?? "One automation can listen on several channels and reply on each."}
      >
        <div className="flex flex-wrap gap-2" role="group" aria-label="Channels">
          {PLATFORMS.map((option) => {
            const on = platforms.includes(option.value);
            const reason = blockedBy(option.value);
            const Icon = CHANNEL_ICON[option.value];
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={on}
                disabled={Boolean(reason) || (on && platforms.length === 1)}
                title={reason ?? undefined}
                onClick={() => toggleChannel(option.value)}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-full border pr-4 pl-3 text-sm font-medium transition-colors outline-none",
                  "focus-visible:ring-ring focus-visible:ring-2 disabled:cursor-not-allowed",
                  on
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted",
                  reason && "opacity-50",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {option.label}
              </button>
            );
          })}
        </div>
      </WizardSection>

      <Controller
        control={form.control}
        name="triggerEvent"
        render={({ field, fieldState }) => (
          <WizardSection title="Event">
            <RadioGroup
              value={field.value}
              onValueChange={(value) => typeof value === "string" && changeEvent(value)}
              className="grid gap-2 sm:grid-cols-2"
              aria-invalid={fieldState.invalid}
            >
              {events.map((event) => {
                const meta = EVENT_META[event.value];
                const Icon = meta?.icon ?? IconBolt;
                const id = `trigger-event-${event.value}`;
                return (
                  <FieldLabel key={event.value} htmlFor={id}>
                    <Field orientation="horizontal" className="items-start gap-3">
                      <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <FieldContent>
                        <FieldTitle>{event.label}</FieldTitle>
                        {meta?.hint && (
                          <FieldDescription className="text-xs">{meta.hint}</FieldDescription>
                        )}
                      </FieldContent>
                      <RadioGroupItem id={id} value={event.value} className="mt-0.5" />
                    </Field>
                  </FieldLabel>
                );
              })}
            </RadioGroup>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </WizardSection>
        )}
      />

      {triggerEvent === "SHOPIFY_EVENT" && (
        <Controller
          control={form.control}
          name="options.shopifyEvent"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldTitle>Which Shopify event</FieldTitle>
              <Select onValueChange={field.onChange} value={field.value} items={shopifyEventData}>
                <SelectTrigger className="w-full" aria-invalid={fieldState.invalid}>
                  <SelectValue placeholder="Pick a Shopify event" />
                </SelectTrigger>
                <SelectContent>
                  {shopifyEventData.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      )}

      {triggerEvent === "WOOCOMMERCE_EVENT" && (
        <Controller
          control={form.control}
          name="options.wooEvent"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldTitle>Order status</FieldTitle>
              <Select onValueChange={field.onChange} value={field.value} items={wooEventData}>
                <SelectTrigger className="w-full" aria-invalid={fieldState.invalid}>
                  <SelectValue placeholder="Pick an order status" />
                </SelectTrigger>
                <SelectContent>
                  {wooEventData.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription className="text-xs">
                The message goes to the phone number on the order.
              </FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      )}

      <Controller
        control={form.control}
        name="whatsappSettingsPhoneIds"
        render={({ field }) => (
          <WizardSection title={sendsOnly ? "Send from" : "Listen on"}>
            <AccountPicker
              platforms={platforms}
              value={field.value ?? []}
              onChange={field.onChange}
            />
          </WizardSection>
        )}
      />
    </div>
  );
}
