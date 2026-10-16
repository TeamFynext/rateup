import { zodResolver } from "@hookform/resolvers/zod";
import { IconArrowLeft } from "@tabler/icons-react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import React from "react";
import { useForm, useWatch } from "react-hook-form";

import {
  useCreateRuleMutation,
  useRuleById,
  useUpdateRuleMutation,
} from "@/backend/whatsapp/rule/rule.query";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";

import RuleBuilderForm from "./RuleBuilderForm.tsx";
import RuleShare from "./RuleShare.tsx";
import type { CreateRuleInput, CreateRuleValues, Platform } from "./schema.ts";
import { createRuleSchema } from "./schema.ts";

interface WhatsappAutomationRuleBuilderProps {
  ruleId?: string;
  initialPlatform?: Platform;
  initialTriggerEvent?: string;
  /** Preselects the channel when a rule is started from that channel's own page. */
  initialChannelId?: string;
}

const defaultValues = {
  platform: "WHATSAPP",
  whatsappSettingsPhoneIds: [],
  name: "",
  triggerEvent: "MESSAGE_RECEIVED",
  operator: "AND",
  isActive: true,
  groups: [
    {
      operator: "AND",
      conditions: [{ field: "MESSAGE_BODY", operator: "CONTAINS", value: "" }],
    },
  ],
  actions: [{ type: "TRIGGER_CHATBOT", value: "" }],
  options: {
    sendOncePerDay: false,
    businessHours: {
      enabled: false,
      businessHoursId: undefined,
    },
    instagramScope: "ALL",
    instagramPostIds: [],
    instagramPublicReplies: [],
    shopifyProductIds: [],
    wooProductIds: [],
  },
} satisfies Partial<CreateRuleValues>;

type SavedRule = NonNullable<ReturnType<typeof useRuleById>["data"]>;

/**
 * The form's starting values: a saved rule as the form models it, or a new rule's defaults.
 *
 * The form is created from these rather than created empty and `reset()` to the rule once it
 * loads. That order rendered the new-rule default condition block first; its fields registered,
 * then outlived the reset as a hidden `{ conditions: [{}] }` group. A rule saved without
 * conditions (Instagram comment, story mention, Shopify…) then failed validation on that
 * invisible block, and Update did nothing.
 */
function toFormValues(
  rule: SavedRule | undefined,
  initial: Pick<
    WhatsappAutomationRuleBuilderProps,
    "initialPlatform" | "initialTriggerEvent" | "initialChannelId"
  >,
): CreateRuleInput {
  if (!rule) {
    return {
      ...defaultValues,
      ...(initial.initialPlatform && { platform: initial.initialPlatform }),
      ...(initial.initialTriggerEvent && { triggerEvent: initial.initialTriggerEvent }),
      ...(initial.initialChannelId && { whatsappSettingsPhoneIds: [initial.initialChannelId] }),
    };
  }
  return {
    ...defaultValues,
    ...rule,
    whatsappSettingsPhoneIds: rule.whatsappSettingsPhoneIds || [],
    groups: rule.groups || [],
    // The API models "no value" as `null`; the form schema models it as an empty value.
    actions: (rule.actions || []).map((action) =>
      action.value === null ? { ...action, value: "" } : action,
    ),
    // Saved options only hold what was set; the defaults fill in options added since.
    options: { ...defaultValues.options, ...rule.options },
  };
}

const WhatsappAutomationRuleBuilder: React.FC<WhatsappAutomationRuleBuilderProps> = ({
  ruleId,
  initialPlatform,
  initialTriggerEvent,
  initialChannelId,
}) => {
  const isEditMode = Boolean(ruleId && ruleId !== "new");
  const { data: ruleData, isLoading: isRuleLoading } = useRuleById(
    isEditMode ? (ruleId ?? "") : "",
  );

  if (isEditMode && (isRuleLoading || !ruleData)) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="size-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <RuleEditor
      // A different rule is a different form, never a reset of this one.
      key={ruleData?.id ?? "new"}
      ruleId={isEditMode ? ruleId : undefined}
      ruleData={isEditMode ? ruleData : undefined}
      initialValues={toFormValues(isEditMode ? ruleData : undefined, {
        initialPlatform,
        initialTriggerEvent,
        initialChannelId,
      })}
    />
  );
};

const RuleEditor: React.FC<{
  ruleId: string | undefined;
  ruleData: SavedRule | undefined;
  initialValues: CreateRuleInput;
}> = ({ ruleId, ruleData, initialValues }) => {
  const isEditMode = Boolean(ruleId);
  const navigate = useNavigate();
  const { history } = useRouter();
  const createMutation = useCreateRuleMutation();
  const updateMutation = useUpdateRuleMutation();

  const form = useForm<CreateRuleInput, unknown, CreateRuleValues>({
    resolver: zodResolver(createRuleSchema),
    defaultValues: initialValues,
  });

  const ruleName = useWatch({ control: form.control, name: "name" });

  // Use saved data for Share functionality
  const savedTriggerEvent = ruleData?.triggerEvent;
  const savedGroups = ruleData?.groups;
  const savedChannels = ruleData?.whatsappSettingsPhoneIds;

  const hasKeywords = (savedGroups || []).some((g) =>
    g.conditions.some((c) => c.field === "MESSAGE_BODY" && c.value),
  );

  const savedPlatform = ruleData?.platform ?? "WHATSAPP";
  const showShareTab = savedTriggerEvent === "MESSAGE_RECEIVED" && hasKeywords;

  const onSubmit = (data: CreateRuleValues) => {
    if (ruleId) {
      updateMutation.mutate(
        { id: ruleId, ...data },
        {
          onSuccess: () => {
            navigate({
              to: `/dashboard/automation`,
            });
          },
        },
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: (data) => {
          navigate({
            to: `/dashboard/automation/${data?.id}`,
            replace: true,
          });
        },
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  let buttonText = "Create Automation";
  if (isPending) {
    buttonText = "Saving";
  } else if (isEditMode) {
    buttonText = "Update Automation";
  }

  return (
    // The chrome the campaign wizard uses: a 56px breadcrumb bar over the wizard itself.
    <Tabs defaultValue="builder" className="bg-background h-full min-h-0 gap-0">
      <header className="border-border bg-card flex h-14 shrink-0 items-center justify-between gap-4 border-b px-8">
        <div className="flex min-w-0 items-center gap-2.5">
          <Link
            to="/dashboard/automation"
            className="text-muted-foreground hover:text-foreground inline-flex shrink-0 items-center gap-1 text-[13px]"
          >
            <IconArrowLeft className="size-3.5" aria-hidden />
            Automations
          </Link>
          <span className="text-muted-foreground/50" aria-hidden>
            /
          </span>
          <span className="font-display truncate text-[15px] font-semibold">
            {ruleName || (isEditMode ? "Untitled automation" : "New automation")}
          </span>
        </div>
        {showShareTab && (
          <TabsList>
            <TabsTrigger value="builder">Builder</TabsTrigger>
            <TabsTrigger value="share">Share</TabsTrigger>
          </TabsList>
        )}
      </header>

      <TabsContent value="builder" className="flex min-h-0 flex-col">
        <RuleBuilderForm
          form={form}
          onSubmit={onSubmit}
          onCancel={() => history.back()}
          isPending={isPending}
          buttonText={buttonText}
          isEdit={isEditMode}
        />
      </TabsContent>

      <TabsContent value="share" className="min-h-0 overflow-y-auto px-8 py-8">
        <div className="mx-auto max-w-3xl">
          <RuleShare
            groups={savedGroups || []}
            channels={savedChannels || []}
            platform={savedPlatform}
          />
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default WhatsappAutomationRuleBuilder;
