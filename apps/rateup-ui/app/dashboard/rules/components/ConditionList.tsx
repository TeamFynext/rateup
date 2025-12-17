import React from "react";

import { PlusIcon, Trash2Icon, TrashIcon } from "lucide-react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";

import { SubscriptionFeaturePathName } from "@/types/enums";
import { useContactGroup } from "@/backend/campaign/contactGroup/contactGroup.query";
import { useContactLabels } from "@/backend/campaign/contacts/contacts.query";
import { useGetAllBusinessHours } from "@/backend/org/business-hours/business-hours.query";
import { useSubscription } from "@/backend/subscription/subscription.query";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
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
import { useLifecycleContext } from "@/context/LifecycleContext";
import { hasFeature } from "@/utils/subscription/subscription";

import {
  CONDITION_FIELDS,
  CONDITION_OPERATORS,
  ConditionField,
  CreateRuleInput,
  getAvailableConditionFields,
} from "./schema";

interface ConditionListProps {
  name: string;
}

const ConditionValueInput = ({
  index,
  valueField,
  namePrefix,
}: {
  index: number;
  valueField: any;
  namePrefix: string;
}) => {
  const { control } = useFormContext<CreateRuleInput>();
  const { data: businessHours, isPending } = useGetAllBusinessHours();
  const { data: contactGroups } = useContactGroup();
  const lifecycles = useLifecycleContext();
  const { data: labels } = useContactLabels();
  const { data: subscription } = useSubscription();

  const fieldType = useWatch({
    control,
    name: `${namePrefix}.${index}.field` as any,
  }) as ConditionField;

  if (fieldType === "CONTACT_GROUP") {
    return (
      <Select onValueChange={valueField.onChange} value={valueField.value}>
        <SelectTrigger>
          <SelectValue placeholder="Select group" />
        </SelectTrigger>
        <SelectContent>
          {contactGroups?.map((g) => (
            <SelectItem key={g.id} value={g.id}>
              {g.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  if (fieldType === "CONTACT_LABEL") {
    return (
      <Select onValueChange={valueField.onChange} value={valueField.value}>
        <SelectTrigger>
          <SelectValue placeholder="Select label" />
        </SelectTrigger>
        <SelectContent>
          {labels?.map((l) => (
            <SelectItem key={l?.id} value={l?.id}>
              {l?.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  if (fieldType === "CONTACT_LIFECYCLE") {
    return (
      <Select onValueChange={valueField.onChange} value={valueField.value}>
        <SelectTrigger>
          <SelectValue placeholder="Select lifecycle" />
        </SelectTrigger>
        <SelectContent>
          {lifecycles.map((l) => (
            <SelectItem key={l?.id} value={l?.id}>
              {l?.emoji} {l?.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  if (fieldType === "BUSINESS_HOURS") {
    return (
      <Select onValueChange={valueField.onChange} value={valueField.value}>
        <SelectTrigger>
          <SelectValue placeholder="Business Hours" />
        </SelectTrigger>
        <SelectContent>
          {businessHours?.map((opt) => (
            <SelectItem key={opt.id} value={opt.id}>
              {opt.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (fieldType === "SEND_ONCE_PER_24H") {
    return (
      <Select onValueChange={valueField.onChange} value={valueField.value}>
        <SelectTrigger>
          <SelectValue placeholder="Enable" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">Enabled</SelectItem>
          <SelectItem value="false">Disabled</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  // For MESSAGE_BODY, provide option for wildcard (*) or custom keyword
  if (fieldType === "MESSAGE_BODY") {
    return (
      <div className="flex  gap-4 space-y-1">
        <Select
          onValueChange={(val) => {
            if (val === "custom") {
              valueField.onChange("");
            } else {
              valueField.onChange(val);
            }
          }}
          value={
            valueField.value === "*"
              ? "*"
              : valueField.value === "lead"
                ? "lead"
                : "custom"
          }
        >
          <SelectTrigger className="w-full bg-background">
            <SelectValue placeholder="Select or enter keyword" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="*">All Messages</SelectItem>
            <SelectItem value="custom">Custom keyword</SelectItem>
            <SelectItem
              value="lead"
              disabled={
                !subscription ||
                !hasFeature(
                  subscription,
                  SubscriptionFeaturePathName.LeadAdAutomation,
                )
              }
            >
              Lead (pro)
            </SelectItem>
          </SelectContent>
        </Select>
        {valueField.value !== "*" && valueField.value !== "lead" && (
          <Input
            placeholder="Enter keyword"
            value={valueField.value}
            onChange={valueField.onChange}
            className="w-full bg-background"
          />
        )}
      </div>
    );
  }

  return <Input placeholder="Value" {...valueField} />;
};

const ConditionRow = ({
  index,
  remove,
  namePrefix,
}: {
  index: number;
  remove: (index: number) => void;
  namePrefix: string;
}) => {
  const { control, setValue } = useFormContext<CreateRuleInput>();

  const triggerEvent = useWatch({
    control,
    name: "triggerEvent",
  });

  const fieldType = useWatch({
    control,
    name: `${namePrefix}.${index}.field` as any,
  });

  const availableConditionFields = React.useMemo(() => {
    return getAvailableConditionFields(triggerEvent || "MESSAGE_RECEIVED");
  }, [triggerEvent]);

  const availableOperators = React.useMemo(() => {
    if (fieldType === "MESSAGE_BODY" || fieldType === "CONTACT_EMAIL") {
      return CONDITION_OPERATORS;
    }
    return [{ label: "Equals", value: "EQUALS" }];
  }, [fieldType]);

  const shouldShowOperator = React.useMemo(() => {
    return fieldType !== "SEND_ONCE_PER_24H";
  }, [fieldType]);

  return (
    <div className="flex gap-3 items-center">
      <FormField
        control={control}
        name={`${namePrefix}.${index}.field` as any}
        render={({ field }) => (
          <FormItem className="flex-1">
            <Select
              onValueChange={(val) => {
                field.onChange(val);
                setValue(`${namePrefix}.${index}.value` as any, "");
                if (val !== "MESSAGE_BODY" && val !== "CONTACT_EMAIL") {
                  setValue(`${namePrefix}.${index}.operator` as any, "EQUALS");
                }
              }}
              defaultValue={field.value}
              value={field.value}
            >
              <FormControl>
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Field" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {availableConditionFields.map((opt) => (
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

      {shouldShowOperator && (
        <FormField
          control={control}
          name={`${namePrefix}.${index}.operator` as any}
          render={({ field }) => (
            <FormItem>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Operator" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableOperators.map((opt) => (
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
      )}

      <div className="flex-1">
        <FormField
          control={control}
          name={`${namePrefix}.${index}.value` as any}
          render={({ field: valueField }) => (
            <FormItem>
              <FormControl>
                <div className="w-full">
                  <ConditionValueInput
                    index={index}
                    valueField={valueField}
                    namePrefix={namePrefix}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => remove(index)}
        title="Delete Condition"
        className="text-gray-400 hover:text-red-500 h-10 w-10"
      >
        <Trash2Icon className="w-4 h-4" />
      </Button>
    </div>
  );
};

const ConditionList: React.FC<ConditionListProps> = ({ name }) => {
  const {
    control,
    formState: { errors },
  } = useFormContext<CreateRuleInput>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: name as any,
  });

  const triggerEvent = useWatch({
    control,
    name: "triggerEvent",
  });

  // Helper to get nested error
  const getError = (path: string) => {
    return path.split(".").reduce((obj, key) => obj && obj[key], errors as any);
  };

  const listError = getError(name);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="bg-blue-600 text-white px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide">
          Conditions
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            const availableFields = getAvailableConditionFields(
              triggerEvent || "MESSAGE_RECEIVED",
            );
            const defaultField =
              availableFields.length > 0
                ? availableFields[0].value
                : "CONTACT_EMAIL";
            append({
              field: defaultField as any,
              operator: "CONTAINS",
              value: "",
            });
          }}
          className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium"
        >
          <PlusIcon className="w-4 h-4" /> Add
        </Button>
      </div>

      <div className="space-y-3 p-1">
        {fields.length === 0 && (
          <div className="text-gray-400 text-sm italic p-2">
            No conditions added.
          </div>
        )}
        {fields.map((field, index) => (
          <ConditionRow
            key={field.id}
            index={index}
            remove={remove}
            namePrefix={name}
          />
        ))}
      </div>
      {listError?.message && (
        <p className="text-sm font-medium text-destructive mt-2">
          {listError.message}
        </p>
      )}
    </div>
  );
};

export default ConditionList;
