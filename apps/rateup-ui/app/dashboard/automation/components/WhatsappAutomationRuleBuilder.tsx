import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import {
  useCreateRuleMutation,
  useRuleById,
  useUpdateRuleMutation,
} from "@/backend/whatsapp/rule/rule.query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import RuleBuilderForm from "./RuleBuilderForm";
import RuleShare from "./RuleShare";
import { CreateRuleInput, createRuleSchema } from "./schema";

interface WhatsappAutomationRuleBuilderProps {
  ruleId?: string;
}

const defaultValues: Partial<CreateRuleInput> = {
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
  },
};

const WhatsappAutomationRuleBuilder: React.FC<
  WhatsappAutomationRuleBuilderProps
> = ({ ruleId }) => {
  const isEditMode = ruleId && ruleId !== "new";
  const { data: ruleData, isLoading: isRuleLoading } = useRuleById(
    isEditMode ? ruleId : "",
  );
  const router = useRouter();
  const createMutation = useCreateRuleMutation();
  const updateMutation = useUpdateRuleMutation();

  const form = useForm<CreateRuleInput>({
    resolver: zodResolver(createRuleSchema),
    defaultValues,
  });

  // Use saved data for Share functionality
  const savedTriggerEvent = ruleData?.triggerEvent;
  const savedGroups = ruleData?.groups;
  const savedChannels = ruleData?.whatsappSettingsPhoneIds;

  const hasKeywords = (savedGroups || []).some((g) =>
    g.conditions.some((c) => c.field === "MESSAGE_BODY" && c.value),
  );

  const showShareTab = savedTriggerEvent === "MESSAGE_RECEIVED" && hasKeywords;

  useEffect(() => {
    if (ruleData) {
      form.reset({
        ...defaultValues,
        ...ruleData,
        whatsappSettingsPhoneIds: ruleData.whatsappSettingsPhoneIds || [],
        groups: ruleData.groups || [],
        actions: (ruleData.actions as CreateRuleInput["actions"]) || [],
        options: ruleData.options || defaultValues.options,
      });
    }
  }, [ruleData, form]);

  const onSubmit = (data: CreateRuleInput) => {
    if (isEditMode) {
      updateMutation.mutate(
        { id: ruleId, ...(data as any) },
        {
          onSuccess: () => {
            router.push(`/dashboard/automation`);
          },
        },
      );
    } else {
      createMutation.mutate(data as any, {
        onSuccess: (data) => {
          router.replace(`/dashboard/automation/${data?.id}`);
        },
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isEditMode && isRuleLoading) {
    return <div>Loading...</div>;
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
          onCancel={() => router.back()}
          isPending={isPending}
          buttonText={buttonText}
        />
      </TabsContent>

      <TabsContent value="share">
        <RuleShare groups={savedGroups || []} channels={savedChannels || []} />
      </TabsContent>
    </Tabs>
  );
};

export default WhatsappAutomationRuleBuilder;
