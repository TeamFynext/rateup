import { Controller, useFormContext, useWatch } from "react-hook-form";

import { PLAIN_TRIGGERS } from "@/components/dashboard/automation/rule-sentence.ts";
import { Field, FieldDescription, FieldError, FieldTitle } from "@/components/ui/field.tsx";
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
  PLATFORMS,
  triggerChannelProblem,
} from "../schema.ts";
import { AccountPicker, useRuleAccounts } from "./AccountPicker.tsx";

const LABEL = "text-[13px] font-medium text-foreground/80";

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
    const groups = form.getValues("groups");
    if (value === "MESSAGE_RECEIVED") {
      if (groups.length === 0) form.setValue("groups", EMPTY_KEYWORD_GROUP);
    } else if (value !== "INSTAGRAM_COMMENT") {
      form.setValue("groups", []);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className={LABEL}>Channels</span>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Channels">
          {PLATFORMS.map((option) => {
            const on = platforms.includes(option.value);
            const reason = blockedBy(option.value);
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={on}
                disabled={Boolean(reason) || (on && platforms.length === 1)}
                title={reason ?? undefined}
                onClick={() => toggleChannel(option.value)}
                className={cn(
                  "h-9 rounded-full border px-4 text-sm font-medium transition-colors outline-none",
                  "focus-visible:ring-ring focus-visible:ring-2 disabled:cursor-not-allowed",
                  on
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted",
                  reason && "opacity-50",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <span className="text-muted-foreground text-xs">
          {dimmed ?? "One automation can listen on several channels and reply on each."}
        </span>
      </div>

      <Controller
        control={form.control}
        name="triggerEvent"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldTitle className={LABEL}>Event</FieldTitle>
            <Select
              value={field.value}
              onValueChange={(value) => value && changeEvent(value)}
              items={events}
            >
              <SelectTrigger className="w-full" aria-invalid={fieldState.invalid}>
                <SelectValue placeholder="Pick what starts it" />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.value} value={event.value}>
                    {event.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      {triggerEvent === "SHOPIFY_EVENT" && (
        <Controller
          control={form.control}
          name="options.shopifyEvent"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldTitle className={LABEL}>Which Shopify event</FieldTitle>
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
              <FieldTitle className={LABEL}>Order status</FieldTitle>
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
          <div className="flex flex-col gap-2">
            <span className={LABEL}>{sendsOnly ? "Send from" : "Listen on"}</span>
            <AccountPicker
              platforms={platforms}
              value={field.value ?? []}
              onChange={field.onChange}
            />
          </div>
        )}
      />
    </div>
  );
}
