import { useEffect, useState } from "react";

import {
  Blockquote,
  Box,
  Checkbox,
  Group,
  NavLink,
  Paper,
  Radio,
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
import { useCreateContactMutation } from "@/backend/campaign/contacts/contacts.query";
import { SAVE_HOTKEY } from "@/utils/constants";
import { importMethod } from "@/utils/enums";
import { getFileUrlFromKey } from "@/utils/file-upload/upload";
import { showErrorToast } from "@/utils/notifications";

import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../Button/RateupButtons";
import { ContainedFileInput } from "../input/ContainedInput/ContainedInput";

import "react-phone-number-input/style.css";

import { DatePickerInput } from "@mantine/dates";
import { useTranslations } from "next-intl";

import { ContactGroupType } from "@/types/enums";

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
  cTags = [],
  importCSVContactMutation,
  type = ContactGroupType.NORMAL,
  initialValues = null,
}) => {
  const [csvfile, setCsvfile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const createContactMutation = useCreateContactMutation();
  const translations = useTranslations();
  const form = useForm({
    mode: "uncontrolled",
    initialValues: initialValues ?? {
      name: "",
      phone: "",
      email: "",
      dob: null,
      source: importMethod.MANUAL,
      contactType: cTags ?? [],
      countryCode: "91",
      tags: {},
      updateExisting: false,
      external_id: "",
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
    if (form.getValues().source == importMethod.CSV) {
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
      const result = {};
      for await (const key of form.getValues().contactType) {
        if (form.getValues()?.tags?.hasOwnProperty(key)) {
          result[key] = form.getValues()?.tags?.[key];
        }
      }
      form.getValues().tags = result;
      let contactData: ICreateContact = {
        ...form.getValues(),
        external_id: form.values.external_id.length
          ? form.values.external_id
          : undefined,
        phone: form.getValues().phone.slice(1),
        source:
          type === ContactGroupType.LOYALTY
            ? ContactGroupType.LOYALTY
            : form.getValues().source,
      };
      createContactMutation.mutate(contactData, {
        onSuccess: () => {
          setIsCreating(false);
          contactClose();
          close();
          form.reset();
        },
        onError: () => {
          setIsCreating(false);
          form.reset();
        },
      });
    }
  };

  useEffect(() => {
    if (initialValues) {
      form.setValues(initialValues);
    }
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

            {cTags?.length > 0 && (
              <Paper shadow="xl" p="md" px="xl">
                <Checkbox.Group
                  key={form.key("contactType")}
                  {...form.getInputProps("contactType")}
                >
                  <Group>
                    {cTags?.map((data) => (
                      <Checkbox
                        value={data}
                        label={data}
                        key={data}
                        tt={"capitalize"}
                      />
                    ))}
                  </Group>
                </Checkbox.Group>
              </Paper>
            )}
          </Group>
          {form.getValues().source == importMethod.MANUAL && (
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
                    value={form.values.phone}
                    {...form.getInputProps("phone")}
                    className={styles.inputPhone}
                  />
                  <Text size="sm" c={"red"}>
                    {form?.errors?.phone}
                  </Text>
                </Box>
              </Stack>
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
                .contactType?.map(
                  (data) =>
                    data !== "phone" && (
                      <TextInput
                        label={data}
                        placeholder={`Enter ${data}`}
                        radius={"md"}
                        size="md"
                        key={form.key(`tags.${data}`)}
                        {...form.getInputProps(`tags.${data}`)}
                      />
                    ),
                )}
            </SimpleGrid>
          )}
          {form.getValues().source == importMethod.CSV && (
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
                  "Upload a csv file (.csv) or excel file (.xlsx)",
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
                form.getValues().source == importMethod.MANUAL
                  ? translations("Add Contact")
                  : translations("Import Contacts")
              }
              type="button"
              loading={isCreating}
              onClick={handleSubmit}
              disabled={form.getValues().source == importMethod.CSV && !csvfile}
            />
          </Group>
        </Stack>
      </form>
    </Box>
  );
};
export default CreateContactModal;
