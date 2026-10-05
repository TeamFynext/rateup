import {
  IconArrowRight,
  IconBolt,
  IconChevronDown,
  IconCircleCheck,
  IconDeviceFloppy,
  IconFilter,
  IconLoader2,
  IconPlayerPlay,
  IconPlus,
  IconRefresh,
  IconSettings,
  IconTrash,
} from "@tabler/icons-react";
import React, { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Controller, FormProvider, useFieldArray, useWatch } from "react-hook-form";

import { getProductsFromShopify } from "@/backend/appsIntegration/shopify/shopify.api";
import { getWooProducts } from "@/backend/appsIntegration/woocommerce/woocommerce.api";
import {
  useInstagramMediaPosts,
  useInstagramStories,
} from "@/backend/whatsapp/instagram-profile/instagramProfile.query";
import { AccountSelector } from "@/components/input/AccountSelector.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { MultiSelect } from "@/components/ui/multi-select.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { cn } from "@/lib/utils.ts";
import { ShopifyEvents } from "@/types/enums.ts";
import { shopifyEventData, wooEventData } from "@/utils/constants.ts";

import ActionList from "./ActionList.tsx";
import ConditionList from "./ConditionList.tsx";
import { InstagramPublicReplies } from "./InstagramPublicReplies.tsx";
import { InstagramCommentSource, InstagramLinkRef } from "./InstagramTriggerOptions.tsx";
import RuleOptions from "./RuleOptions.tsx";
import type { CreateRuleInput, CreateRuleValues, Platform } from "./schema.ts";
import { getTriggerEventsForPlatform, INSTAGRAM_SCOPE_OPTIONS, PLATFORMS } from "./schema.ts";

interface RuleBuilderFormProps {
  form: UseFormReturn<CreateRuleInput, unknown, CreateRuleValues>;
  onSubmit: (data: CreateRuleValues) => void;
  onCancel: () => void;
  isPending: boolean;
  buttonText: string;
}

type Section = "trigger" | "conditions" | "actions" | "options";

const SECTION_META: Record<Section, { icon: React.ElementType; label: string; color: string }> = {
  trigger: { icon: IconBolt, label: "When", color: "text-amber-500" },
  conditions: { icon: IconFilter, label: "If", color: "text-violet-500" },
  actions: { icon: IconPlayerPlay, label: "Then", color: "text-emerald-500" },
  options: { icon: IconSettings, label: "Options", color: "text-sky-500" },
};

const platformColor: Record<Platform, { pill: string; activePill: string; glow: string }> = {
  WHATSAPP: {
    pill: "hover:bg-green-100 hover:text-green-700 dark:hover:bg-green-900/40 dark:hover:text-green-300",
    activePill:
      "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 ring-1 ring-green-300 dark:ring-green-700",
    glow: "shadow-green-500/10",
  },
  INSTAGRAM: {
    pill: "hover:bg-pink-100 hover:text-pink-700 dark:hover:bg-pink-900/40 dark:hover:text-pink-300",
    activePill:
      "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300 ring-1 ring-pink-300 dark:ring-pink-700",
    glow: "shadow-pink-500/10",
  },
  FACEBOOK: {
    pill: "hover:bg-ru-blue-100 hover:text-blue-700 dark:hover:bg-blue-900/40 dark:hover:text-blue-300",
    activePill:
      "bg-ru-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 ring-1 ring-blue-300 dark:ring-blue-700",
    glow: "shadow-blue-500/10",
  },
};

const RuleBuilderForm: React.FC<RuleBuilderFormProps> = ({
  form,
  onSubmit,
  onCancel,
  isPending,
  buttonText,
}) => {
  const [activeSection, setActiveSection] = useState<Section>("trigger");

  const {
    fields: groupFields,
    append: appendGroup,
    remove: removeGroup,
  } = useFieldArray({
    control: form.control,
    name: "groups",
  });

  const platform = (useWatch({ control: form.control, name: "platform" }) ??
    "WHATSAPP") as Platform;
  const pColor = platformColor[platform];

  const triggerEvent = useWatch({
    control: form.control,
    name: "triggerEvent",
  });
  // Passing the rule's own event keeps a legacy one listed on the rule that uses
  // it, while new rules are only offered the current events.
  const filteredTriggerEvents = getTriggerEventsForPlatform(platform, triggerEvent);
  const ruleName = useWatch({ control: form.control, name: "name" });
  const actions = useWatch({ control: form.control, name: "actions" });
  const groups = useWatch({ control: form.control, name: "groups" });

  const isMessageReceivedTrigger = triggerEvent === "MESSAGE_RECEIVED";
  const isShopifyTrigger = triggerEvent === "SHOPIFY_EVENT";
  const isWooTrigger = triggerEvent === "WOOCOMMERCE_EVENT";
  const isInstagramCommentTrigger = triggerEvent === "INSTAGRAM_COMMENT";
  const isInstagramStoryTrigger = triggerEvent === "INSTAGRAM_STORY_MENTION";
  const isInstagramReferralTrigger = triggerEvent === "INSTAGRAM_REFERRAL";
  const isInstagramTrigger = isInstagramCommentTrigger || isInstagramStoryTrigger;

  const shopifyEvent = useWatch({
    control: form.control,
    name: "options.shopifyEvent",
  });
  const shopifyProductIds =
    useWatch({ control: form.control, name: "options.shopifyProductIds" }) ?? [];
  const wooProductIds = useWatch({ control: form.control, name: "options.wooProductIds" }) ?? [];
  const instagramScope =
    useWatch({ control: form.control, name: "options.instagramScope" }) ?? "ALL";
  const instagramCommentSource = useWatch({
    control: form.control,
    name: "options.instagramCommentSource",
  });
  const selectedPhoneIds =
    useWatch({ control: form.control, name: "whatsappSettingsPhoneIds" }) ?? [];

  const activeIbaId =
    isInstagramTrigger && instagramScope === "SPECIFIC" ? selectedPhoneIds[0] : undefined;
  const { data: mediaPosts, isLoading: mediaLoading } = useInstagramMediaPosts(
    isInstagramCommentTrigger ? activeIbaId : undefined,
  );
  const { data: stories, isLoading: storiesLoading } = useInstagramStories(
    isInstagramStoryTrigger ? activeIbaId : undefined,
  );

  const mediaItems = isInstagramCommentTrigger ? (mediaPosts ?? []) : (stories ?? []);
  const mediaOptions = mediaItems.map((item) => {
    const label = item.caption
      ? `${item.caption.slice(0, 60)}${item.caption.length > 60 ? "…" : ""}`
      : `${item.media_type} · ${new Date(item.timestamp).toLocaleDateString()}`;
    return { value: item.id, label };
  });

  const [productData, setProductData] = useState<{ label: string; value: string }[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const loadShopifyProducts = async () => {
    setLoadingProducts(true);
    try {
      const products = await getProductsFromShopify();
      setProductData(
        products
          ? products.map((product) => ({
              label: product.title,
              value: product.id.toString(),
            }))
          : [],
      );
    } finally {
      setLoadingProducts(false);
    }
  };

  const [wooProductData, setWooProductData] = useState<{ label: string; value: string }[]>([]);
  const [loadingWooProducts, setLoadingWooProducts] = useState(false);

  const loadWooProducts = async () => {
    setLoadingWooProducts(true);
    try {
      const products = await getWooProducts();
      setWooProductData(products.map((product) => ({ label: product.name, value: product.id })));
    } finally {
      setLoadingWooProducts(false);
    }
  };

  // Build live summary
  const triggerLabel = filteredTriggerEvents.find((e) => e.value === triggerEvent)?.label;
  const conditionCount = groups?.reduce((sum, g) => sum + (g.conditions?.length ?? 0), 0) ?? 0;
  const actionCount = actions?.length ?? 0;

  const sections: Section[] = ["trigger", "conditions", "actions", "options"];

  const toggleSection = (section: Section) => {
    setActiveSection((prev) => (prev === section ? prev : section));
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
        {/* ── Top bar: Platform + Name ── */}
        <div className={cn("rounded-2xl border bg-card p-5 shadow-sm", pColor.glow)}>
          <FieldGroup>
            {/* Platform pills + Rule name side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 items-end">
              <Controller
                control={form.control}
                name="platform"
                render={({ field }) => (
                  <Field>
                    <FieldTitle className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                      Platform
                    </FieldTitle>
                    <div className="inline-flex gap-1 rounded-lg bg-muted/50 p-1">
                      {PLATFORMS.map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => {
                            if (field.value === p.value) return;
                            field.onChange(p.value);
                            form.setValue("whatsappSettingsPhoneIds", []);
                            const firstEvent = getTriggerEventsForPlatform(p.value)[0];
                            form.setValue("triggerEvent", firstEvent?.value ?? "MESSAGE_RECEIVED");
                            form.setValue("groups", [
                              {
                                operator: "AND",
                                conditions: [
                                  {
                                    field: "MESSAGE_BODY",
                                    operator: "CONTAINS",
                                    value: "",
                                  },
                                ],
                              },
                            ]);
                            form.setValue("options.shopifyEvent", undefined);
                            form.setValue("options.shopifyProductIds", []);
                            form.setValue("options.wooEvent", undefined);
                            form.setValue("options.wooProductIds", []);
                            form.setValue("options.instagramScope", "ALL");
                            form.setValue("options.instagramPostIds", []);
                          }}
                          className={cn(
                            "rounded-md px-3.5 py-1.5 text-sm font-medium transition-all",
                            field.value === p.value
                              ? platformColor[p.value as Platform].activePill
                              : cn(
                                  "text-muted-foreground",
                                  platformColor[p.value as Platform].pill,
                                ),
                          )}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="name"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldTitle className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                      Rule Name
                    </FieldTitle>
                    <Input
                      placeholder="e.g., Welcome message for new customers"
                      className="h-9"
                      {...field}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>
          </FieldGroup>

          {/* Channel selector */}
          <div className="mt-4">
            <Controller
              control={form.control}
              name="whatsappSettingsPhoneIds"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldTitle className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    Channels
                  </FieldTitle>
                  <AccountSelector
                    multiple
                    value={field.value}
                    onChange={field.onChange}
                    platform={platform}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>
        </div>

        {/* ── Flow visualization ── */}
        <div className="flex items-center justify-center gap-1 py-1">
          {sections.map((s, i) => {
            const meta = SECTION_META[s];
            const Icon = meta.icon;
            const isActive = activeSection === s;
            const isDone =
              (s === "trigger" && !!triggerEvent) ||
              (s === "conditions" && conditionCount > 0) ||
              (s === "actions" && actionCount > 0) ||
              s === "options";
            return (
              <React.Fragment key={s}>
                {i > 0 && (
                  <IconArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                )}
                <button
                  type="button"
                  onClick={() => toggleSection(s)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
                    isActive
                      ? "bg-foreground text-background shadow-sm"
                      : isDone
                        ? "bg-muted text-foreground hover:bg-muted/80"
                        : "text-muted-foreground hover:bg-muted/50",
                  )}
                >
                  <Icon className={cn("w-3.5 h-3.5", isActive ? "text-background" : meta.color)} />
                  {meta.label}
                  {isDone && !isActive && <IconCircleCheck className="w-3 h-3 text-emerald-500" />}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* ── Live summary sentence ── */}
        {(triggerLabel || conditionCount > 0 || actionCount > 0) && (
          <div className="rounded-xl bg-muted/40 border border-dashed px-4 py-3 text-sm text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">{ruleName || "Untitled rule"}</span>
            {triggerLabel && (
              <>
                {""}— <span className="text-amber-600 dark:text-amber-400 font-medium">when</span>
                {""}
                <span className="italic">{triggerLabel.toLowerCase()}</span>
              </>
            )}
            {conditionCount > 0 && (
              <>
                , <span className="text-violet-600 dark:text-violet-400 font-medium">if</span>
                {""}
                {conditionCount} condition{conditionCount !== 1 ? "s" : ""} match
              </>
            )}
            {actionCount > 0 && (
              <>
                , <span className="text-emerald-600 dark:text-emerald-400 font-medium">then</span>
                {""}
                {actionCount} action{actionCount !== 1 ? "s" : ""}
              </>
            )}
          </div>
        )}

        {/* ── Panels ── */}
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          {sections.map((s, i) => {
            const meta = SECTION_META[s];
            const Icon = meta.icon;
            const isOpen = activeSection === s;

            return (
              <div key={s} className={cn(i > 0 && "border-t")}>
                {/* Section header */}
                <button
                  type="button"
                  onClick={() => toggleSection(s)}
                  className={cn(
                    "flex w-full items-center gap-3 px-5 py-4 text-left transition-colors",
                    isOpen ? "bg-muted/30" : "hover:bg-muted/20",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg",
                      isOpen ? "bg-foreground/10" : "bg-muted",
                    )}
                  >
                    <Icon className={cn("w-4 h-4", meta.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold">{meta.label}</span>
                    {s === "trigger" && triggerLabel && !isOpen && (
                      <span className="ml-2 text-xs text-muted-foreground">{triggerLabel}</span>
                    )}
                    {s === "conditions" && conditionCount > 0 && !isOpen && (
                      <Badge variant="secondary" className="ml-2 text-[10px]">
                        {conditionCount}
                      </Badge>
                    )}
                    {s === "actions" && actionCount > 0 && !isOpen && (
                      <Badge variant="secondary" className="ml-2 text-[10px]">
                        {actionCount}
                      </Badge>
                    )}
                  </div>
                  <IconChevronDown
                    className={cn(
                      "w-4 h-4 text-muted-foreground transition-transform",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>

                {/* Section content */}
                <div
                  className={cn(
                    "grid transition-all duration-200",
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="px-5 pb-5 pt-1">
                      {s === "trigger" && (
                        <TriggerPanel
                          form={form}
                          filteredTriggerEvents={filteredTriggerEvents}
                          isShopifyTrigger={isShopifyTrigger}
                          isWooTrigger={isWooTrigger}
                        />
                      )}
                      {s === "conditions" && (
                        <ConditionsPanel
                          form={form}
                          groupFields={groupFields}
                          appendGroup={appendGroup}
                          removeGroup={removeGroup}
                          triggerEvent={triggerEvent}
                          isMessageReceivedTrigger={isMessageReceivedTrigger}
                          isShopifyTrigger={isShopifyTrigger}
                          isInstagramTrigger={isInstagramTrigger}
                          isInstagramCommentTrigger={isInstagramCommentTrigger}
                          isInstagramStoryTrigger={isInstagramStoryTrigger}
                          isInstagramReferralTrigger={isInstagramReferralTrigger}
                          instagramCommentSource={instagramCommentSource}
                          shopifyEvent={shopifyEvent}
                          shopifyProductIds={shopifyProductIds}
                          instagramScope={instagramScope}
                          activeIbaId={activeIbaId}
                          mediaOptions={mediaOptions}
                          mediaLoading={mediaLoading}
                          storiesLoading={storiesLoading}
                          productData={productData}
                          loadingProducts={loadingProducts}
                          loadShopifyProducts={loadShopifyProducts}
                          isWooTrigger={isWooTrigger}
                          wooProductIds={wooProductIds}
                          wooProductData={wooProductData}
                          loadingWooProducts={loadingWooProducts}
                          loadWooProducts={loadWooProducts}
                          pColor={pColor}
                        />
                      )}
                      {s === "actions" && (
                        <Controller
                          control={form.control}
                          name="actions"
                          render={({ fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                              <ActionList />
                              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                            </Field>
                          )}
                        />
                      )}
                      {s === "options" && <RuleOptions />}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Sticky footer ── */}
        <div className="sticky bottom-0 z-20">
          <div className="rounded-2xl border bg-card/95 backdrop-blur-sm px-5 py-3.5 shadow-lg flex items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground hidden sm:block">
              Rule will be active immediately after saving
            </p>
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="ghost" onClick={onCancel} className="h-9">
                Cancel
              </Button>
              <Button type="submit" loading={isPending} className="h-9 min-w-32">
                <IconDeviceFloppy className="w-4 h-4 mr-2" />
                {buttonText}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </FormProvider>
  );
};

/* ── Trigger panel ── */
const TriggerPanel: React.FC<{
  form: UseFormReturn<CreateRuleInput, unknown, CreateRuleValues>;
  filteredTriggerEvents: { label: string; value: string }[];
  isShopifyTrigger: boolean;
  isWooTrigger: boolean;
}> = ({ form, filteredTriggerEvents, isShopifyTrigger, isWooTrigger }) => (
  <div className="space-y-4">
    <Controller
      control={form.control}
      name="triggerEvent"
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldTitle>Trigger Event</FieldTitle>
          <Select
            key={field.value}
            onValueChange={(value) => {
              field.onChange(value);
              const currentGroups = form.getValues("groups");
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
              if (value !== "INSTAGRAM_COMMENT") {
                form.setValue("options.instagramCommentSource", undefined);
              }
              if (value !== "INSTAGRAM_REFERRAL") {
                form.setValue("options.instagramRef", undefined);
              }
              if (value !== "MESSAGE_RECEIVED") {
                form.setValue("groups", []);
              } else if (currentGroups.length === 0) {
                form.setValue("groups", [
                  {
                    operator: "AND",
                    conditions: [
                      {
                        field: "MESSAGE_BODY",
                        operator: "CONTAINS",
                        value: "",
                      },
                    ],
                  },
                ]);
              }
            }}
            value={field.value}
            items={filteredTriggerEvents}
          >
            <SelectTrigger className="w-full" aria-invalid={fieldState.invalid}>
              <SelectValue placeholder="Select event" />
            </SelectTrigger>
            <SelectContent>
              {filteredTriggerEvents.map((opt) => (
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

    {isShopifyTrigger && (
      <Controller
        control={form.control}
        name="options.shopifyEvent"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldTitle>Shopify Trigger Condition</FieldTitle>
            <Select onValueChange={field.onChange} value={field.value} items={shopifyEventData}>
              <SelectTrigger className="w-full" aria-invalid={fieldState.invalid}>
                <SelectValue placeholder="Select Shopify event" />
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

    {isWooTrigger && (
      <Controller
        control={form.control}
        name="options.wooEvent"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldTitle>WooCommerce order status</FieldTitle>
            <Select onValueChange={field.onChange} value={field.value} items={wooEventData}>
              <SelectTrigger className="w-full" aria-invalid={fieldState.invalid}>
                <SelectValue placeholder="Select order status" />
              </SelectTrigger>
              <SelectContent>
                {wooEventData.map((opt) => (
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
  </div>
);

const ABANDONED_DELAY_OPTIONS = [
  { value: "30", label: "30 minutes" },
  { value: "60", label: "1 hour" },
  { value: "180", label: "3 hours" },
  { value: "720", label: "12 hours" },
  { value: "1440", label: "1 day" },
  { value: "4320", label: "3 days" },
  { value: "10080", label: "7 days" },
  { value: "custom", label: "Custom…" },
];

const DELAY_UNITS = [
  { value: "1", label: "minutes" },
  { value: "60", label: "hours" },
  { value: "1440", label: "days" },
];

/** The largest unit a delay divides into evenly, so 2880 minutes shows as 2 days. */
function splitDelay(minutes: number) {
  const unit = [1440, 60, 1].find((size) => minutes % size === 0) ?? 1;
  return { amount: minutes / unit, unit };
}

/** A preset, or any number of minutes, hours or days from 15 minutes to 7 days. */
const DelayField: React.FC<{
  value: number | undefined;
  onChange: (minutes: number) => void;
  error?: { message?: string };
}> = ({ value, onChange, error }) => {
  const minutes = value ?? 60;
  const isPreset = ABANDONED_DELAY_OPTIONS.some((opt) => opt.value === String(minutes));
  const [custom, setCustom] = useState(!isPreset);
  const { amount, unit } = splitDelay(minutes);

  return (
    <Field data-invalid={Boolean(error)}>
      <FieldTitle>Send after</FieldTitle>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={custom ? "custom" : String(minutes)}
          onValueChange={(next) => {
            if (next === "custom") {
              setCustom(true);
              return;
            }
            setCustom(false);
            onChange(Number(next ?? 60));
          }}
          items={ABANDONED_DELAY_OPTIONS}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ABANDONED_DELAY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {custom && (
          <>
            <Input
              type="number"
              min={1}
              step={1}
              aria-label="Delay amount"
              className="w-24"
              value={amount}
              onChange={(event) => {
                const next = Math.max(0, Math.floor(Number(event.target.value)));
                onChange(next * unit);
              }}
            />
            <Select
              value={String(unit)}
              onValueChange={(next) => onChange(amount * Number(next ?? 1))}
              items={DELAY_UNITS}
            >
              <SelectTrigger className="w-28" aria-label="Delay unit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DELAY_UNITS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
      </div>
      <FieldDescription className="text-xs">
        Anywhere from 15 minutes to 7 days, counted from the buyer's last change to the checkout.
        Nothing is sent if they complete the order first. For follow-ups, add more rules with longer
        delays — 1 hour, 1 day and 3 days works well.
      </FieldDescription>
      {error && <FieldError errors={[error]} />}
    </Field>
  );
};

/** When an abandoned-checkout rule reminds, and whom. Unset values mean the API defaults. */
const AbandonedCheckoutOptions: React.FC<{
  form: UseFormReturn<CreateRuleInput, unknown, CreateRuleValues>;
}> = ({ form }) => (
  <div className="rounded-xl border p-4 bg-muted/20 space-y-4">
    <Controller
      control={form.control}
      name="options.abandonedCheckoutDelayMinutes"
      render={({ field, fieldState }) => (
        <DelayField value={field.value} onChange={field.onChange} error={fieldState.error} />
      )}
    />
    <Controller
      control={form.control}
      name="options.requireMarketingConsent"
      render={({ field }) => (
        <Field orientation="horizontal" className="items-start gap-3">
          <Checkbox
            id="abandoned-marketing-consent"
            checked={field.value ?? true}
            onCheckedChange={(checked) => field.onChange(Boolean(checked))}
          />
          <div className="flex-1">
            <FieldLabel htmlFor="abandoned-marketing-consent" className="font-medium">
              Only buyers who accepted marketing
            </FieldLabel>
            <FieldDescription className="text-xs mt-0.5">
              WhatsApp treats cart reminders as marketing, so use a Marketing template and message
              only buyers who ticked the marketing box at checkout.
            </FieldDescription>
          </div>
        </Field>
      )}
    />
  </div>
);

/* ── Conditions panel ── */
const ConditionsPanel: React.FC<{
  form: UseFormReturn<CreateRuleInput, unknown, CreateRuleValues>;
  groupFields: Array<{ id: string }>;
  appendGroup: (group: CreateRuleInput["groups"][number]) => void;
  removeGroup: (idx: number) => void;
  triggerEvent: string;
  isMessageReceivedTrigger: boolean;
  isShopifyTrigger: boolean;
  isInstagramTrigger: boolean;
  isInstagramCommentTrigger: boolean;
  isInstagramStoryTrigger: boolean;
  isInstagramReferralTrigger: boolean;
  instagramCommentSource: string | undefined;
  shopifyEvent: string | undefined;
  shopifyProductIds: string[];
  instagramScope: string;
  activeIbaId: string | undefined;
  mediaOptions: { value: string; label: string }[];
  mediaLoading: boolean;
  storiesLoading: boolean;
  productData: { label: string; value: string }[];
  loadingProducts: boolean;
  loadShopifyProducts: () => void;
  isWooTrigger: boolean;
  wooProductIds: string[];
  wooProductData: { label: string; value: string }[];
  loadingWooProducts: boolean;
  loadWooProducts: () => void;
  pColor: typeof platformColor.WHATSAPP;
}> = ({
  form,
  groupFields,
  appendGroup,
  removeGroup,
  triggerEvent,
  isMessageReceivedTrigger,
  isShopifyTrigger,
  isInstagramTrigger,
  isInstagramCommentTrigger,
  isInstagramStoryTrigger,
  isInstagramReferralTrigger,
  instagramCommentSource,
  shopifyEvent,
  shopifyProductIds,
  instagramScope,
  activeIbaId,
  mediaOptions,
  mediaLoading,
  storiesLoading,
  productData,
  loadingProducts,
  loadShopifyProducts,
  isWooTrigger,
  wooProductIds,
  wooProductData,
  loadingWooProducts,
  loadWooProducts,
}) => (
  <div className="space-y-4">
    {groupFields.length > 1 && (
      <div className="flex justify-end">
        <Tabs
          defaultValue={form.getValues("operator") ?? "AND"}
          onValueChange={(e) => form.setValue("operator", e)}
        >
          <TabsList>
            <TabsTrigger value="AND">Match all</TabsTrigger>
            <TabsTrigger value="OR">Match any</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    )}

    {/* Instagram-specific */}
    {isInstagramTrigger && (
      <div className="space-y-4">
        <div className="rounded-lg border border-dashed p-3.5 text-sm text-muted-foreground">
          {isInstagramCommentTrigger
            ? "Runs when someone comments on your post, reel, or ad. The first message your actions send arrives as a private reply to that comment."
            : "Triggers when someone mentions your account in their Instagram Story."}
        </div>

        {isInstagramCommentTrigger && <InstagramCommentSource />}

        {isInstagramCommentTrigger && instagramCommentSource !== "LIVE" && (
          <div className="rounded-xl border p-4 bg-muted/20 space-y-3">
            <span className="text-sm font-semibold block">Apply to</span>
            <Controller
              control={form.control}
              name="options.instagramScope"
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-2">
                  {INSTAGRAM_SCOPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        field.onChange(opt.value);
                        if (opt.value === "ALL") form.setValue("options.instagramPostIds", []);
                      }}
                      className={cn(
                        "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                        field.value === opt.value
                          ? "border-foreground/20 bg-foreground/5 text-foreground"
                          : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            />

            {instagramScope === "SPECIFIC" && (
              <div className="space-y-2 pt-1">
                {!activeIbaId ? (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Select an Instagram account above to load available{" "}
                    {isInstagramCommentTrigger ? "posts" : "stories"}.
                  </p>
                ) : (
                  <Controller
                    control={form.control}
                    name="options.instagramPostIds"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldTitle>
                          Select {isInstagramCommentTrigger ? "posts / reels" : "stories"}
                        </FieldTitle>
                        <MultiSelect
                          options={mediaOptions}
                          value={field.value ?? []}
                          onValueChange={field.onChange}
                          disabled={mediaLoading || storiesLoading}
                          placeholder={
                            mediaLoading || storiesLoading
                              ? "Loading…"
                              : `Select ${isInstagramCommentTrigger ? "posts" : "stories"}…`
                          }
                          emptyIndicator="No items found."
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {isInstagramCommentTrigger && <InstagramPublicReplies />}
      </div>
    )}

    {isInstagramReferralTrigger && (
      <div className="space-y-4">
        <div className="rounded-lg border border-dashed p-3.5 text-sm text-muted-foreground">
          Runs when someone opens a chat with you from this ig.me link — share it in your bio,
          stories or anywhere online.
        </div>
        <InstagramLinkRef />
      </div>
    )}

    {/* Shopify-specific */}
    {isShopifyTrigger && (
      <div className="space-y-4">
        <div className="rounded-lg border border-dashed p-3.5 text-sm text-muted-foreground">
          Shopify rules use the selected Shopify event as the trigger condition.
        </div>

        {shopifyEvent === ShopifyEvents.ABANDONED_CHECKOUTS && (
          <AbandonedCheckoutOptions form={form} />
        )}

        <div className="rounded-xl border p-4 bg-muted/20 space-y-3">
          <span className="text-sm font-semibold block">Product Filter (optional)</span>
          <p className="text-xs text-muted-foreground">
            {shopifyEvent === ShopifyEvents.ABANDONED_CHECKOUTS
              ? "The rule triggers if the cart contains any selected product."
              : "The rule triggers if the order contains any selected product."}
          </p>

          {shopifyProductIds.map((_, index: number) => (
            <div key={index} className="flex items-end gap-2 mt-2">
              <Controller
                control={form.control}
                name={`options.shopifyProductIds.${index}`}
                render={({ field, fieldState }) => (
                  <Field className="flex-1" data-invalid={fieldState.invalid}>
                    <FieldTitle>Product {index + 1}</FieldTitle>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                      items={productData}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Product" />
                      </SelectTrigger>
                      <SelectContent>
                        {productData.map((prod) => (
                          <SelectItem key={prod.value} value={prod.value}>
                            {prod.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Button
                aria-label="Delete"
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  const next = shopifyProductIds.filter((_, i: number) => i !== index);
                  form.setValue("options.shopifyProductIds", next);
                }}
                className="text-muted-foreground hover:text-destructive"
              >
                <IconTrash className="w-4 h-4" />
              </Button>
            </div>
          ))}

          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                form.setValue("options.shopifyProductIds", [...shopifyProductIds, ""]);
                if (!productData.length) loadShopifyProducts();
              }}
            >
              <IconPlus className="w-4 h-4 mr-2" />
              Add product
            </Button>
            <Button
              aria-label="Refresh products"
              type="button"
              variant="outline"
              size="icon"
              onClick={loadShopifyProducts}
              disabled={loadingProducts}
              title="Refresh products"
            >
              {loadingProducts ? (
                <IconLoader2 className="animate-spin h-4 w-4" />
              ) : (
                <IconRefresh size={18} />
              )}
            </Button>
          </div>
        </div>
      </div>
    )}

    {/* WooCommerce-specific */}
    {isWooTrigger && (
      <div className="space-y-4">
        <div className="rounded-lg border border-dashed p-3.5 text-sm text-muted-foreground">
          WooCommerce rules fire when an order reaches the selected status. The message goes to the
          phone number on the order.
        </div>

        <div className="rounded-xl border p-4 bg-muted/20 space-y-3">
          <span className="text-sm font-semibold block">Product Filter (optional)</span>
          <p className="text-xs text-muted-foreground">
            The rule triggers if the order contains any selected product.
          </p>

          {wooProductIds.map((_, index: number) => (
            <div key={index} className="flex items-end gap-2 mt-2">
              <Controller
                control={form.control}
                name={`options.wooProductIds.${index}`}
                render={({ field, fieldState }) => (
                  <Field className="flex-1" data-invalid={fieldState.invalid}>
                    <FieldTitle>Product {index + 1}</FieldTitle>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                      items={wooProductData}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Product" />
                      </SelectTrigger>
                      <SelectContent>
                        {wooProductData.map((prod) => (
                          <SelectItem key={prod.value} value={prod.value}>
                            {prod.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Button
                aria-label="Delete"
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  const next = wooProductIds.filter((_, i: number) => i !== index);
                  form.setValue("options.wooProductIds", next);
                }}
                className="text-muted-foreground hover:text-destructive"
              >
                <IconTrash className="w-4 h-4" />
              </Button>
            </div>
          ))}

          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                form.setValue("options.wooProductIds", [...wooProductIds, ""]);
                if (!wooProductData.length) loadWooProducts();
              }}
            >
              <IconPlus className="w-4 h-4 mr-2" />
              Add product
            </Button>
            <Button
              aria-label="Refresh products"
              type="button"
              variant="outline"
              size="icon"
              onClick={loadWooProducts}
              disabled={loadingWooProducts}
              title="Refresh products"
            >
              {loadingWooProducts ? (
                <IconLoader2 className="animate-spin h-4 w-4" />
              ) : (
                <IconRefresh size={18} />
              )}
            </Button>
          </div>
        </div>
      </div>
    )}

    {/* Standard condition blocks */}
    {!isInstagramStoryTrigger &&
      !isInstagramReferralTrigger &&
      !isShopifyTrigger &&
      !isWooTrigger &&
      groupFields.map((group, groupIndex: number) => (
        <div key={group.id} className="rounded-xl border p-4 bg-muted/20">
          <div className="flex items-center justify-between mb-3 pb-3 border-b">
            <span className="text-sm font-semibold">Block {groupIndex + 1}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeGroup(groupIndex)}
              disabled={triggerEvent === "MESSAGE_RECEIVED" && groupFields.length === 1}
              className="h-7 text-muted-foreground hover:text-destructive"
            >
              <IconTrash className="w-3.5 h-3.5" />
            </Button>
          </div>
          <ConditionList
            name={`groups.${groupIndex}.conditions`}
            groupOperator={(form.watch(`groups.${groupIndex}.operator`) as "AND" | "OR") || "AND"}
            onOperatorChange={(operator) =>
              form.setValue(`groups.${groupIndex}.operator`, operator)
            }
            allowedFields={isInstagramCommentTrigger ? ["MESSAGE_BODY"] : undefined}
          />
        </div>
      ))}

    {!isShopifyTrigger && !isInstagramStoryTrigger && !isInstagramReferralTrigger && (
      <Button
        type="button"
        variant="outline"
        className="w-full border-dashed"
        onClick={() => {
          const defaultField =
            isMessageReceivedTrigger || isInstagramCommentTrigger
              ? "MESSAGE_BODY"
              : "CONTACT_EMAIL";
          appendGroup({
            operator: "AND",
            conditions: [{ field: defaultField, operator: "CONTAINS", value: "" }],
          });
        }}
      >
        <IconPlus className="w-4 h-4 mr-2" />
        Add condition block
      </Button>
    )}
  </div>
);

export default RuleBuilderForm;
