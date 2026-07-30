import { PlusIcon, Trash2Icon } from "lucide-react";
import React from "react";
import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";

import { useContactGroup } from "@/backend/campaign/contactGroup/contactGroup.query";
import { useContactLabels } from "@/backend/campaign/contacts/contacts.query";
import type { GetLabelsRes } from "@/backend/lifecycle/lifecycle.types";
import { useGetAllBusinessHours } from "@/backend/org/business-hours/business-hours.query";
import { Button } from "@/components/ui/button.tsx";
import { Field, FieldError } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { useLifecycleContext } from "@/context/LifecycleContext.ts";

import type { ConditionField, CreateRuleInput } from "./schema.ts";
import { CONDITION_FIELDS, CONDITION_OPERATORS } from "./schema.ts";

interface ConditionListProps {
  name: string;
  groupOperator: "AND" | "OR";
  onOperatorChange: (operator: "AND" | "OR") => void;
  allowedFields?: string[];
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
  const { data: businessHours } = useGetAllBusinessHours();
  const { data: contactGroups } = useContactGroup();
  const lifecycles = useLifecycleContext();
  const { data: labels } = useContactLabels();

  const fieldType = useWatch({
    control,
    name: `${namePrefix}.${index}.field` as any,
  }) as ConditionField;

  if (fieldType === "CONTACT_GROUP") {
    return (
      <Select
        onValueChange={valueField.onChange}
        value={valueField.value}
        items={contactGroups?.map((g) => ({ value: g.id, label: g.name })) ?? []}
      >
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
      <Select
        onValueChange={valueField.onChange}
        value={valueField.value}
        items={
          labels?.map((l: { id: string; name: string }) => ({ value: l?.id, label: l?.name })) ?? []
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="Select label" />
        </SelectTrigger>
        <SelectContent>
          {labels?.map((l: { id: string; name: string }) => (
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
      <Select
        onValueChange={valueField.onChange}
        value={valueField.value}
        items={lifecycles?.map((l: GetLabelsRes) => ({
          value: l?.id,
          label: `${l?.emoji ?? ""} ${l?.name ?? ""}`,
        }))}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select lifecycle" />
        </SelectTrigger>
        <SelectContent>
          {lifecycles?.map((l: GetLabelsRes) => (
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
      <Select
        onValueChange={valueField.onChange}
        value={valueField.value}
        items={businessHours?.map((opt) => ({ value: opt.id, label: opt.name })) ?? []}
      >
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
      <Select
        onValueChange={valueField.onChange}
        value={valueField.value}
        items={[
          { value: "true", label: "Enabled" },
          { value: "false", label: "Disabled" },
        ]}
      >
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
    // Determine select value
    let selectValue = "custom";
    if (valueField.value === "*") {
      selectValue = "*";
    } else if (valueField.value === "lead") {
      selectValue = "lead";
    }

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
          value={selectValue}
          items={[
            { value: "*", label: "All Messages" },
            { value: "custom", label: "Custom keyword" },
          ]}
        >
          <SelectTrigger className="w-full bg-background">
            <SelectValue placeholder="Select or enter keyword" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="*">All Messages</SelectItem>
            <SelectItem value="custom">Custom keyword</SelectItem>
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
  allowedFields,
}: {
  index: number;
  remove: (index: number) => void;
  namePrefix: string;
  allowedFields?: string[];
}) => {
  const { control, setValue } = useFormContext<CreateRuleInput>();

  const fieldType = useWatch({
    control,
    name: `${namePrefix}.${index}.field` as any,
  });

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
    <div className="flex gap-3 items-center p-4 bg-white dark:bg-card rounded-lg border border-border">
      <Controller
        control={control}
        name={`${namePrefix}.${index}.field` as any}
        render={({ field, fieldState }) => (
          <Field className="flex-1" data-invalid={fieldState.invalid}>
            <Select
              onValueChange={(val) => {
                field.onChange(val);
                setValue(`${namePrefix}.${index}.value` as any, "");
                if (val !== "MESSAGE_BODY" && val !== "CONTACT_EMAIL") {
                  setValue(`${namePrefix}.${index}.operator` as any, "EQUALS");
                }
              }}
              defaultValue={field.value as string}
              value={field.value as string}
              items={
                allowedFields
                  ? CONDITION_FIELDS.filter((opt) => allowedFields.includes(opt.value))
                  : CONDITION_FIELDS
              }
            >
              <SelectTrigger className="w-full" aria-invalid={fieldState.invalid}>
                <SelectValue placeholder="Field" />
              </SelectTrigger>
              <SelectContent>
                {(allowedFields
                  ? CONDITION_FIELDS.filter((opt) => allowedFields.includes(opt.value))
                  : CONDITION_FIELDS
                ).map((opt) => (
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

      {shouldShowOperator && (
        <Controller
          control={control}
          name={`${namePrefix}.${index}.operator` as any}
          render={({ field, fieldState }) => (
            <Field className="w-[140px]" data-invalid={fieldState.invalid}>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value as string}
                value={field.value as string}
                items={availableOperators}
              >
                <SelectTrigger className="w-full" aria-invalid={fieldState.invalid}>
                  <SelectValue placeholder="Operator" />
                </SelectTrigger>
                <SelectContent>
                  {availableOperators.map((opt) => (
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

      <div className="flex-1">
        <Controller
          control={control}
          name={`${namePrefix}.${index}.value` as any}
          render={({ field: valueField, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <div className="w-full">
                <ConditionValueInput
                  index={index}
                  valueField={valueField}
                  namePrefix={namePrefix}
                />
              </div>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => remove(index)}
        title="Delete Condition"
        className="text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 h-10 w-10"
      >
        <Trash2Icon className="w-4 h-4" />
      </Button>
    </div>
  );
};

const ConditionList: React.FC<ConditionListProps> = ({
  name,
  groupOperator,
  onOperatorChange,
  allowedFields,
}) => {
  const {
    control,
    formState: { errors },
  } = useFormContext<CreateRuleInput>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: name as any,
  });

  // Helper to get nested error
  const getError = (path: string) => {
    const keys = path.split(".");
    let result: any = errors;
    for (const key of keys) {
      result = result?.[key];
    }
    return result;
  };

  const listError = getError(name);

  return (
    <div className="space-y-3">
      {/* Match all/any toggle for this condition block */}
      {fields.length > 1 && (
        <Tabs
          defaultValue="AND"
          value={groupOperator}
          onValueChange={(e) => {
            onOperatorChange(e as "AND" | "OR");
          }}
        >
          <TabsList>
            <TabsTrigger value="AND">Match all</TabsTrigger>
            <TabsTrigger value="OR">Match any</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Condition Rows */}
      {fields.map((field, index) => (
        <ConditionRow
          key={field.id}
          index={index}
          remove={remove}
          namePrefix={name}
          allowedFields={allowedFields}
        />
      ))}

      <Button
        type="button"
        variant="outline"
        className="w-full border-2 border-dashed border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-900/30"
        onClick={() => {
          const defaultField =
            CONDITION_FIELDS.length > 0 ? CONDITION_FIELDS[0].value : "CONTACT_EMAIL";
          append({
            field: defaultField as any,
            operator: "CONTAINS",
            value: "",
          });
        }}
      >
        <PlusIcon className="w-4 h-4 mr-2" /> Add condition
      </Button>

      {listError?.message && (
        <p className="text-sm font-medium text-destructive mt-2">{listError.message}</p>
      )}
    </div>
  );
};

export default ConditionList;
