import { Button } from "@rateup/ui/components/button";
import { Input } from "@rateup/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rateup/ui/components/select";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import React from "react";
import type { ControllerRenderProps, FieldArrayPath, FieldPath } from "react-hook-form";
import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";

import { useContactGroup } from "@/backend/campaign/contactGroup/contactGroup.query";
import { useContactLabels } from "@/backend/campaign/contacts/contacts.query";
import type { GetLabelsRes } from "@/backend/lifecycle/lifecycle.types";
import { useGetAllBusinessHours } from "@/backend/org/business-hours/business-hours.query";
import { StageSelector } from "@/components/pipeline/shared/StageSelector.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Field, FieldError } from "@/components/ui/field.tsx";
import { useLifecycleContext } from "@/context/LifecycleContext.ts";

import { MatchSentence } from "./MatchSentence.tsx";
import type { ConditionField, CreateRuleInput } from "./schema.ts";
import { CONDITION_OPERATORS, getConditionFields } from "./schema.ts";

interface ConditionListProps {
  name: string;
  groupOperator: "AND" | "OR";
  onOperatorChange: (operator: "AND" | "OR") => void;
  allowedFields?: string[];
}

/**
 * Condition rows are addressed by a runtime path (`groups.0.conditions.1.value`)
 * that react-hook-form's `Path<CreateRuleInput>` cannot express literally.
 */
const fieldPath = (path: string) => path as FieldPath<CreateRuleInput>;

/** Same, for the array paths `useFieldArray` accepts. */
const arrayPath = (path: string) => path as FieldArrayPath<CreateRuleInput>;

const ConditionValueInput = ({
  index,
  valueField,
  namePrefix,
}: {
  index: number;
  /** The react-hook-form field bindings for this condition's value. */
  valueField: ControllerRenderProps<CreateRuleInput, FieldPath<CreateRuleInput>>;
  namePrefix: string;
}) => {
  const { control } = useFormContext<CreateRuleInput>();
  const { data: businessHours } = useGetAllBusinessHours();
  const { data: contactGroups } = useContactGroup();
  const lifecycles = useLifecycleContext();
  const { data: labels } = useContactLabels();

  const fieldType = useWatch({
    control,
    name: fieldPath(`${namePrefix}.${index}.field`),
  }) as ConditionField;

  // A condition's value is always a single string; the field bindings carry the
  // union of every value type on the form.
  const value = typeof valueField.value === "string" ? valueField.value : "";

  if (fieldType === "CONTACT_GROUP") {
    return (
      <Select
        onValueChange={valueField.onChange}
        value={value}
        items={contactGroups?.map((g) => ({ value: g.id, label: g.name })) ?? []}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select audience" />
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
        value={value}
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
        value={value}
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
  // The board column the contact's lead sits in — the successor to
  // CONTACT_LIFECYCLE above. `StageSelector` renders nothing without a board, so
  // the field is only offered where there is one to pick from.
  if (fieldType === "CONTACT_STAGE") {
    return (
      <StageSelector
        value={value ?? ""}
        onChange={valueField.onChange}
        placeholder="Select stage"
        className="w-full"
      />
    );
  }
  if (fieldType === "BUSINESS_HOURS") {
    return (
      <Select
        onValueChange={valueField.onChange}
        value={value}
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
        value={value}
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

  // "*" is the API's wildcard: the rule answers every message.
  if (fieldType === "MESSAGE_BODY") {
    const everyMessage = valueField.value === "*";
    return (
      <div className="flex flex-col gap-2">
        {!everyMessage && (
          <Input
            placeholder="Type a word or phrase, e.g. refund"
            value={value}
            onChange={valueField.onChange}
            onBlur={valueField.onBlur}
            ref={valueField.ref}
            className="bg-background h-10 w-full"
          />
        )}
        <label className="text-muted-foreground flex w-fit cursor-pointer items-center gap-2 text-[13px]">
          <Checkbox
            checked={everyMessage}
            onCheckedChange={(checked) => valueField.onChange(checked ? "*" : "")}
          />
          Reply to every message
        </label>
      </div>
    );
  }

  return (
    <Input
      placeholder="Value"
      name={valueField.name}
      value={value}
      onChange={valueField.onChange}
      onBlur={valueField.onBlur}
      ref={valueField.ref}
    />
  );
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
    name: fieldPath(`${namePrefix}.${index}.field`),
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
    <div className="bg-card ring-foreground/10 flex flex-col gap-2.5 rounded-xl p-3 ring-1">
      <div className="flex items-center gap-2">
        <Controller
          control={control}
          name={fieldPath(`${namePrefix}.${index}.field`)}
          render={({ field, fieldState }) => {
            const fields = getConditionFields(field.value as string).filter(
              (opt) => !allowedFields || allowedFields.includes(opt.value),
            );
            return (
              <Field className="min-w-0 flex-1 sm:max-w-56" data-invalid={fieldState.invalid}>
                <Select
                  onValueChange={(val) => {
                    field.onChange(val);
                    setValue(fieldPath(`${namePrefix}.${index}.value`), "");
                    if (val !== "MESSAGE_BODY" && val !== "CONTACT_EMAIL") {
                      setValue(fieldPath(`${namePrefix}.${index}.operator`), "EQUALS");
                    }
                  }}
                  value={field.value as string}
                  items={fields}
                >
                  <SelectTrigger className="w-full" aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder="Field" />
                  </SelectTrigger>
                  <SelectContent>
                    {fields.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            );
          }}
        />

        {shouldShowOperator && (
          <Controller
            control={control}
            name={fieldPath(`${namePrefix}.${index}.operator`)}
            render={({ field, fieldState }) => (
              <Field className="w-36 shrink-0" data-invalid={fieldState.invalid}>
                <Select
                  onValueChange={field.onChange}
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

        <Button
          aria-label="Delete condition"
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => remove(index)}
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 ml-auto shrink-0"
        >
          <IconTrash className="size-4" />
        </Button>
      </div>

      <Controller
        control={control}
        name={fieldPath(`${namePrefix}.${index}.value`)}
        render={({ field: valueField, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <ConditionValueInput index={index} valueField={valueField} namePrefix={namePrefix} />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
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
    name: arrayPath(name),
  });

  // Helper to get nested error
  const getError = (path: string): { message?: string } | undefined => {
    let result: unknown = errors;
    for (const key of path.split(".")) {
      if (typeof result !== "object" || result === null) return undefined;
      result = (result as Record<string, unknown>)[key];
    }
    return result as { message?: string } | undefined;
  };

  const listError = getError(name);

  return (
    <div className="space-y-3">
      {fields.length > 1 && (
        <MatchSentence value={groupOperator} onChange={onOperatorChange} noun="conditions" />
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
        size="sm"
        onClick={() => {
          const defaultField =
            getConditionFields().length > 0 ? getConditionFields()[0].value : "CONTACT_EMAIL";
          append({
            field: defaultField,
            operator: "CONTAINS",
            value: "",
          });
        }}
      >
        <IconPlus className="w-4 h-4 mr-2" /> Add condition
      </Button>

      {listError?.message && (
        <p className="text-sm font-medium text-destructive mt-2">{listError.message}</p>
      )}
    </div>
  );
};

export default ConditionList;
