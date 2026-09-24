import { zodResolver } from "@hookform/resolvers/zod";
import { type UseFormReturn, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";

interface LinkValues {
  linkDisplayName: string;
  linkUrl: string;
}

export function useCustomLinkForm(defaultValues: LinkValues) {
  const { t } = useTranslation();
  const schema = z.object({
    linkDisplayName: z.string().trim().min(1, t("Say what the button is for.")),
    linkUrl: z
      .string()
      .trim()
      .pipe(z.url(t("Enter a full link starting with https://"))),
  });
  return useForm<LinkValues>({ resolver: zodResolver(schema), defaultValues });
}

export function CustomLinkFields({ form }: Readonly<{ form: UseFormReturn<LinkValues> }>) {
  const { t } = useTranslation();
  const { errors } = form.formState;

  return (
    <FieldGroup>
      <Field data-invalid={!!errors.linkDisplayName}>
        <FieldLabel htmlFor="link-name">{t("Button text")}</FieldLabel>
        <Input
          id="link-name"
          autoFocus
          placeholder={t("See our menu")}
          aria-invalid={!!errors.linkDisplayName}
          {...form.register("linkDisplayName")}
        />
        <FieldError errors={[errors.linkDisplayName]} />
      </Field>
      <Field data-invalid={!!errors.linkUrl}>
        <FieldLabel htmlFor="link-url">{t("Web address")}</FieldLabel>
        <Input
          id="link-url"
          type="url"
          inputMode="url"
          placeholder="https://"
          aria-invalid={!!errors.linkUrl}
          {...form.register("linkUrl")}
        />
        <FieldError errors={[errors.linkUrl]} />
      </Field>
    </FieldGroup>
  );
}
