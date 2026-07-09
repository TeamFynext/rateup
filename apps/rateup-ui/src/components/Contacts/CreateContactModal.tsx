import { useForm } from "@mantine/form";
import { getHotkeyHandler } from "@mantine/hooks";
import { Download, Info, User } from "lucide-react";
import { Activity, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { isValidPhoneNumber } from "react-phone-number-input";
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

import { ContainedFileInput } from "../input/ContainedInput/ContainedInput.tsx";
import { Button } from "../ui/button.tsx";
import { Card } from "../ui/card.tsx";
import { Checkbox } from "../ui/checkbox.tsx";
import { Label } from "../ui/label.tsx";
import { MultiSelect } from "../ui/multi-select.tsx";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select.tsx";
import { Skeleton } from "../ui/skeleton.tsx";
import { Spinner } from "../ui/spinner.tsx";
import { Switch } from "../ui/switch.tsx";
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
  const [isCreating, setIsCreating] = useState(false);
  const createContactMutation = useCreateContactMutation();
  const editContactMutation = useEditContactMutation(null);

  const { t: translations } = useTranslation();
  const { customFields } = useCustomFieldsContext();

  const form = useForm({
    initialValues: initialValues ?? {
      name: "",
      phone: "",
      email: "",
      dob: null,
      source: importMethod.MANUAL,
      contactType: [],
      countryCode: "91",
      customFields: [],
      updateExisting: false,
      hasHeaderRow: true,
      external_id: "",
      labels: [],
    },
    validate: {
      phone: (value, values) => {
        if (values.source == importMethod.MANUAL)
          return !value
            ? translations("Phone Number cannot be blank")
            : !isValidPhoneNumber(value)
              ? translations("Invalid phone number")
              : null;
      },
      name: (value, values) =>
        values.source == importMethod.MANUAL &&
        (value.length ? null : translations("Name cannot be blank")),
      customFields: {
        "*": (value, _values, path) => {
          const fieldId = path.split(".")[1];
          const customField = customFields.find((field) => field.slug === fieldId);

          if (!customField) return null;

          if (value && customField.type === "email") {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
              return translations("Invalid email format.");
            }
          }

          if (value && customField.type === "number") {
            if (isNaN(Number(value))) {
              return translations("Must be a valid number");
            }
          }

          return null;
        },
      },
    },
  });
  const handleSubmit = async () => {
    const validation = form.validate();
    if (validation.hasErrors) {
      if (validation.errors.contactType) {
        toast.error(validation.errors.contactType as string);
      }
      return;
    }
    setIsCreating(true);
    if (form.getValues().source == importMethod.CSV && !initialValues) {
      if (!csvfile) return;
      const formData = new FormData();
      formData.append("update", form.getValues().updateExisting?.toString());
      formData.append("hasHeaderRow", form.getValues().hasHeaderRow?.toString() ?? "true");
      const contactTypes = form.getValues().contactType;
      contactTypes.forEach((item, index) => {
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
    } else {
      const contactData = {
        ...form.getValues(),
        dob: form.getValues()?.dob ? new Date(form.getValues().dob).toISOString() : null,
        external_id: form.getValues()?.external_id || undefined,
        phone: form.getValues()?.phone?.replace(/^\+/, "") || "",
        source:
          type === ContactGroupType.LOYALTY ? ContactGroupType.LOYALTY : form.getValues().source,
        lastReceivedMessageTimeStamp: undefined,
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
            onError: () => {
              setIsCreating(false);
            },
          },
        );
      } else {
        if (createNewContactMutation) {
          createNewContactMutation.mutate([contactData], {
            onSuccess: () => {
              setIsCreating(false);
              contactClose();
              close();
              form.reset();
            },
            onError: () => {
              setIsCreating(false);
            },
          });
        } else {
          createContactMutation.mutate(contactData, {
            onSuccess: () => {
              toast.success("Contact created successfully.", {
                id: "contact-create",
              });
              setIsCreating(false);
              contactClose();
              close();
              form.reset();
            },
            onError: (error) => {
              toast.error(error?.message || `Error creating the contact`, {
                id: "contact-create",
              });
              setIsCreating(false);
            },
          });
        }
      }
    }
  };

  useEffect(() => {
    if (initialValues) {
      form.setValues(initialValues);
      form.setFieldValue("phone", "+" + initialValues.phone);
    }
    form.setFieldValue("contactType", customFields?.map((field) => field.slug) || []);
  }, [initialValues]);

  const sourceValue = form.getValues().source;
  const contactTypeValue: string[] = form.getValues().contactType ?? [];

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        onKeyDown={getHotkeyHandler([[SAVE_HOTKEY, handleSubmit]])}
        onReset={form.reset}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            {initialValues ? null : (
              <div className="flex flex-col gap-2">
                <Label>{translations("Import Contacts")}</Label>
                <RadioGroup
                  value={sourceValue}
                  onValueChange={(value) => form.setFieldValue("source", value)}
                  className="flex flex-row items-center gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value={importMethod.MANUAL} id="import-manual" />
                    <Label htmlFor="import-manual" className="font-normal">
                      {translations("Manual")}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value={importMethod.CSV} id="import-csv" />
                    <Label htmlFor="import-csv" className="font-normal">
                      {translations("Import CSV/XLSX")}
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {customFields?.length > 0 && (
              <Card className="flex flex-row flex-wrap items-center gap-4 p-2">
                {customFields?.map((data) => {
                  const checked = contactTypeValue.includes(data?.slug);
                  return (
                    <div className="flex items-center gap-2" key={data?.id}>
                      <Checkbox
                        id={`contact-type-${data?.slug}`}
                        checked={checked}
                        onCheckedChange={(value) => {
                          form.setFieldValue(
                            "contactType",
                            value
                              ? [...contactTypeValue, data?.slug]
                              : contactTypeValue.filter((slug) => slug !== data?.slug),
                          );
                        }}
                      />
                      <Label
                        htmlFor={`contact-type-${data?.slug}`}
                        className="font-normal capitalize"
                      >
                        {data?.name}
                      </Label>
                    </div>
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
                <Info className="mt-0.5 size-5 shrink-0 text-rateup-blue" />
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
                    className="flex w-fit items-center gap-1 rounded-sm text-rateup-blue underline underline-offset-2"
                  >
                    <Download className="size-4" />
                    {translations("Download Demo Csv File")}
                  </a>
                </div>
              </blockquote>
              <div className="mx-6 flex items-center gap-2">
                <Switch
                  id="update-existing"
                  checked={form.getValues().updateExisting}
                  onCheckedChange={(value) => form.setFieldValue("updateExisting", value)}
                />
                <Label htmlFor="update-existing" className="font-normal">
                  {translations("Update the existing data while importing")}
                </Label>
              </div>
              <div className="mx-6 flex items-center gap-2">
                <Switch
                  id="has-header-row"
                  checked={form.getValues().hasHeaderRow}
                  onCheckedChange={(value) => form.setFieldValue("hasHeaderRow", value)}
                />
                <Label htmlFor="has-header-row" className="font-normal">
                  {translations("First row contains column headers (name, phone, ...)")}
                </Label>
              </div>
              <ContainedFileInput
                mx={"lg"}
                label=""
                placeholder={translations(
                  "Upload a csv file (.csv), excel file (.xlsx) or opendocument file (.ods)",
                )}
                accept=".csv,.xlsx,.ods"
                multiple={false}
                onChange={setCsvfile}
                styles={{
                  input: {
                    border: ".125rem dashed lightgrey",
                    height: "3.75rem",
                    textAlign: "center",
                  },
                }}
              />
            </div>
          )}

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
  function onValueChange(value) {
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
