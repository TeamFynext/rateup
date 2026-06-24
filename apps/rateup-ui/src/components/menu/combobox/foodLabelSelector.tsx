"use client";

import { Image } from "@unpic/react";
import { useTranslation } from "react-i18next";

import { Checkbox } from "../../ui/checkbox.tsx";
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
} from "../../ui/field.tsx";
import { menuLabelWithText } from "../util/menuLabelData.ts";

type FoodLabelFormAdapter = {
  values?: {
    foodLabels?: string[];
  };
  setFieldValue: (path: string, value: any) => void;
};

export function FoodLabelSelector({
  form,
}: {
  readonly form: FoodLabelFormAdapter;
}) {
  const { t: translations } = useTranslation();
  const selectedValues = form?.values?.foodLabels ?? [];

  const toggleValue = (label: string, checked: boolean) => {
    const next = checked
      ? [...selectedValues, label]
      : selectedValues.filter((value) => value !== label);
    form.setFieldValue("foodLabels", next);
  };

  return (
    <FieldGroup>
      <Field>
        <FieldLabel>{translations("Allergen Info")}</FieldLabel>
        <FieldContent>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {menuLabelWithText.map(({ image, label }) => {
              const checked = selectedValues.includes(label);
              return (
                <label
                  key={label}
                  className="flex items-center gap-2 rounded-md border px-2 py-1.5"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) =>
                      toggleValue(label, value === true)
                    }
                  />
                  <Image src={image} alt={label} width={15} height={15} />
                  <span className="text-sm">{label}</span>
                </label>
              );
            })}
          </div>
        </FieldContent>
      </Field>
    </FieldGroup>
  );
}
