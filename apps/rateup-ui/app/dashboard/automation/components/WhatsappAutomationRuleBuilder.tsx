import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle,
  ClipboardList,
  PlusIcon,
  Save,
  Settings,
  Trash2Icon,
  Zap,
} from "lucide-react";
import { Controller, useFieldArray, useForm } from "react-hook-form";

import { CreateRule } from "@/types/rule";
import {
  useCreateRuleMutation,
  useRuleById,
  useUpdateRuleMutation,
} from "@/backend/whatsapp/rule/rule.query";
import { AccountSelector } from "@/components/input/AccountSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import ActionList from "./ActionList";
import ConditionList from "./ConditionList";
import RuleOptions from "./RuleOptions";
import { CreateRuleInput, createRuleSchema, TRIGGER_EVENTS } from "./schema";

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

  const {
    fields: groupFields,
    append: appendGroup,
    remove: removeGroup,
  } = useFieldArray({
    control: form.control,
    name: "groups",
  });

  useEffect(() => {
    if (ruleData) {
      form.reset({
        ...defaultValues,
        ...ruleData,
        whatsappSettingsPhoneIds: ruleData.whatsappSettingsPhoneIds || [],
        groups: ruleData.groups || [],
        actions: ruleData.actions || [],
        options: ruleData.options || defaultValues.options,
      });
    }
  }, [ruleData, form]);

  const onSubmit = (data: CreateRule) => {
    if (isEditMode) {
      updateMutation.mutate({ id: ruleId, ...data });
    } else {
      createMutation.mutate(data, {
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
    buttonText = "Saving...";
  } else if (isEditMode) {
    buttonText = "Update Automation";
  }

  return (
    <div className="max-w-4xl mx-auto  relative h-full">
      {/* Header Card */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information Card */}
          <Card>
            <CardContent>
              <h2 className="text-lg font-semibold mb-4">Basic Information</h2>

              <FieldGroup>
                <Controller
                  control={form.control}
                  name="whatsappSettingsPhoneIds"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Channel</FieldLabel>
                      <AccountSelector
                        multiple
                        value={field.value}
                        onChange={field.onChange}
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
          <Card>
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
                        {TRIGGER_EVENTS.map((opt) => (
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
            </CardContent>
          </Card>

          {/* IF Card - Condition Groups */}
          <Card>
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
                      form.setValue("operator", e as "AND" | "OR");
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
                {groupFields.map((group, groupIndex) => (
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
                            form.watch("triggerEvent") === "MESSAGE_RECEIVED" &&
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
                      />
                    </div>
                  </React.Fragment>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-2 border-dashed border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/20 hover:bg-purple-100 dark:hover:bg-purple-900/30"
                  onClick={() => {
                    const triggerEvent = form.getValues("triggerEvent");
                    const defaultField =
                      triggerEvent === "MESSAGE_RECEIVED"
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
              </div>
            </CardContent>
          </Card>

          {/* THEN Card - Actions */}
          <Card>
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
          <Card>
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
          <Card>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Rule will be active immediately after saving
                </p>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="min-w-[140px]"
                  >
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
    </div>
  );
};

export default WhatsappAutomationRuleBuilder;
