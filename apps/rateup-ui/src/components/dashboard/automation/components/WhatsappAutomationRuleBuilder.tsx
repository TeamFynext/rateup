import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useRouter } from "@tanstack/react-router";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";

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
    shopifyProductIds: [],
    wooProductIds: [],
  },
} satisfies Partial<CreateRuleValues>;

const WhatsappAutomationRuleBuilder: React.FC<WhatsappAutomationRuleBuilderProps> = ({
  ruleId,
  initialPlatform,
  initialTriggerEvent,
}) => {
  const isEditMode = ruleId && ruleId !== "new";
  const { data: ruleData, isLoading: isRuleLoading } = useRuleById(isEditMode ? ruleId : "");
  const navigate = useNavigate();
  const { history } = useRouter();
  const createMutation = useCreateRuleMutation();
  const updateMutation = useUpdateRuleMutation();

  const form = useForm<CreateRuleInput, unknown, CreateRuleValues>({
    resolver: zodResolver(createRuleSchema),
    defaultValues: {
      ...defaultValues,
      ...(initialPlatform && { platform: initialPlatform }),
      ...(initialTriggerEvent && { triggerEvent: initialTriggerEvent }),
    },
  });

  // Use saved data for Share functionality
  const savedTriggerEvent = ruleData?.triggerEvent;
  const savedGroups = ruleData?.groups;
  const savedChannels = ruleData?.whatsappSettingsPhoneIds;

  const hasKeywords = (savedGroups || []).some((g) =>
    g.conditions.some((c) => c.field === "MESSAGE_BODY" && c.value),
  );

  const savedPlatform = ruleData?.platform ?? "WHATSAPP";
  const showShareTab = savedTriggerEvent === "MESSAGE_RECEIVED" && hasKeywords;

  useEffect(() => {
    if (ruleData) {
      form.reset({
        ...defaultValues,
        ...ruleData,
        whatsappSettingsPhoneIds: ruleData.whatsappSettingsPhoneIds || [],
        groups: ruleData.groups || [],
        // The API models "no value" as `null`; the form schema models it as an empty value.
        actions: (ruleData.actions || []).map((action) =>
          action.value === null ? { ...action, value: "" } : action,
        ),
        options: ruleData.options || defaultValues.options,
      });
    }
  }, [ruleData, form]);

  const onSubmit = (data: CreateRuleValues) => {
    if (isEditMode) {
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

  if (isEditMode && isRuleLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="size-5 text-muted-foreground" />
      </div>
    );
  }

  let buttonText = "Create Automation";
  if (isPending) {
    buttonText = "Saving";
  } else if (isEditMode) {
    buttonText = "Update Automation";
  }

  return (
    <Tabs defaultValue="builder" className="max-w-4xl mx-auto relative h-full">
      <div className="flex items-center justify-between mb-6">
        <TabsList>
          <TabsTrigger value="builder">Builder</TabsTrigger>
          {showShareTab && <TabsTrigger value="share">Share</TabsTrigger>}
        </TabsList>
      </div>

      <TabsContent value="builder" className="mt-0">
        <RuleBuilderForm
          form={form}
          onSubmit={onSubmit}
          onCancel={() => history.back()}
          isPending={isPending}
          buttonText={buttonText}
        />
      </TabsContent>

      <TabsContent value="share">
        <RuleShare
          groups={savedGroups || []}
          channels={savedChannels || []}
          platform={savedPlatform}
        />
      </TabsContent>
    </Tabs>
  );
};

export default WhatsappAutomationRuleBuilder;
