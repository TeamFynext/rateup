import { ChevronDownIcon } from "lucide-react";
import { useId } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";

import type { CustomFieldData } from "@/backend/campaign/contacts/contacts.api";
import { useContactLabels } from "@/backend/campaign/contacts/contacts.query";
import { PhoneInput } from "@/components/ui/phone-input.tsx";
import { ContactGroupType } from "@/types/enums.ts";

import { Button } from "../ui/button.tsx";
import { Calendar } from "../ui/calendar.tsx";
import { Field, FieldError, FieldLabel, FieldTitle } from "../ui/field.tsx";
import { Input } from "../ui/input.tsx";
import { MultiSelect } from "../ui/multi-select.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select.tsx";
import { Textarea } from "../ui/textarea.tsx";
import type { ContactFormValues } from "./contact-form-schema.ts";
import ContactGroupSelector from "./ContactGroupSelector.tsx";
import { UserSelector } from "./CreateContactModal.tsx";
import { LifecycleSelector } from "./LifecycleSelector.tsx";

type ContactFormProps = Readonly<{
  form: UseFormReturn<ContactFormValues>;
  customFields: CustomFieldData[];
  type: ContactGroupType;
}>;

const ContactForm = ({ form, customFields, type }: ContactFormProps) => {
  const uid = useId();
  const { t: translations } = useTranslation();
  const { data: labels = [], isPending } = useContactLabels();
  const contactType = form.watch("contactType");
  const customFieldValues = form.watch("customFields");

  /**
   * Custom field values live in a positional array, so editing one means finding (or
   * appending) its entry and writing the whole array back.
   */
  const updateCustomField = (fieldId: string, value: string, customFieldData: unknown) => {
    const current = form.getValues("customFields") ?? [];
    const existingIndex = current.findIndex((entry) => entry.fieldId === fieldId);
    const next =
      existingIndex >= 0
        ? current.map((entry, index) => (index === existingIndex ? { ...entry, value } : entry))
        : [...current, { id: customFieldData?.id, fieldId, value }];
    form.setValue("customFields", next, { shouldDirty: true, shouldValidate: true });
  };

  const renderCustomField = (fieldId: string) => {
    if (fieldId === "phone") return null;

    const customField = customFields.find((field) => field.slug === fieldId);
    if (!customField) return null;

    const entryIndex = customFieldValues?.findIndex((entry) => entry.fieldId === fieldId) ?? -1;
    const fieldValue = entryIndex >= 0 ? (customFieldValues[entryIndex]?.value ?? "") : "";
    const fieldError =
      entryIndex >= 0
        ? form.formState.errors.customFields?.[entryIndex]?.value?.message
        : undefined;

    const commonProps = {
      label: customField.name,
      placeholder: `Enter ${customField.name}`,
      required: customField.required,
    };

    const options =
      customField?.listValues?.map((option: string) => ({
        value: option,
        label: option,
      })) || [];

    switch (customField.type) {
      case "multivalue":
        return (
          <Field className="flex flex-col gap-1" data-invalid={!!fieldError}>
            <FieldLabel htmlFor={`${uid}-${fieldId}`}>{commonProps.label}</FieldLabel>
            <Select
              required={commonProps.required}
              value={fieldValue}
              onValueChange={(value) => updateCustomField(fieldId, value || "", customField)}
              items={options}
            >
              <SelectTrigger
                id={`${uid}-${fieldId}`}
                className="bg-accent border-none placeholder:text-sm"
                aria-invalid={!!fieldError}
                aria-describedby={fieldError ? `${uid}-${fieldId}-error` : undefined}
              >
                <SelectValue placeholder={commonProps.placeholder} />
              </SelectTrigger>
              <SelectContent>
                {options.map((op: { value: string; label: string }) => (
                  <SelectItem value={op.value} key={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldError && <FieldError id={`${uid}-${fieldId}-error`}>{fieldError}</FieldError>}
          </Field>
        );

      case "email":
      case "number":
      case "text":
      default:
        return (
          <Field className="flex flex-col gap-1" data-invalid={!!fieldError}>
            <FieldLabel htmlFor={`${uid}-${fieldId}`}>{commonProps.label}</FieldLabel>
            <Input
              id={`${uid}-${fieldId}`}
              {...commonProps}
              type={customField.type === "email" ? "email" : customField.type}
              defaultValue={fieldValue}
              aria-invalid={!!fieldError}
              aria-describedby={fieldError ? `${uid}-${fieldId}-error` : undefined}
              onChange={(event) =>
                updateCustomField(fieldId, event.currentTarget.value, customField)
              }
              className="bg-accent border-none placeholder:text-sm"
            />
            {fieldError && <FieldError id={`${uid}-${fieldId}-error`}>{fieldError}</FieldError>}
          </Field>
        );
    }
  };

  if (isPending) return <div>Loading...</div>;

  return (
    <div className="grid grid-cols-2 gap-4">
      <Controller
        name="name"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field className="col-span-2 flex flex-col gap-1" data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>{translations("Full Name")}*</FieldLabel>
            <Input
              {...field}
              id={field.name}
              placeholder={translations("Enter full name")}
              required
              autoComplete="name"
              aria-invalid={fieldState.invalid}
              aria-describedby={fieldState.invalid ? `${field.name}-error` : undefined}
              className="bg-accent border-none placeholder:text-sm"
            />
            {fieldState.invalid && (
              <FieldError id={`${field.name}-error`} errors={[fieldState.error]} />
            )}
          </Field>
        )}
      />
      <Controller
        name="phone"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field className="flex flex-col gap-1" data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>{translations("Phone Number")}*</FieldLabel>
            <PhoneInput
              name={field.name}
              defaultCountry="IN"
              international
              countryCallingCodeEditable={false}
              placeholder={translations("Enter phone number")}
              value={field.value ?? ""}
              onChange={field.onChange}
              onBlur={field.onBlur}
              aria-invalid={fieldState.invalid}
              aria-describedby={fieldState.invalid ? `${field.name}-error` : undefined}
              className="w-full"
            />
            {fieldState.invalid && (
              <FieldError id={`${field.name}-error`}>*{fieldState.error?.message}</FieldError>
            )}
          </Field>
        )}
      />
      <Controller
        name="email"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field className="flex flex-col gap-1" data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>{translations("Email")}</FieldLabel>
            <Input
              {...field}
              id={field.name}
              placeholder={translations("email@example.com")}
              type="email"
              autoComplete="email"
              aria-invalid={fieldState.invalid}
              aria-describedby={fieldState.invalid ? `${field.name}-error` : undefined}
              className="bg-accent border-none placeholder:text-sm"
            />
            {fieldState.invalid && (
              <FieldError id={`${field.name}-error`} errors={[fieldState.error]} />
            )}
          </Field>
        )}
      />
      {type !== ContactGroupType.LOYALTY && (
        <>
          <Controller
            name="labels"
            control={form.control}
            render={({ field }) => (
              <Field className="flex flex-col gap-1">
                <FieldLabel htmlFor={`${uid}-field-3`}>{translations("Labels")}</FieldLabel>
                <MultiSelect
                  id={`${uid}-field-3`}
                  options={
                    labels?.map((label: { id: string; name: string }) => ({
                      value: label.id,
                      label: label.name,
                    })) ?? []
                  }
                  value={field.value ?? []}
                  onValueChange={field.onChange}
                  placeholder="Select labels"
                  emptyIndicator="No labels found."
                  className="bg-accent hover:bg-accent border-none placeholder:text-sm min-h-9"
                />
              </Field>
            )}
          />
          <Controller
            name="lifecycleId"
            control={form.control}
            render={({ field }) => (
              <Field className="flex flex-col gap-1">
                <FieldTitle>{translations("Lifecycle Stage")}</FieldTitle>
                <LifecycleSelector
                  value={field.value}
                  onChange={field.onChange}
                  className="w-full"
                />
              </Field>
            )}
          />
          <Controller
            name="assignedUserIds"
            control={form.control}
            render={({ field }) => (
              <Field className="flex flex-col gap-1">
                <FieldTitle>{translations("Assignee")}</FieldTitle>
                <UserSelector
                  value={field.value}
                  onChange={field.onChange}
                  className="bg-accent border-none hover:bg-accent"
                  allowMultiSelect
                />
              </Field>
            )}
          />
          <Controller
            name="contactGroupIds"
            control={form.control}
            render={({ field }) => (
              <Field className="flex flex-col gap-1">
                <FieldTitle>{translations("Group")}</FieldTitle>
                <ContactGroupSelector
                  value={field.value}
                  onChange={field.onChange}
                  className="border-none bg-accent placeholder:text-sm hover:bg-accent"
                  allowMultiSelect
                />
              </Field>
            )}
          />
        </>
      )}
      {type === ContactGroupType.LOYALTY && (
        <>
          <Controller
            name="dob"
            control={form.control}
            render={({ field }) => (
              <Field className="flex flex-col gap-1">
                <FieldTitle>{translations("Date of Birth")}</FieldTitle>
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button
                        variant="outline"
                        id="date"
                        className="w-48 justify-between font-normal bg-accent border-none"
                      />
                    }
                  >
                    {String(field.value ?? "") || "Select date"}
                    <ChevronDownIcon />
                  </PopoverTrigger>
                  <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value as Date}
                      captionLayout="dropdown"
                      onSelect={(date) => field.onChange(date)}
                    />
                  </PopoverContent>
                </Popover>
              </Field>
            )}
          />
          <Controller
            name="external_id"
            control={form.control}
            render={({ field }) => (
              <Field className="flex flex-col gap-1">
                <FieldLabel htmlFor={field.name}>{translations("External ID")}</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  placeholder={translations("Enter External ID")}
                  className="bg-accent border-none placeholder:text-sm"
                />
              </Field>
            )}
          />
        </>
      )}
      {contactType?.map((fieldId) => renderCustomField(fieldId))}
      {type !== ContactGroupType.LOYALTY && (
        <Controller
          name="notes"
          control={form.control}
          render={({ field }) => (
            <Field className="col-span-2 flex flex-col gap-1">
              <FieldLabel htmlFor={field.name}>{translations("notes")}</FieldLabel>
              <Textarea
                {...field}
                id={field.name}
                className="border-none bg-accent placeholder:text-sm"
                placeholder="Add any additional notes..."
              />
            </Field>
          )}
        />
      )}
    </div>
  );
};

export default ContactForm;
