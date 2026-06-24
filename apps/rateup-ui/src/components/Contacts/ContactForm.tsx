import { ChevronDownIcon } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import PhoneInputWithCountrySelect from "react-phone-number-input";

import { useContactLabels } from "@/backend/campaign/contacts/contacts.query";
import { ContactGroupType } from "@/types/enums.ts";

import { Button } from "../ui/button.tsx";
import { Calendar } from "../ui/calendar.tsx";
import { Field, FieldError, FieldLabel } from "../ui/field.tsx";
import { Input } from "../ui/input.tsx";
import { MultiSelect } from "../ui/multi-select.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select.tsx";
import { Textarea } from "../ui/textarea.tsx";
import ContactGroupSelector from "./ContactGroupSelector.tsx";
import { UserSelector } from "./CreateContactModal.tsx";
import { LifecycleSelector } from "./LifecycleSelector.tsx";

const ContactForm = ({ form, customFields, type }) => {
  const { t: translations } = useTranslation();
  const { data: labels = [], isPending } = useContactLabels();

  const getCustomFieldValue = (fieldId) => {
    const customField = form.getValues().customFields?.find((cf) => cf.slug === fieldId);
    return customField?.value || "";
  };

  const updateCustomField = (fieldId, value, customFieldData) => {
    const currentCustomFields = form.getValues().customFields;
    const existingIndex = currentCustomFields.findIndex((cf) => cf.fieldId === fieldId);

    if (existingIndex >= 0) {
      currentCustomFields[existingIndex].value = value;
    } else {
      currentCustomFields.push({
        id: customFieldData?.id,
        fieldId: fieldId,
        value: value,
      });
    }

    form.setFieldValue("customFields", [...currentCustomFields]);
  };

  const renderCustomField = (fieldId) => {
    if (fieldId === "phone") return null;

    const customField = customFields.find((field) => field.slug === fieldId);

    if (!customField) return null;

    const fieldValue = getCustomFieldValue(fieldId);
    const fieldError = form.errors[`customFields.${fieldId}`];

    const commonProps = {
      label: customField.name,
      placeholder: `Enter ${customField.name}`,
      // radius: "md",
      // size: "md",
      // key: `customField-${fieldId}`,
      required: customField.required,
      error: fieldError,
    };

    switch (customField.type) {
      case "email":
        return (
          <Field className="flex flex-col gap-1">
            <FieldLabel>{commonProps.label}</FieldLabel>
            <Input
              {...commonProps}
              type="email"
              defaultValue={fieldValue}
              onChange={(event) => {
                updateCustomField(fieldId, event.currentTarget.value, customField);
              }}
              className="bg-accent border-none"
            />
            {commonProps.error && <FieldError>{commonProps.error}</FieldError>}
          </Field>
        );

      case "number":
        return (
          <Field className="flex flex-col gap-1">
            <FieldLabel>{commonProps.label}</FieldLabel>
            <Input
              {...commonProps}
              type="number"
              defaultValue={fieldValue ? Number(fieldValue) : ""}
              onChange={(value) => {
                updateCustomField(fieldId, value?.toString() || "", customField);
              }}
              className="bg-accent border-none"
            />
            {commonProps.error && <FieldError>{commonProps.error}</FieldError>}
          </Field>
        );

      case "multivalue":
        const options =
          customField?.listValues?.map((option) => ({
            value: option,
            label: option,
          })) || [];

        return (
          <Field className="flex flex-col gap-1">
            <FieldLabel>{commonProps.label}</FieldLabel>
            <Select
              required={commonProps.required}
              value={fieldValue}
              onValueChange={(value) => {
                updateCustomField(fieldId, value || "", customField);
              }}
            >
              <SelectTrigger className="bg-accent border-none placeholder:text-sm">
                <SelectValue placeholder={commonProps.placeholder} />
              </SelectTrigger>
              <SelectContent>
                {options.map((op) => (
                  <SelectItem value={op.value} key={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {commonProps.error && <FieldError>{commonProps.error}</FieldError>}
          </Field>
        );

      case "text":
      default:
        return (
          <Field className="flex flex-col gap-1">
            <FieldLabel>{commonProps.label}</FieldLabel>
            <Input
              {...commonProps}
              defaultValue={fieldValue}
              onChange={(event) => {
                updateCustomField(fieldId, event.currentTarget.value, customField);
              }}
              className="bg-accent border-none placeholder:text-sm"
            />
            {commonProps.error && <FieldError>{commonProps.error}</FieldError>}
          </Field>
        );
    }
  };
  if (isPending) return <div>Loading...</div>;

  return (
    <div className="grid grid-cols-2 gap-4">
      <Field className="col-span-2 flex flex-col gap-1">
        <FieldLabel>{translations("Full Name")}*</FieldLabel>
        <Input
          placeholder={translations("Enter full name")}
          required
          {...form.getInputProps("name")}
          className="bg-accent border-none placeholder:text-sm"
        />
      </Field>
      <Field className="flex flex-col gap-1">
        <FieldLabel>{translations("Phone Number")}*</FieldLabel>
        <PhoneInputWithCountrySelect
          defaultCountry="IN"
          international
          countryCallingCodeEditable={false}
          placeholder={translations("Enter phone number")}
          value={form.values.phone ?? ""}
          {...form.getInputProps("phone")}
          className="w-full rounded-md border-none bg-accent px-3 py-2 text-sm focus-within:border-input [&>input]:border-none [&>input]:focus:outline-none focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px] transition-all duration-150 ease-in-out focus-within:border-2"
        />
        {form?.errors?.phone && <FieldError>*{form?.errors?.phone}</FieldError>}
      </Field>
      <Field className="flex flex-col gap-1">
        <FieldLabel>{translations("Email")}</FieldLabel>
        <Input
          placeholder={translations("email@example.com")}
          type="email"
          {...form.getInputProps("email")}
          className="bg-accent border-none placeholder:text-sm"
        />
      </Field>
      {type !== ContactGroupType.LOYALTY && (
        <>
          <Field className="flex flex-col gap-1">
            <FieldLabel>{translations("Labels")}</FieldLabel>
            <MultiSelect
              onValueChange={(values) => form.setFieldValue("labels", values)}
              options={labels?.map((label) => ({
                value: label.id,
                label: label.name,
              }))}
              defaultValue={form.values.labels}
              className="bg-accent hover:bg-accent border-none placeholder:text-sm min-h-9"
              placeholder="Select labels"
            />
          </Field>
          <Field className="flex flex-col gap-1">
            <FieldLabel>{translations("Lifecycle Stage")}</FieldLabel>
            <LifecycleSelector
              {...form.getInputProps("lifecycleId")}
              className="bg-accent border-none"
            />
          </Field>
          <Field className="flex flex-col gap-1">
            <FieldLabel>{translations("Assignee")}</FieldLabel>
            <UserSelector
              {...form.getInputProps("assignedUserIds")}
              className="bg-accent border-none hover:bg-accent"
              allowMultiSelect
            />
          </Field>
          <Field className="flex flex-col gap-1">
            <FieldLabel>{translations("Group")}</FieldLabel>
            <ContactGroupSelector
              {...form.getInputProps("contactGroupIds")}
              className="border-none bg-accent placeholder:text-sm hover:bg-accent"
              allowMultiSelect
            />
          </Field>
        </>
      )}
      {type === ContactGroupType.LOYALTY && (
        <>
          <Field className="flex flex-col gap-1">
            <FieldLabel>{translations("Date of Birth")}</FieldLabel>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  id="date"
                  className="w-48 justify-between font-normal bg-accent border-none"
                >
                  {form.values.dob || "Select date"}
                  <ChevronDownIcon />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                <Calendar
                  mode="single"
                  selected={form.values.dob}
                  captionLayout="dropdown"
                  onSelect={(date) => {
                    form.setFieldValue("dob", date);
                  }}
                />
              </PopoverContent>
            </Popover>
          </Field>
          <Field className="flex flex-col gap-1">
            <FieldLabel>{translations("External ID")}</FieldLabel>
            <Input
              placeholder={translations("Enter External ID")}
              {...form.getInputProps("external_id")}
              className="bg-accent border-none placeholder:text-sm"
            />
          </Field>
        </>
      )}
      {form.getValues().contactType?.map((fieldId) => renderCustomField(fieldId))}
      {type !== ContactGroupType.LOYALTY && (
        <Field className="col-span-2 flex flex-col gap-1">
          <FieldLabel>{translations("notes")}</FieldLabel>
          <Textarea
            {...form.getInputProps("notes")}
            className="border-none bg-accent placeholder:text-sm"
            placeholder="Add any additional notes..."
          />
        </Field>
      )}
    </div>
  );
};

export default ContactForm;
