import { zodResolver } from "@hookform/resolvers/zod";
import { IconArrowLeft } from "@tabler/icons-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { isValidPhoneNumber } from "react-phone-number-input";
import { z } from "zod";

import { LOYALTY_GENDERS, type LoyaltyGender } from "@/backend/loyalty/customer/customer.api";
import { useContactLookupByPhone } from "@/backend/loyalty/customer/customer.query";
import { Button } from "@/components/ui/button.tsx";
import { DatePicker } from "@/components/ui/date-picker.tsx";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { PhoneInput } from "@/components/ui/phone-input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { useDebounce } from "@/hooks/use-debounce.ts";

const schema = z.object({
  name: z.string().trim().min(1, "Their name"),
  phone: z
    .string()
    .min(1, "Their phone number")
    .refine((value) => isValidPhoneNumber(value), "That does not look like a phone number"),
  // Both optional: plenty of people would rather not say, and the counter should not stall.
  dob: z.date().optional(),
  gender: z.enum(LOYALTY_GENDERS).optional(),
  /** A friend's referral code; the referrer is paid when the account is created. */
  referCode: z.string().trim().max(32, "That code is too long").optional(),
});
export type NewCustomerValues = z.infer<typeof schema>;

/** What the form opens with — from the search box, a "not found" lookup, or a picked contact. */
export interface NewCustomerPrefill {
  phone?: string;
  name?: string;
  dob?: string | null;
  gender?: LoyaltyGender | null;
}

/** The Select needs a real value for "unset"; this one never reaches the API. */
const GENDER_UNSET = "unset";

/** A birthday from the API is an ISO timestamp; only its calendar date matters here. */
function parseDob(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

interface NewCustomerFormProps {
  prefill: NewCustomerPrefill;
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
      dob: parseDob(prefill.dob),
      gender: prefill.gender ?? undefined,
      referCode: "",
    },
  });

  const phone = useDebounce(form.watch("phone"), 400);
  const lookupEnabled = Boolean(phone) && isValidPhoneNumber(phone);
  const { data: lookup } = useContactLookupByPhone(phone.replace(/\D/g, ""), lookupEnabled);

  // The org may already know these from a WhatsApp conversation or an import — save the
  // typing, but only into fields the cashier has not filled in themselves.
  useEffect(() => {
    const contact = lookup?.contact;
    if (!contact) return;
    if (contact.name && !form.getValues("name")) form.setValue("name", contact.name);
    if (contact.dob && !form.getValues("dob")) {
      const dob = parseDob(contact.dob);
      if (dob) form.setValue("dob", dob);
    }
    if (contact.gender && !form.getValues("gender")) form.setValue("gender", contact.gender);
  }, [lookup, form]);

  const genderLabels: Record<LoyaltyGender, string> = {
    MALE: t("Male"),
    FEMALE: t("Female"),
    OTHER: t("Other"),
  };
  const genderItems = [
    { value: GENDER_UNSET, label: t("Prefer not to say") },
    ...LOYALTY_GENDERS.map((value) => ({ value, label: genderLabels[value] })),
  ];

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

      {/* Short fields — capped rather than stretched across the whole main column,
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

        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            control={form.control}
            name="dob"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="new-customer-dob">{t("Date of birth (optional)")}</FieldLabel>
                <DatePicker
                  id="new-customer-dob"
                  value={field.value}
                  onChange={field.onChange}
                  startMonth={new Date(1900, 0)}
                  placeholder={t("Pick a date")}
                  invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="gender"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="new-customer-gender">{t("Gender (optional)")}</FieldLabel>
                <Select
                  value={field.value ?? GENDER_UNSET}
                  onValueChange={(value) =>
                    // `find` narrows to the enum without a cast; the "unset" sentinel misses.
                    field.onChange(LOYALTY_GENDERS.find((gender) => gender === value))
                  }
                  items={genderItems}
                >
                  <SelectTrigger
                    id="new-customer-gender"
                    className="w-full"
                    aria-invalid={fieldState.invalid}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {genderItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        <Controller
          control={form.control}
          name="referCode"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>{t("Referral code (optional)")}</FieldLabel>
              <Input
                id={field.name}
                autoComplete="off"
                autoCapitalize="characters"
                placeholder={t("Enter a code if they have one")}
                {...field}
                value={field.value ?? ""}
              />
              <FieldDescription>
                {t("The friend who referred them gets their bonus when this account is created.")}
              </FieldDescription>
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
