import { type Control, Controller } from "react-hook-form";

import { Field, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";

import type { CustomLinkFormValues } from "./AddLinkModal.tsx";

function CustomLinkInputs({ control }: { control: Control<CustomLinkFormValues> }) {
  return (
    <>
      <Controller
        name="linkDisplayName"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Link Display name</FieldLabel>
            <Input
              {...field}
              id={field.name}
              placeholder="Enter Link Display Name"
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name="linkUrl"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Link Url</FieldLabel>
            <Input
              {...field}
              id={field.name}
              placeholder="Enter Url"
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    </>
  );
}

export default CustomLinkInputs;
