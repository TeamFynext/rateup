import { zodResolver } from "@hookform/resolvers/zod";
import { Download, Info, User } from "lucide-react";
import { Activity, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  useCreateContactMutation,
  useEditContactMutation,
} from "@/backend/campaign/contacts/contacts.query";
import { useTeamsMembersOfOrg } from "@/backend/org/org.query";
import { useCustomFieldsContext } from "@/context/CustomFieldsContext.tsx";
import { ContactGroupType } from "@/types/enums.ts";
import { SAVE_HOTKEY } from "@/utils/constants.ts";
import { importMethod } from "@/utils/enums/index.ts";
import { getFileUrlFromKey } from "@/utils/file-upload/upload.ts";
import { getHotkeyHandler } from "@/utils/hotkeys.ts";

import { Button } from "../ui/button.tsx";
import { Card } from "../ui/card.tsx";
import { Checkbox } from "../ui/checkbox.tsx";
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "../ui/field.tsx";
import { Input } from "../ui/input.tsx";
import { MultiSelect } from "../ui/multi-select.tsx";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select.tsx";
import { Skeleton } from "../ui/skeleton.tsx";
import { Spinner } from "../ui/spinner.tsx";
import { Switch } from "../ui/switch.tsx";
import {
  buildContactSchema,
  type ContactFormValues,
  contactFormDefaults,
} from "./contact-form-schema.ts";
import ContactForm from "./ContactForm.tsx";

const CreateContactModal = ({
  contactClose,
  close,
  importCSVContactMutation,
  type = ContactGroupType.NORMAL,
  initialValues = null,
  createNewContactMutation,
}: {
  contactClose: () => void;
  close: () => void;
  importCSVContactMutation?: any;
  type?: ContactGroupType;
  initialValues?: any;
  createNewContactMutation?: any;
}) => {
  const [csvfile, setCsvfile] = useState<File | null>(null);
  const [csvFileError, setCsvFileError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const createContactMutation = useCreateContactMutation();
  const editContactMutation = useEditContactMutation(null);

  const { t: translations } = useTranslation();
  const { customFields } = useCustomFieldsContext();

  const contactSchema = useMemo(
    () => buildContactSchema(translations, customFields),
    [translations, customFields],
  );
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema) as any,
    defaultValues: { ...contactFormDefaults, ...initialValues },
  });

  const submitContact = (values: ContactFormValues) => {
    setIsCreating(true);
    if (values.source == importMethod.CSV && !initialValues) {
      if (!csvfile) {
        setCsvFileError(translations("Choose a CSV, XLSX or ODS file to import."));
        setIsCreating(false);
        return;
      }
      setCsvFileError("");
      const formData = new FormData();
      formData.append("update", values.updateExisting?.toString());
      formData.append("hasHeaderRow", values.hasHeaderRow?.toString() ?? "true");
      values.contactType.forEach((item, index) => {
        formData.append(`tags[${index}]`, item);
      });
      formData.append("file", csvfile);
      importCSVContactMutation.mutate(formData, {
        onSettled: () => {
          setIsCreating(false);
          form.reset();
          setCsvfile(null);
          contactClose();
          close();
        },
      });
      return;
    }
    const contactData = {
      ...values,
      dob: values.dob ? new Date(values.dob).toISOString() : null,
      external_id: values.external_id || undefined,
      phone: values.phone?.replace(/^\+/, "") || "",
      source: type === ContactGroupType.LOYALTY ? ContactGroupType.LOYALTY : values.source,
      lastReceivedMessageTimeStamp: undefined as string | undefined,
    };
    if (initialValues) {
      editContactMutation.mutate(
        { data: contactData, contactId: initialValues.id },
        {
          onSuccess: () => {
            setIsCreating(false);
            contactClose();
            close();
            form.reset();
          },
          onError: () => setIsCreating(false),
        },
      );
      return;
    }
    if (createNewContactMutation) {
      createNewContactMutation.mutate([contactData], {
        onSuccess: () => {
          setIsCreating(false);
          contactClose();
          close();
          form.reset();
        },
        onError: () => setIsCreating(false),
      });
      return;
    }
    createContactMutation.mutate(contactData, {
      onSuccess: () => {
        toast.success("Contact created successfully.", { id: "contact-create" });
        setIsCreating(false);
        contactClose();
        close();
        form.reset();
      },
      onError: (error) => {
        toast.error(error?.message || `Error creating the contact`, { id: "contact-create" });
        setIsCreating(false);
      },
    });
  };

  const handleSubmit = form.handleSubmit(submitContact);

  useEffect(() => {
    if (initialValues) {
      form.reset({ ...contactFormDefaults, ...initialValues, phone: "+" + initialValues.phone });
    }
    form.setValue("contactType", customFields?.map((field) => field.slug) || []);
  }, [initialValues, customFields, form]);

  const sourceValue = form.watch("source");
  const contactTypeValue = form.watch("contactType") ?? [];

  // ContactForm renders its own per-field errors, but it is unmounted on the CSV branch. Surface
  // anything it cannot show so a rejected submit always explains itself.
  const isContactFormVisible =
    sourceValue == importMethod.MANUAL || sourceValue != importMethod.CSV || !!initialValues;
  const unrenderedErrors = isContactFormVisible
    ? []
    : Object.values(form.formState.errors)
        .flatMap((error) => (Array.isArray(error) ? error : [error]))
        .filter((error): error is { message: string } => typeof error?.message === "string");

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        onKeyDown={getHotkeyHandler([[SAVE_HOTKEY, handleSubmit]])}
        onReset={() => form.reset()}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            {initialValues ? null : (
              <FieldSet>
                <FieldLegend variant="label">{translations("Import Contacts")}</FieldLegend>
                <RadioGroup
                  value={sourceValue}
                  onValueChange={(value) => form.setValue("source", value, { shouldDirty: true })}
                  className="flex flex-row items-center gap-4"
                >
                  <Field orientation="horizontal" className="w-auto gap-2">
                    <RadioGroupItem value={importMethod.MANUAL} id="import-manual" />
                    <FieldLabel htmlFor="import-manual" className="font-normal">
                      {translations("Manual")}
                    </FieldLabel>
                  </Field>
                  <Field orientation="horizontal" className="w-auto gap-2">
                    <RadioGroupItem value={importMethod.CSV} id="import-csv" />
                    <FieldLabel htmlFor="import-csv" className="font-normal">
                      {translations("Import CSV/XLSX")}
                    </FieldLabel>
                  </Field>
                </RadioGroup>
              </FieldSet>
            )}

            {customFields?.length > 0 && (
              <Card className="flex flex-row flex-wrap items-center gap-4 p-2">
                {customFields?.map((data) => {
                  const checked = contactTypeValue.includes(data?.slug);
                  return (
                    <Field orientation="horizontal" className="w-auto gap-2" key={data?.id}>
                      <Checkbox
                        id={`contact-type-${data?.slug}`}
                        checked={checked}
                        onCheckedChange={(value) => {
                          form.setValue(
                            "contactType",
                            value
                              ? [...contactTypeValue, data?.slug]
                              : contactTypeValue.filter((slug) => slug !== data?.slug),
                            { shouldDirty: true },
                          );
                        }}
                      />
                      <FieldLabel
                        htmlFor={`contact-type-${data?.slug}`}
                        className="font-normal capitalize"
                      >
                        {data?.name}
                      </FieldLabel>
                    </Field>
                  );
                })}
              </Card>
            )}
          </div>
          {(sourceValue == importMethod.MANUAL ||
            sourceValue != importMethod.CSV ||
            initialValues) && <ContactForm form={form} customFields={customFields} type={type} />}
          {sourceValue == importMethod.CSV && !initialValues && (
            <div className="flex flex-col gap-4">
              <blockquote className="mx-6 flex items-start gap-2 rounded-md border-l-4 border-l-rateup-blue bg-accent p-3 text-sm">
                <Info className="mt-0.5 size-5 shrink-0 text-primary" />
                <div className="flex flex-col gap-2">
                  <span>
                    {translations(
                      "Utilizing CSV/XLSX file uploads to generate contact requires specific fields in the file: name, phone",
                    )}
                  </span>
                  <a
                    href={getFileUrlFromKey("/File/contact/demo.csv", false)}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-fit items-center gap-1 rounded-sm text-primary underline underline-offset-2"
                  >
                    <Download className="size-4" />
                    {translations("Download Demo Csv File")}
                  </a>
                </div>
              </blockquote>
              <FieldGroup className="mx-6 gap-4">
                <Field orientation="horizontal" className="gap-2">
                  <Controller
                    name="updateExisting"
                    control={form.control}
                    render={({ field }) => (
                      <Switch
                        id="update-existing"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <FieldLabel htmlFor="update-existing" className="font-normal">
                    {translations("Update the existing data while importing")}
                  </FieldLabel>
                </Field>
                <Field orientation="horizontal" className="gap-2">
                  <Controller
                    name="hasHeaderRow"
                    control={form.control}
                    render={({ field }) => (
                      <Switch
                        id="has-header-row"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <FieldLabel htmlFor="has-header-row" className="font-normal">
                    {translations("First row contains column headers (name, phone, ...)")}
                  </FieldLabel>
                </Field>
              </FieldGroup>
              <Field className="mx-5" data-invalid={!!csvFileError}>
                <Input
                  type="file"
                  accept=".csv,.xlsx,.ods"
                  aria-label={translations(
                    "Upload a csv file (.csv), excel file (.xlsx) or opendocument file (.ods)",
                  )}
                  aria-invalid={!!csvFileError}
                  aria-describedby={csvFileError ? "csv-file-error" : undefined}
                  onChange={(event) => {
                    setCsvfile(event.target.files?.[0] ?? null);
                    setCsvFileError("");
                  }}
                  className="h-15 border-2 border-dashed border-gray-300 text-center"
                />
                {csvFileError && <FieldError id="csv-file-error">{csvFileError}</FieldError>}
              </Field>
            </div>
          )}

          {/* Errors from fields that the currently-visible branch does not render, so a failed
              submit is never silent. */}
          {unrenderedErrors.length > 0 && <FieldError className="px-5" errors={unrenderedErrors} />}

          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" type="button" onClick={contactClose}>
              <span className="text-sm font-normal">{translations("cancel")}</span>
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={sourceValue == importMethod.CSV && !initialValues && !csvfile}
            >
              {isCreating && <Spinner />}
              <span className="text-sm font-normal">
                {initialValues
                  ? translations("Update Contact")
                  : sourceValue == importMethod.MANUAL
                    ? translations("Add Contact")
                    : translations("Import Contacts")}
              </span>
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
export default CreateContactModal;

export const UserSelector = ({
  value,
  onChange,
  className = "",
  allowMultiSelect = false,
  allowAll = false,
}: {
  value: string & string[];
  onChange: ((value: string, isAll?: boolean) => void) &
    ((value: string[], isAll?: boolean) => void);
  className?: string;
  allowMultiSelect?: boolean;
  allowAll?: boolean;
}) => {
  const { data: users, isLoading } = useTeamsMembersOfOrg();
  if (isLoading) {
    return (
      <Card className="h-full w-fit p-1 rounded-md">
        <Skeleton className="h-7 w-[150px]" />
      </Card>
    );
  }
  if (allowMultiSelect) {
    const userOptions = users?.data?.map((user) => ({ value: user.id, label: user.name })) ?? [];
    return (
      <MultiSelect
        options={userOptions}
        value={value}
        onValueChange={onChange}
        placeholder="Select staff"
        emptyIndicator="No staff found."
        className={`${className}`}
      />
    );
  }
  const userData = users?.data?.map((u) => ({
    id: u.id,
    name: u.name,
    status: u.status,
  }));
  if (allowAll) userData.unshift({ id: "all", name: "All Staff", status: "online" });
  function onValueChange(value: string) {
    onChange(value === "all" ? users.data.map((u) => u.id) : value, value === "all");
  }
  const userSelectItems = userData?.map((user) => ({ value: user.id, label: user.name })) ?? [];
  return (
    <Select value={value} onValueChange={onValueChange} items={userSelectItems}>
      <SelectTrigger className={`${className}`}>
        <div>
          <User className="size-4 text-muted-foreground" />
        </div>
        <span className="text-sm ">
          <SelectValue placeholder="Select staff" />
        </span>
      </SelectTrigger>
      <SelectContent>
        {userData?.map((user) => (
          <SelectItem key={user.id} value={user.id} className="flex gap-1">
            <span>{user.name}</span>
            <Activity mode={user.id !== "all" ? "visible" : "hidden"}>
              <span
                className={`text-xs capitalize ${user.status === "online" ? "text-green-700" : "text-gray-400"}`}
              >
                ({user.status})
              </span>
            </Activity>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
