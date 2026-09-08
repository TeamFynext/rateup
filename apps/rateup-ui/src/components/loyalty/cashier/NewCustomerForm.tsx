import { zodResolver } from "@hookform/resolvers/zod";
import { IconArrowLeft } from "@tabler/icons-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { isValidPhoneNumber } from "react-phone-number-input";
import { z } from "zod";

import { useContactLookupByPhone } from "@/backend/loyalty/customer/customer.query";
import { Button } from "@/components/ui/button.tsx";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { PhoneInput } from "@/components/ui/phone-input.tsx";
import { useDebounce } from "@/hooks/use-debounce.ts";

const schema = z.object({
  name: z.string().trim().min(1, "Their name"),
  phone: z
    .string()
    .min(1, "Their phone number")
    .refine((value) => isValidPhoneNumber(value), "That does not look like a phone number"),
});
type NewCustomerValues = z.infer<typeof schema>;

interface NewCustomerFormProps {
  prefill: { phone?: string; name?: string };
  defaultCountry: string;
  signupBonus: number;
  pointsName: string;
  isSaving: boolean;
  programActive: boolean;
  onBack: () => void;
  onSubmit: (values: NewCustomerValues) => void;
  /** The number already belongs to a member — open them instead of registering twice. */
  onOpenExisting: (phone: string) => void;
}

/** Register on the spot: one screen, the join bonus is automatic, the welcome goes out. */
export function NewCustomerForm({
  prefill,
  defaultCountry,
  signupBonus,
  pointsName,
  isSaving,
  programActive,
  onBack,
  onSubmit,
  onOpenExisting,
}: Readonly<NewCustomerFormProps>) {
  const { t } = useTranslation();
  const form = useForm<NewCustomerValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: prefill.name ?? "",
      phone: prefill.phone
        ? prefill.phone.startsWith("+")
          ? prefill.phone
          : `+${prefill.phone.replace(/\D/g, "")}`
        : "",
    },
  });

  const phone = useDebounce(form.watch("phone"), 400);
  const lookupEnabled = Boolean(phone) && isValidPhoneNumber(phone);
  const { data: lookup } = useContactLookupByPhone(phone.replace(/\D/g, ""), lookupEnabled);

  // The org may already know the name from a WhatsApp conversation — save the typing.
  useEffect(() => {
    if (lookup?.contact?.name && !form.getValues("name")) {
      form.setValue("name", lookup.contact.name);
    }
  }, [lookup, form]);

  const alreadyMember = Boolean(lookup?.alreadyMember);

  return (
    <form className="flex flex-col gap-5" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="icon" onClick={onBack} aria-label={t("Back")}>
          <IconArrowLeft size={18} />
        </Button>
        <div>
          <h2 className="text-base font-semibold text-foreground">{t("New customer")}</h2>
          <p className="text-sm text-muted-foreground">
            {signupBonus > 0
              ? t("They get {bonus} {points} for joining and a WhatsApp welcome.", {
                  bonus: signupBonus,
                  points: pointsName,
                })
              : t("They get a WhatsApp welcome the moment they join.")}
          </p>
        </div>
      </div>

      {/* Two short fields — capped rather than stretched across the whole main column,
          which on a desktop counter is most of the page. On a staff phone the cap is
          wider than the viewport, so nothing changes there. */}
      <div className="flex max-w-sm flex-col gap-4">
        <Controller
          control={form.control}
          name="phone"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>{t("Phone number")}</FieldLabel>
              <PhoneInput
                id={field.name}
                defaultCountry={defaultCountry as never}
                value={field.value as never}
                onChange={field.onChange}
                aria-invalid={fieldState.invalid}
                autoFocus={!prefill.phone}
              />
              {alreadyMember && (
                <FieldDescription className="text-amber-700 dark:text-amber-500">
                  {t("This number is already a member.")}
                </FieldDescription>
              )}
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>{t("Name")}</FieldLabel>
              <Input id={field.name} autoFocus={Boolean(prefill.phone)} {...field} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {!programActive && (
          <p className="text-xs text-amber-700 dark:text-amber-500">
            {t(
              "The program is not live, so nobody can join yet. Activate or resume it in Settings.",
            )}
          </p>
        )}

        {alreadyMember ? (
          <Button
            type="button"
            className="h-12"
            onClick={() => onOpenExisting(phone.replace(/\D/g, ""))}
          >
            {t("Open {name}", { name: lookup?.contact?.name || t("this customer") })}
          </Button>
        ) : (
          <Button type="submit" className="h-12" disabled={isSaving || !programActive}>
            {isSaving
              ? t("Registering…")
              : signupBonus > 0
                ? t("Register and give {bonus} {points}", {
                    bonus: signupBonus,
                    points: pointsName,
                  })
                : t("Register")}
          </Button>
        )}
      </div>
    </form>
  );
}
