import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@rateup/ui/components/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rateup/ui/components/select";
import { Switch } from "@rateup/ui/components/switch";
import React from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";

import { useGetAllBusinessHours } from "@/backend/org/business-hours/business-hours.query";

import type { CreateRuleInput } from "./schema.ts";

const RuleOptions: React.FC = () => {
  const { control } = useFormContext<CreateRuleInput>();
  const { data: businessHours } = useGetAllBusinessHours();

  const businessHoursEnabled = useWatch({
    control,
    name: "options.businessHours.enabled",
  });

  return (
    <div className="bg-card ring-foreground/10 divide-y rounded-xl ring-1">
      <Controller
        control={control}
        name="options.sendOncePerDay"
        render={({ field, fieldState }) => (
          <Field orientation="horizontal" data-invalid={fieldState.invalid} className="px-4 py-3">
            <FieldContent>
              <FieldLabel htmlFor="send-once-per-day">Run once a day per contact</FieldLabel>
              <FieldDescription className="text-xs">
                Skips anyone this automation already ran for in the last 24 hours.
              </FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </FieldContent>
            <Switch
              id="send-once-per-day"
              checked={Boolean(field.value)}
              onCheckedChange={(checked) => field.onChange(checked)}
              aria-invalid={fieldState.invalid}
            />
          </Field>
        )}
      />

      <Controller
        control={control}
        name="options.businessHours.enabled"
        render={({ field, fieldState }) => (
          <div className="flex flex-col gap-3 px-4 py-3">
            <Field orientation="horizontal" data-invalid={fieldState.invalid}>
              <FieldContent>
                <FieldLabel htmlFor="business-hours">Only during business hours</FieldLabel>
                <FieldDescription className="text-xs">
                  Outside the hours you pick, the automation does not run.
                </FieldDescription>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </FieldContent>
              <Switch
                id="business-hours"
                checked={Boolean(field.value)}
                onCheckedChange={(checked) => field.onChange(checked)}
                aria-invalid={fieldState.invalid}
              />
            </Field>

            {businessHoursEnabled && (
              <Controller
                control={control}
                name="options.businessHours.businessHoursId"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldTitle>Business hours</FieldTitle>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                      items={businessHours?.map((bh) => ({ value: bh.id, label: bh.name })) ?? []}
                    >
                      <SelectTrigger className="w-full" aria-invalid={fieldState.invalid}>
                        <SelectValue placeholder="Pick business hours" />
                      </SelectTrigger>
                      <SelectContent>
                        {businessHours?.map((bh) => (
                          <SelectItem key={bh.id} value={bh.id}>
                            {bh.name}
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
        )}
      />
    </div>
  );
};

export default RuleOptions;
