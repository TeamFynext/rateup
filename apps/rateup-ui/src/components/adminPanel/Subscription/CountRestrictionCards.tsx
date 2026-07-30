import type { Control, FieldPath } from "react-hook-form";
import { useController, useWatch } from "react-hook-form";

import { Input } from "@/components/ui/input.tsx";
import { getNestedProperty } from "@/utils/misc/obj.utils";

import type { SubscriptionFormValues } from "./SubscriptionEditorModal.tsx";

interface CountRestrictionCardsProps {
  featurePathName: string;
  control: Control<SubscriptionFormValues>;
}

function CountField({
  control,
  name,
  label,
}: Readonly<{
  control: Control<SubscriptionFormValues>;
  name: FieldPath<SubscriptionFormValues>;
  label: string;
}>) {
  const { field } = useController({ control, name });
  return (
    <div className="flex items-center gap-3 p-3">
      <div className="flex-1">
        <p>{label}</p>
      </div>
      <Input
        type="number"
        name={field.name}
        value={field.value ?? ""}
        onBlur={field.onBlur}
        onChange={(e) => field.onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function CountRestrictionCards({
  featurePathName,
  control,
}: Readonly<CountRestrictionCardsProps>) {
  const features = useWatch({ control, name: "features" });
  const feature = getNestedProperty<{ count: Partial<Record<"max" | "min", number>> }>(
    features,
    featurePathName,
  );
  return (
    <>
      {(Object.keys(feature.count) as Array<"max" | "min">).map((property) => (
        <CountField
          key={property}
          control={control}
          name={`features.${featurePathName}.count.${property}`}
          label={property}
        />
      ))}
    </>
  );
}
