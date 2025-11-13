"use client";

import { useEffect, useState } from "react";

import {
  Blockquote,
  Box,
  Checkbox,
  Group,
  NavLink,
  NumberInput,
  Paper,
  Radio,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { getHotkeyHandler } from "@mantine/hooks";
import { IconDownload, IconInfoCircle } from "@tabler/icons-react";
import PhoneInputWithCountrySelect, {
  isValidPhoneNumber,
} from "react-phone-number-input";

import { ICreateContact } from "@/backend/campaign/contacts/contacts.api";
import {
  useContactLabels,
  useCreateContactMutation,
  useEditContactMutation,
} from "@/backend/campaign/contacts/contacts.query";
import { SAVE_HOTKEY } from "@/utils/constants";
import { importMethod } from "@/utils/enums";
import { getFileUrlFromKey } from "@/utils/file-upload/upload";
import { showErrorToast } from "@/utils/notifications";

import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../Button/RateupButtons";
import {
  ContainedFileInput,
  ContainedMultiSelect,
} from "../input/ContainedInput/ContainedInput";

import "react-phone-number-input/style.css";

import { DatePickerInput } from "@mantine/dates";
import { useTranslations } from "next-intl";

import { ContactGroupType } from "@/types/enums";
import { useCustomFieldsContext } from "@/context/CustomFieldsContext";

import styles from "./contact.module.css";

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
        showErrorToast(validation.errors.contactType as string);
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
              setIsCreating(false);
              contactClose();
              close();
              form.reset();
            },
            onError: () => {
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

export const ContactForm = ({ form, customFields, type }) => {
  const translations = useTranslations();
  const { data: labels = [], isPending } = useContactLabels();

  const getCustomFieldValue = (fieldId) => {
    const customField = form
      .getValues()
      .customFields.find((cf) => cf.slug === fieldId);
    return customField?.value || "";
  };

  const updateCustomField = (fieldId, value, customFieldData) => {
    const currentCustomFields = form.getValues().customFields;
    const existingIndex = currentCustomFields.findIndex(
      (cf) => cf.fieldId === fieldId,
    );

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
      radius: "md",
      size: "md",
      key: `customField-${fieldId}`,
      required: customField.required,
      error: fieldError,
    };

    switch (customField.type) {
      case "email":
        return (
          <TextInput
            {...commonProps}
            type="email"
            defaultValue={fieldValue}
            onChange={(event) => {
              updateCustomField(
                fieldId,
                event.currentTarget.value,
                customField,
              );
            }}
          />
        );

      case "number":
        return (
          <NumberInput
            {...commonProps}
            defaultValue={fieldValue ? Number(fieldValue) : ""}
            onChange={(value) => {
              updateCustomField(fieldId, value?.toString() || "", customField);
            }}
          />
        );

      case "multivalue":
        const options =
          customField?.listValues?.map((option) => ({
            value: option,
            label: option,
          })) || [];

        return (
          <Select
            {...commonProps}
            data={options}
            defaultValue={fieldValue}
            onChange={(value) => {
              updateCustomField(fieldId, value || "", customField);
            }}
            searchable
            clearable
          />
        );

      case "text":
      default:
        return (
          <TextInput
            {...commonProps}
            defaultValue={fieldValue}
            onChange={(event) => {
              updateCustomField(
                fieldId,
                event.currentTarget.value,
                customField,
              );
            }}
          />
        );
    }
  };
  if (isPending) return <div>Loading...</div>;

  return (
    <SimpleGrid cols={2}>
      <TextInput
        label={translations("Name")}
        placeholder={translations("Enter name")}
        radius={"md"}
        size="md"
        required
        key={form.key("name")}
        {...form.getInputProps("name")}
      />
      <Stack gap={0}>
        <Group gap={3}>
          <Text>{translations("Phone Number")}</Text>
          <Text c="red">*</Text>
        </Group>
        <Box
          className={`${styles["phone-input-container"]} ${form?.errors?.phone ? styles["phone-input-error"] : ""}`}
        >
          <PhoneInputWithCountrySelect
            defaultCountry="IN"
            international
            countryCallingCodeEditable={false}
            placeholder={translations("Enter phone number")}
            value={form.values.phone ?? ""}
            {...form.getInputProps("phone")}
            className={styles.inputPhone}
          />
          <Text size="sm" c={"red"}>
            {form?.errors?.phone}
          </Text>
        </Box>
      </Stack>
      <ContainedMultiSelect
        label={translations("Labels")}
        placeholder={translations("Select labels")}
        data={labels?.map((label) => ({
          value: label.id,
          label: label.name,
        }))}
        key={form.key("labels")}
        {...form.getInputProps("labels")}
      />
      {type === ContactGroupType.LOYALTY && (
        <>
          <TextInput
            label={translations("email")}
            placeholder={translations("Enter the email")}
            radius={"md"}
            size="md"
            type="email"
            {...form.getInputProps("email")}
          />
          <DatePickerInput
            label={translations("dob")}
            placeholder={translations("Enter the dob")}
            radius={"md"}
            size="md"
            maxDate={new Date()}
            {...form.getInputProps("dob")}
          />
          <TextInput
            label={translations("External ID")}
            placeholder={translations("Enter External ID")}
            radius={"md"}
            size="md"
            {...form.getInputProps("external_id")}
          />
        </>
      )}
      {form
        .getValues()
        .contactType?.map((fieldId) => renderCustomField(fieldId))}
    </SimpleGrid>
  );
};
