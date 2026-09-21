import { zodResolver } from "@hookform/resolvers/zod";
import { IconCake } from "@tabler/icons-react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import z from "zod";

import type { UpdateLoyaltyCustomerInput } from "@/backend/loyalty/customer/customer.api";
import type { LoyaltyChannel } from "@/backend/loyalty/program.api";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

import { channelLabel } from "../channels/channels.ts";

/** "No answer" is a real choice for gender, distinct from never having been asked. */
const UNSET = "__unset__";

interface EditableCustomer {
  name?: string | null;
  phone?: string | null;
  dob?: string | Date | null;
  gender?: string | null;
  email?: string | null;
}

/**
 * Editing a member's own details.
 *
 * Only what belongs to the person: their name, birthday, gender and email. Points, tier
 * and status are the programme's business and are changed at the counter or from the
 * member's own record, not here.
 *
 * The birthday is the reason this dialog exists. Reminders match on it, so a member
 * enrolled at the till without one could never be greeted — and until now there was no
 * way to add it after the fact.
 */
export function EditCustomerDialog({
  open,
  customer,
  channels = [],
  preferredChannel = null,
  isSaving,
  onClose,
  onSave,
}: Readonly<{
  open: boolean;
  customer: EditableCustomer | undefined;
  /** The programme's channels; the member can pick one only when there is a choice. */
  channels?: readonly LoyaltyChannel[];
  preferredChannel?: LoyaltyChannel | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (patch: UpdateLoyaltyCustomerInput) => void;
}>) {
  const { t } = useTranslation();

  const schema = z.object({
    name: z.string().trim().min(1, t("Enter a name")).max(120),
    // A date input hands back "" when cleared, which is how a birthday is removed.
    dob: z
      .string()
      .refine((value) => value === "" || !Number.isNaN(Date.parse(value)), t("Not a real date"))
      .refine(
        (value) => value === "" || new Date(value) <= new Date(),
        t("A birthday cannot be in the future"),
      ),
    gender: z.string(),
    preferredChannel: z.string(),
    email: z
      .string()
      .refine((value) => value === "" || z.string().email().safeParse(value).success, {
        message: t("Not a valid email"),
      }),
  });

  type Values = z.infer<typeof schema>;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    // Keyed remount from the caller gives each member their own defaults.
    defaultValues: {
      name: customer?.name ?? "",
      dob: asDateInput(customer?.dob),
      gender: customer?.gender ?? UNSET,
      preferredChannel: preferredChannel ?? UNSET,
      email: customer?.email ?? "",
    },
  });

  const submit = (values: Values) => {
    onSave({
      name: values.name.trim(),
      // Cleared fields go as null so the API removes them, rather than as "" which would
      // store an empty string and read as "answered".
      dob: values.dob === "" ? null : values.dob,
      gender: values.gender === UNSET ? null : (values.gender as "MALE" | "FEMALE" | "OTHER"),
      email: values.email.trim() === "" ? null : values.email.trim(),
      ...(choosesChannel
        ? {
            preferredChannel:
              values.preferredChannel === UNSET
                ? null
                : (values.preferredChannel as LoyaltyChannel),
          }
        : {}),
    });
  };

  const choosesChannel = channels.length > 1;
  const channelOptions = [
    { value: UNSET, label: t("The programme's order") },
    ...channels.map((channel) => ({ value: channel, label: channelLabel(channel, t) })),
  ];

  const genders = [
    { value: UNSET, label: t("Not given") },
    { value: "MALE", label: t("Male") },
    { value: "FEMALE", label: t("Female") },
    { value: "OTHER", label: t("Other") },
  ];

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Edit customer")}</DialogTitle>
          <DialogDescription>
            {customer?.phone
              ? t("Their details. The number they joined on cannot be changed here.")
              : t("Their details.")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(submit)}>
          <FieldGroup className="gap-4">
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="edit-customer-name">{t("Name")}</FieldLabel>
                  <Input
                    {...field}
                    id="edit-customer-name"
                    aria-invalid={fieldState.invalid}
                    placeholder={t("Enter Name")}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="dob"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="edit-customer-dob" className="flex items-center gap-1.5">
                    <IconCake size={14} className="text-muted-foreground" />
                    {t("Date of birth")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="edit-customer-dob"
                    type="date"
                    max={todayInputValue()}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldDescription>
                    {t("Needed for the birthday reminder. Leave it empty to remove it.")}
                  </FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="gender"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="edit-customer-gender">{t("Gender")}</FieldLabel>
                  <Select value={field.value} items={genders} onValueChange={field.onChange}>
                    <SelectTrigger id="edit-customer-gender" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {genders.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />

            {choosesChannel && (
              <Controller
                name="preferredChannel"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="edit-customer-channel">
                      {t("Preferred channel")}
                    </FieldLabel>
                    <Select
                      value={field.value}
                      items={channelOptions}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger id="edit-customer-channel" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {channelOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      {t(
                        "Where they hear from you. The programme falls back to its other channels if this one cannot reach them.",
                      )}
                    </FieldDescription>
                  </Field>
                )}
              />
            )}

            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="edit-customer-email">{t("Email")}</FieldLabel>
                  <Input
                    {...field}
                    id="edit-customer-email"
                    type="email"
                    aria-invalid={fieldState.invalid}
                    placeholder={t("Optional")}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose} loading={isSaving}>
              {t("Cancel")}
            </Button>
            <Button type="submit" loading={isSaving}>
              {t("Save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * A stored birthday as `<input type="date">` wants it.
 *
 * Sliced off the ISO string rather than read through the local clock: a date stored as a
 * UTC midnight goes back a day in any zone behind UTC, which is how a birthday drifts.
 */
function asDateInput(value: string | Date | null | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}
