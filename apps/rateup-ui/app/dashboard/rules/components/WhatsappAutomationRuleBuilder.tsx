import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon, Save, Trash2Icon } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";

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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import ActionList from "./ActionList";
import ConditionList from "./ConditionList";
import {
  CreateRuleInput,
  createRuleSchema,
  GROUP_OPERATORS,
  TRIGGER_EVENTS,
} from "./schema";

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
      });
    }
  }, [ruleData, form]);

  const onSubmit = (data: CreateRule) => {
    if (isEditMode) {
      updateMutation.mutate({ id: ruleId, ...data });
    } else {
      createMutation.mutate(data, {
        onSuccess: (data) => {
          router.replace(`/dashboard/rules/${data?.id}`);
        },
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isEditMode && isRuleLoading) {
    return <div>Loading...</div>;
  }

  let buttonText = "Create Rule";
  if (isPending) {
    buttonText = "Saving...";
  } else if (isEditMode) {
    buttonText = "Update Rule";
  }

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-6">
      <Card>
        <CardContent className="space-y-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Trigger & Rule Info */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-6 bg-primary  rounded-full"></div>
                    <h2 className="font-semibold text-lg">
                      Trigger & Rule Info
                    </h2>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-blue-600 bg-blue-50 hover:bg-blue-100"
                  >
                    <span className="mr-2">✨</span> Auto-Configuration
                  </Button>
                </div>

                <Card className="bg-secondary/10 p-4">
                  <FormField
                    control={form.control}
                    name="whatsappSettingsPhoneIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase tracking-wider">
                          Channel
                        </FormLabel>
                        <FormControl>
                          <AccountSelector
                            multiple
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase tracking-wider">
                            Rule Name
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Rule name"
                              {...field}
                              className="bg-background"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="triggerEvent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase tracking-wider">
                            Trigger Event
                          </FormLabel>
                          <Select
                            key={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              // Clear or reset groups when trigger changes
                              const currentGroups = form.getValues("groups");
                              if (value !== "MESSAGE_RECEIVED") {
                                // Clear groups for non-MESSAGE_RECEIVED triggers
                                form.setValue("groups", []);
                              } else if (currentGroups.length === 0) {
                                // Add default group for MESSAGE_RECEIVED if empty
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
                            <FormControl>
                              <SelectTrigger className="bg-white border-gray-200 w-full">
                                <SelectValue placeholder="Select event" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {TRIGGER_EVENTS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="operator"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase tracking-wider">
                            Rule Operator
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="bg-white border-gray-200 w-full">
                                <SelectValue placeholder="Select operator" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {GROUP_OPERATORS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </Card>
              </div>

              {/* Condition Groups */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-6 bg-primary rounded-full"></div>
                    <h3 className="font-semibold text-lg ">
                      Condition Groups
                      {form.watch("triggerEvent") !== "MESSAGE_RECEIVED" && (
                        <span className="text-sm text-gray-500 ml-2">
                          (Optional)
                        </span>
                      )}
                    </h3>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium"
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
                    <PlusIcon className="w-4 h-4 mr-2" /> Add Group
                  </Button>
                </div>

                {groupFields.map((group, index) => (
                  <Card key={group.id} className="bg-secondary/10 p-4 gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm font-medium text-gray-600 border border-gray-200">
                          Group {index + 1}
                        </div>
                        <FormField
                          control={form.control}
                          name={`groups.${index}.operator`}
                          render={({ field }) => (
                            <FormItem className="space-y-0">
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-9  bg-white border-gray-200">
                                    <SelectValue placeholder="Operator" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {GROUP_OPERATORS.map((opt) => (
                                    <SelectItem
                                      key={opt.value}
                                      value={opt.value}
                                    >
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeGroup(index)}
                        disabled={
                          form.watch("triggerEvent") === "MESSAGE_RECEIVED" &&
                          groupFields.length === 1
                        }
                        className="text-gray-400 hover:text-red-500 hover:bg-red-50"
                      >
                        <Trash2Icon className="w-4 h-4" />
                      </Button>
                    </div>

                    <ConditionList name={`groups.${index}.conditions`} />
                  </Card>
                ))}
              </div>

              <FormField
                control={form.control}
                name="actions"
                render={() => (
                  <FormItem>
                    <FormControl>
                      <ActionList />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-4">
                <Separator className="my-4" />
                <Button
                  variant="default"
                  className="w-full h-12 text-lg font-medium"
                  type="submit"
                  disabled={isPending}
                >
                  <Save /> {buttonText}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsappAutomationRuleBuilder;
