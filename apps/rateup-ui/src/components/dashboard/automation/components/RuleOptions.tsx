import React from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";

import { useGetAllBusinessHours } from "@/backend/org/business-hours/business-hours.query";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

import type { CreateRuleInput } from "./schema.ts";

const RuleOptions: React.FC = () => {
  const { control } = useFormContext<CreateRuleInput>();
  const { data: businessHours } = useGetAllBusinessHours();

  const businessHoursEnabled = useWatch({
    control,
    name: "options.businessHours.enabled",
  });

  return (
    <div className="space-y-2">
      {/* Send Only Once Per Day */}
      <Controller
        control={control}
        name="options.sendOncePerDay"
        render={({ field, fieldState }) => (
          <Field
            orientation="horizontal"
            data-invalid={fieldState.invalid}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
          >
            <Checkbox
              checked={field.value}
              onCheckedChange={field.onChange}
              id="send-once-per-day"
              aria-invalid={fieldState.invalid}
            />
            <div className="flex-1">
              <FieldLabel htmlFor="send-once-per-day" className="cursor-pointer font-medium">
                Send only once per day per contact
              </FieldLabel>
              <FieldDescription className="text-xs mt-0.5">
                Prevents duplicate messages to the same contact within 24 hours. (only available for
                chatbot action)
              </FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </div>
          </Field>
        )}
      />

      {/* Business Hours */}
      <Controller
        control={control}
        name="options.businessHours.enabled"
        render={({ field, fieldState }) => (
          <div className="space-y-3">
            <Field
              orientation="horizontal"
              data-invalid={fieldState.invalid}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
            >
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
                id="business-hours"
                aria-invalid={fieldState.invalid}
              />
              <div className="flex-1">
                <FieldLabel htmlFor="business-hours" className="cursor-pointer font-medium">
                  Only during business hours
                </FieldLabel>
                <FieldDescription className="text-xs mt-0.5">
                  Rule will only trigger during your configured business hours
                </FieldDescription>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </div>
            </Field>

            {businessHoursEnabled && (
              <div className="ml-9">
                <Controller
                  control={control}
                  name="options.businessHours.businessHoursId"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="text-xs font-semibold mb-2">
                        Select Business Hours
                      </FieldLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <SelectTrigger aria-invalid={fieldState.invalid}>
                          <SelectValue placeholder="Select business hours" />
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
              </div>
            )}
          </div>
        )}
      />
    </div>
  );
};

export default RuleOptions;
