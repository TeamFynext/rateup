import React, { useState } from "react";

import { IconRefresh } from "@tabler/icons-react";
import {
  CheckCircle,
  ClipboardList,
  Loader2,
  PlusIcon,
  Save,
  Settings,
  Trash2Icon,
  Zap,
} from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { Controller, useFieldArray, useWatch } from "react-hook-form";

import { ShopifyEvents } from "@/types/enums.ts";
import { getProductsFromShopify } from "@/backend/appsIntegration/shopify/shopify.api";
import {
  useInstagramMediaPosts,
  useInstagramStories,
} from "@/backend/whatsapp/instagram-profile/instagramProfile.query";
import { AccountSelector } from "@/components/input/AccountSelector.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field.tsx";
import { Form } from "@/components/ui/form.tsx";
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
import { shopifyEventData } from "@/utils/constants.ts";

import ActionList from "./ActionList.tsx";
import ConditionList from "./ConditionList.tsx";
import RuleOptions from "./RuleOptions.tsx";
import type { CreateRuleInput, Platform } from "./schema.ts";
import {
  getTriggerEventsForPlatform,
  INSTAGRAM_SCOPE_OPTIONS,
  PLATFORMS,
} from "./schema.ts";

interface RuleBuilderFormProps {
  form: UseFormReturn<CreateRuleInput>;
  onSubmit: (data: CreateRuleInput) => void;
  onCancel: () => void;
  isPending: boolean;
  buttonText: string;
}

const RuleBuilderForm: React.FC<RuleBuilderFormProps> = ({
  form,
  onSubmit,
  onCancel,
  isPending,
  buttonText,
}) => {
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
  const filteredTriggerEvents = getTriggerEventsForPlatform(platform);

  const platformCardClassMap: Record<Platform, string> = {
    WHATSAPP: "ring-green-500/50 dark:ring-green-500/30",
    INSTAGRAM: "ring-pink-500/50 dark:ring-pink-500/30",
    FACEBOOK: "ring-blue-500/50 dark:ring-blue-500/30",
  };
  const platformCardClass = platformCardClassMap[platform];

  const triggerEvent = useWatch({
    control: form.control,
    name: "triggerEvent",
  });
  const isMessageReceivedTrigger = triggerEvent === "MESSAGE_RECEIVED";
  const isShopifyTrigger = triggerEvent === "SHOPIFY_EVENT";
  const isInstagramCommentTrigger = triggerEvent === "INSTAGRAM_COMMENT";
  const isInstagramStoryTrigger = triggerEvent === "INSTAGRAM_STORY_MENTION";
  const isInstagramTrigger =
    isInstagramCommentTrigger || isInstagramStoryTrigger;
  const shopifyEvent = useWatch({
    control: form.control,
    name: "options.shopifyEvent",
  });
  const shopifyProductIds =
    useWatch({
      control: form.control,
      name: "options.shopifyProductIds",
    }) ?? [];

  const instagramScope =
    useWatch({ control: form.control, name: "options.instagramScope" }) ??
    "ALL";

  const selectedPhoneIds =
    useWatch({ control: form.control, name: "whatsappSettingsPhoneIds" }) ?? [];
  // Use the first selected account as the ibaId source for media fetching
  const activeIbaId =
    isInstagramTrigger && instagramScope === "SPECIFIC"
      ? selectedPhoneIds[0]
      : undefined;
  const { data: mediaPosts, isLoading: mediaLoading } = useInstagramMediaPosts(
    isInstagramCommentTrigger ? activeIbaId : undefined,
  );
  const { data: stories, isLoading: storiesLoading } = useInstagramStories(
    isInstagramStoryTrigger ? activeIbaId : undefined,
  );

  const mediaItems = isInstagramCommentTrigger
    ? (mediaPosts ?? [])
    : (stories ?? []);

  const mediaOptions = mediaItems.map((item: any) => {
    const label = item.caption
      ? `${item.caption.slice(0, 60)}${item.caption.length > 60 ? "…" : ""}`
      : `${item.media_type} · ${new Date(item.timestamp).toLocaleDateString()}`;
    return { value: item.id, label };
  });

  const [productData, setProductData] = useState<
    { label: string; value: string }[]
  >([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const loadShopifyProducts = async () => {
    setLoadingProducts(true);
    try {
      const products = await getProductsFromShopify();
      setProductData(
        products
          ? products.map((product: any) => ({
              label: product.title,
              value: product.id.toString(),
            }))
          : [],
      );
    } finally {
      setLoadingProducts(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information Card */}
        <Card className={platformCardClass}>
          <CardContent>
            <h2 className="text-lg font-semibold mb-4">Basic Information</h2>

            <FieldGroup>
              <Controller
                control={form.control}
                name="platform"
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Platform</FieldLabel>
                    <div className="flex gap-2">
                      {PLATFORMS.map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => {
                            if (field.value === p.value) return;
                            field.onChange(p.value);
                            form.setValue("whatsappSettingsPhoneIds", []);
                            const firstEvent = getTriggerEventsForPlatform(
                              p.value,
                            )[0];
                            form.setValue(
                              "triggerEvent",
                              firstEvent?.value ?? "MESSAGE_RECEIVED",
                            );
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
                            form.setValue("options.instagramScope", "ALL");
                            form.setValue("options.instagramPostIds", []);
                          }}
                          className={(() => {
                            const base =
                              "flex-1 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors";
                            if (field.value !== p.value) {
                              return `${base} border-muted bg-background text-muted-foreground hover:border-muted-foreground/40`;
                            }
                            const activeClassMap: Record<string, string> = {
                              WHATSAPP:
                                "border-green-500 bg-green-500/10 text-green-600 dark:text-green-400",
                              INSTAGRAM:
                                "border-pink-500 bg-pink-500/10 text-pink-600 dark:text-pink-400",
                              FACEBOOK:
                                "border-blue-600 bg-blue-600/10 text-blue-600 dark:text-blue-400",
                            };
                            return `${base} ${activeClassMap[p.value] ?? ""}`;
                          })()}
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
                name="whatsappSettingsPhoneIds"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Channels</FieldLabel>
                    <AccountSelector
                      multiple
                      value={field.value}
                      onChange={field.onChange}
                      platform={platform as any}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="name"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Rule Name</FieldLabel>
                    <Input
                      placeholder="e.g., Welcome message for new customers"
                      {...field}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>
          </CardContent>
        </Card>

        {/* WHEN Card */}
        <Card className={platformCardClass}>
          <CardContent>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">When</h3>
                <p className="text-sm text-muted-foreground">
                  Choose the trigger event
                </p>
              </div>
            </div>

            <Controller
              control={form.control}
              name="triggerEvent"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <Select
                    key={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      const currentGroups = form.getValues("groups");
                      if (value !== "SHOPIFY_EVENT") {
                        form.setValue("options.shopifyEvent", undefined);
                        form.setValue("options.shopifyProductIds", []);
                      }
                      if (
                        value !== "INSTAGRAM_COMMENT" &&
                        value !== "INSTAGRAM_STORY_MENTION"
                      ) {
                        form.setValue("options.instagramScope", "ALL");
                        form.setValue("options.instagramPostIds", []);
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
                  >
                    <SelectTrigger
                      className="w-full"
                      aria-invalid={fieldState.invalid}
                    >
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
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            {isShopifyTrigger && (
              <Controller
                control={form.control}
                name="options.shopifyEvent"
                render={({ field, fieldState }) => (
                  <Field className="mt-4" data-invalid={fieldState.invalid}>
                    <FieldLabel>Shopify Trigger Condition</FieldLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger
                        className="w-full"
                        aria-invalid={fieldState.invalid}
                      >
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
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            )}
          </CardContent>
        </Card>

        {/* IF Card - Condition Groups */}
        <Card className={platformCardClass}>
          <CardContent>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">If</h3>
                <p className="text-sm text-muted-foreground">
                  Set conditions for the rule
                </p>
              </div>
              {groupFields.length > 1 && (
                <Tabs
                  defaultValue={form.getValues("operator") ?? "AND"}
                  onValueChange={(e) => {
                    form.setValue("operator", e);
                  }}
                >
                  <TabsList>
                    <TabsTrigger value="AND">Match all</TabsTrigger>
                    <TabsTrigger value="OR">Match any</TabsTrigger>
                  </TabsList>
                </Tabs>
              )}
            </div>

            <div className="space-y-4">
              {isInstagramTrigger && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-dashed border-pink-300 dark:border-pink-700 p-4 text-sm text-muted-foreground">
                    {isInstagramCommentTrigger
                      ? "Sends a private reply when someone comments on your post, reel, or ad."
                      : "Triggers when someone mentions your account in their Instagram Story. Applies to all story mentions."}
                  </div>

                  {/* Scope selector - only for comments, story mentions always apply to all */}
                  {isInstagramCommentTrigger && (
                    <div className="border-2 border-pink-200 dark:border-pink-800 rounded-lg p-4 bg-pink-50/50 dark:bg-pink-950/20 space-y-3">
                      <span className="text-sm font-semibold text-pink-800 dark:text-pink-300 block">
                        Apply to
                      </span>

                      <Controller
                        control={form.control}
                        name="options.instagramScope"
                        render={({ field }) => (
                          <div className="flex gap-3">
                            {INSTAGRAM_SCOPE_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                  field.onChange(opt.value);
                                  if (opt.value === "ALL") {
                                    form.setValue(
                                      "options.instagramPostIds",
                                      [],
                                    );
                                  }
                                }}
                                className={`flex-1 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                                  field.value === opt.value
                                    ? "border-pink-500 bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200"
                                    : "border-muted bg-background text-muted-foreground hover:border-pink-300"
                                }`}
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
                              Select an Instagram account above to load
                              available{" "}
                              {isInstagramCommentTrigger ? "posts" : "stories"}.
                            </p>
                          ) : (
                            <Controller
                              control={form.control}
                              name="options.instagramPostIds"
                              render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                  <FieldLabel>
                                    Select{" "}
                                    {isInstagramCommentTrigger
                                      ? "posts / reels"
                                      : "stories"}
                                  </FieldLabel>
                                  <MultiSelect
                                    options={mediaOptions}
                                    onValueChange={field.onChange}
                                    defaultValue={field.value ?? []}
                                    placeholder={
                                      mediaLoading || storiesLoading
                                        ? "Loading…"
                                        : `Select ${isInstagramCommentTrigger ? "posts" : "stories"}…`
                                    }
                                    disabled={mediaLoading || storiesLoading}
                                  />
                                  {fieldState.invalid && (
                                    <FieldError errors={[fieldState.error]} />
                                  )}
                                </Field>
                              )}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {isShopifyTrigger && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-dashed border-purple-300 dark:border-purple-700 p-4 text-sm text-muted-foreground">
                    Shopify rules use the selected Shopify event as the trigger
                    condition. Message condition blocks are not used for this
                    trigger.
                  </div>

                  {shopifyEvent !== ShopifyEvents.ABANDONED_CHECKOUTS && (
                    <div className="border-2 border-purple-200 dark:border-purple-800 rounded-lg p-4 bg-purple-50/50 dark:bg-purple-950/20 space-y-3">
                      <span className="text-sm font-semibold text-purple-800 dark:text-purple-300 block">
                        Product Filter (optional)
                      </span>
                      <p className="text-xs text-muted-foreground">
                        Add one or more product conditions. The rule will
                        trigger if the order contains any selected product.
                      </p>

                      {shopifyProductIds.map((_, index) => (
                        <div key={index} className="flex items-end gap-2 mt-2">
                          <Controller
                            control={form.control}
                            name={`options.shopifyProductIds.${index}`}
                            render={({ field, fieldState }) => (
                              <Field
                                className="flex-1"
                                data-invalid={fieldState.invalid}
                              >
                                <FieldLabel>Product {index + 1}</FieldLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value ?? ""}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Product" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {productData.map((prod) => (
                                      <SelectItem
                                        key={prod.value}
                                        value={prod.value}
                                      >
                                        {prod.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {fieldState.invalid && (
                                  <FieldError errors={[fieldState.error]} />
                                )}
                              </Field>
                            )}
                          />

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const next = shopifyProductIds.filter(
                                (_, i) => i !== index,
                              );
                              form.setValue("options.shopifyProductIds", next);
                            }}
                            className="text-muted-foreground hover:text-red-500"
                            title="Remove product condition"
                          >
                            <Trash2Icon className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}

                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            form.setValue("options.shopifyProductIds", [
                              ...shopifyProductIds,
                              "",
                            ]);
                            if (!productData.length) {
                              loadShopifyProducts();
                            }
                          }}
                        >
                          <PlusIcon className="w-4 h-4 mr-2" />
                          Add product condition
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={loadShopifyProducts}
                          disabled={loadingProducts}
                          className="rounded-lg"
                          title="Refresh products"
                        >
                          {loadingProducts ? (
                            <Loader2 className="animate-spin h-4 w-4" />
                          ) : (
                            <IconRefresh size={18} />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!isInstagramStoryTrigger &&
                !isShopifyTrigger &&
                groupFields.map((group, groupIndex) => (
                  <React.Fragment key={group.id}>
                    {/* Condition Block */}
                    <div className="border-2 border-purple-200 dark:border-purple-800 rounded-lg p-4 bg-purple-50/50 dark:bg-purple-950/20">
                      <div className="flex items-center justify-between mb-3 pb-3 border-b border-purple-200 dark:border-purple-800">
                        <span className="text-sm font-semibold text-purple-800 dark:text-purple-300">
                          Condition Block {groupIndex + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeGroup(groupIndex)}
                          disabled={
                            triggerEvent === "MESSAGE_RECEIVED" &&
                            groupFields.length === 1
                          }
                          className="h-8 text-muted-foreground hover:text-red-500"
                        >
                          <Trash2Icon className="w-4 h-4" />
                        </Button>
                      </div>

                      <ConditionList
                        name={`groups.${groupIndex}.conditions`}
                        groupOperator={
                          (form.watch(`groups.${groupIndex}.operator`) as
                            | "AND"
                            | "OR") || "AND"
                        }
                        onOperatorChange={(operator) =>
                          form.setValue(
                            `groups.${groupIndex}.operator`,
                            operator,
                          )
                        }
                        allowedFields={
                          isInstagramCommentTrigger
                            ? ["MESSAGE_BODY"]
                            : undefined
                        }
                      />
                    </div>
                  </React.Fragment>
                ))}

              {!isShopifyTrigger && !isInstagramStoryTrigger && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-2 border-dashed border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/20 hover:bg-purple-100 dark:hover:bg-purple-900/30"
                  onClick={() => {
                    const defaultField =
                      isMessageReceivedTrigger || isInstagramCommentTrigger
                        ? "MESSAGE_BODY"
                        : "CONTACT_EMAIL";
                    appendGroup({
                      operator: "AND",
                      conditions: [
                        {
                          field: defaultField,
                          operator: "CONTAINS",
                          value: "",
                        },
                      ],
                    });
                  }}
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Add condition block
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* THEN Card - Actions */}
        <Card className={platformCardClass}>
          <CardContent>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 flex items-center justify-center">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Then</h3>
                <p className="text-sm text-muted-foreground">
                  Define actions to execute
                </p>
              </div>
            </div>

            <Controller
              control={form.control}
              name="actions"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <ActionList />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </CardContent>
        </Card>

        {/* Options Card */}
        <Card className={platformCardClass}>
          <CardContent>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Options</h3>
                <p className="text-sm text-muted-foreground">
                  Additional settings
                </p>
              </div>
            </div>

            <RuleOptions />
          </CardContent>
        </Card>
        {/* Footer Card */}
        <Card className={platformCardClass}>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Rule will be active immediately after saving
              </p>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending} className="min-w-35">
                  <Save className="w-4 h-4 mr-2" />
                  {buttonText}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="h-1" />
      </form>
    </Form>
  );
};

export default RuleBuilderForm;
