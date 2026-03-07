"use client";

import { Activity, useEffect, useState } from "react";

import {
  Blockquote,
  Box,
  Checkbox,
  Group,
  Select as MantineSelect,
  NavLink,
  Paper,
  Radio,
  Stack,
  Switch,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { getHotkeyHandler } from "@mantine/hooks";
import {
  IconCheck,
  IconDownload,
  IconInfoCircle,
  IconX,
} from "@tabler/icons-react";
import { ChevronDownIcon, User } from "lucide-react";
import { useTranslations } from "next-intl";
import PhoneInputWithCountrySelect, {
  isValidPhoneNumber,
} from "react-phone-number-input";
import { toast } from "sonner";

import { ContactGroupType } from "@/types/enums";
import { ICreateContact } from "@/backend/campaign/contacts/contacts.api";
import {
  useContactLabels,
  useCreateContactMutation,
  useEditContactMutation,
} from "@/backend/campaign/contacts/contacts.query";
import { useTeamsMembersOfOrg } from "@/backend/org/org.query";
import { useCustomFieldsContext } from "@/context/CustomFieldsContext";
import { SAVE_HOTKEY } from "@/utils/constants";
import { importMethod } from "@/utils/enums";
import { getFileUrlFromKey } from "@/utils/file-upload/upload";

import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../Button/RateupButtons";
import {
  ContainedFileInput,
  ContainedMultiSelect,
} from "../input/ContainedInput/ContainedInput";
import PhoneInputWithCountry from "../input/PhoneInputWithCountry";
import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import { Card } from "../ui/card";
import { Field, FieldError, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { MultiSelect } from "../ui/multi-select";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Skeleton } from "../ui/skeleton";
import { Textarea } from "../ui/textarea";
import AssignUser from "../whatsapp/inbox/chatdisplay/chatdisplayHeader/AssignUser";
import styles from "./contact.module.css";
import ContactForm from "./ContactForm";
import ContactGroupSelector from "./ContactGroupSelector";
import { LifecycleSelector } from "./LifecycleSelector";

export interface ImportContact {
  name: string;
  phone?: string;
  email?: string;
  type?: ContactGroupType;
}

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

  const translations = useTranslations();
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
        "*": (value, values, path) => {
          const fieldId = path.split(".")[1];
          const customField = customFields.find(
            (field) => field.slug === fieldId,
          );

          if (!customField) return null;

          if (value && customField.type === "email") {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
              return translations("Invalid email format");
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
      let contactData = {
        ...form.getValues(),
        dob: form.getValues()?.dob
          ? new Date(form.getValues().dob).toISOString()
          : null,
        external_id: form.getValues()?.external_id || undefined,
        phone: form.getValues()?.phone?.replace(/^\+/, "") || "",
        source:
          type === ContactGroupType.LOYALTY
            ? ContactGroupType.LOYALTY
            : form.getValues().source,
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
    form.setFieldValue(
      "contactType",
      customFields?.map((field) => field.slug) || [],
    );
  }, [initialValues]);

  return (
    <Box p="0">
      <form
        onSubmit={handleSubmit}
        onKeyDown={getHotkeyHandler([[SAVE_HOTKEY, handleSubmit]])}
        onReset={form.reset}
      >
        <Stack>
          <Group justify="space-between">
            {initialValues ? null : (
              <Radio.Group
                name="importMethod"
                label={translations("Import Contacts")}
                key={form.key("source")}
                {...form.getInputProps("source")}
              >
                <Group>
                  <Radio
                    value={importMethod.MANUAL}
                    label={translations("Manual")}
                  />
                  <Radio
                    value={importMethod.CSV}
                    label={translations("Import CSV/XLSX")}
                  />
                </Group>
              </Radio.Group>
            )}

            {customFields?.length > 0 && (
              <Paper p="xs" withBorder>
                <Checkbox.Group
                  key={form.key("contactType")}
                  {...form.getInputProps("contactType")}
                >
                  <Group>
                    {customFields?.map((data) => (
                      <Checkbox
                        value={data?.slug}
                        label={data?.name}
                        key={data?.id}
                        tt={"capitalize"}
                      />
                    ))}
                  </Group>
                </Checkbox.Group>
              </Paper>
            )}
          </Group>
          {(form.getValues().source == importMethod.MANUAL ||
            form.getValues().source != importMethod.CSV ||
            initialValues) && (
            <ContactForm form={form} customFields={customFields} type={type} />
          )}
          {form.getValues().source == importMethod.CSV && !initialValues && (
            <Stack>
              <Blockquote
                color="blue"
                icon={<IconInfoCircle />}
                p={"sm"}
                iconSize={40}
                mx={"lg"}
              >
                {translations(
                  "Utilizing CSV/XLSX file uploads to generate contact requires specific fields in the file: name, phone",
                )}
                <NavLink
                  href={getFileUrlFromKey("/File/contact/demo.csv", false)}
                  label={translations("Download Demo Csv File")}
                  leftSection={<IconDownload size="1rem" stroke={1.5} />}
                  download
                  active
                  style={{ borderRadius: "4px" }}
                  target="_blank"
                />
              </Blockquote>
              <Switch
                mx={"lg"}
                label={translations("Update the existing data while importing")}
                key={form.key("updateExisting")}
                {...form.getInputProps("updateExisting")}
              />
              <ContainedFileInput
                mx={"lg"}
                label=""
                placeholder={translations(
                  "Upload a csv file (csv) or excel file (xlsx)",
                )}
                accept=".csv,.xlsx"
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
            </Stack>
          )}

          <Group justify="flex-end">
            <RateupButtonSecondary title="cancel" onClick={contactClose} />
            <RateupButtonBlue
              title={
                initialValues
                  ? translations("Update Contact")
                  : form.getValues().source == importMethod.MANUAL
                    ? translations("Add Contact")
                    : translations("Import Contacts")
              }
              type="button"
              loading={isCreating}
              onClick={handleSubmit}
              disabled={
                form.getValues().source == importMethod.CSV &&
                !initialValues &&
                !csvfile
              }
            />
          </Group>
        </Stack>
      </form>
    </Box>
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
    return (
      <MultiSelect
        onValueChange={onChange}
        options={users?.data?.map((user) => ({
          value: user.id,
          label: user.name,
        }))}
        className={`${className}`}
        placeholder="Select staff"
        defaultValue={value}
      />
    );
  }
  const userData = users?.data?.map((u) => ({
    id: u.id,
    name: u.name,
    status: u.status,
  }));
  if (allowAll)
    userData.unshift({ id: "all", name: "All Staff", status: "online" });
  function onValueChange(value) {
    onChange(
      value === "all" ? users.data.map((u) => u.id) : value,
      value === "all",
    );
  }
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={`${className}`}>
        <User className="w-4 h-4 mr-2 text-[#1873E8]" />
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
