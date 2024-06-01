import { useState } from "react";
import {
  Paper,
  Stack,
  Text,
  Box,
  Group,
  Checkbox,
  Radio,
  SimpleGrid,
  TextInput,
  Blockquote,
  NavLink,
  Switch,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../Button/RateupButtons";
import { useCreateContactMutation } from "../../backend/campaign/contacts/contacts.query";
import { ICreateContact } from "../../backend/campaign/contacts/contacts.api";
import { ContainedFileInput } from "../input/ContainedInput/ContainedInput";
import { importMethod } from "../../utils/enums";
import { showErrorToast } from "../../utils/notifications";
import { getHotkeyHandler } from "@mantine/hooks";
import { SAVE_HOTKEY } from "../../utils/constants";
import PhoneInputWithCountrySelect, {
  isValidPhoneNumber,
} from "react-phone-number-input";
import "react-phone-number-input/style.css";
import styles from "./contact.module.css";
import { IconDownload, IconInfoCircle } from "@tabler/icons-react";
import { getFileUrlFromKey } from "../../utils/file-upload/upload";

export interface ImportContact {
  name: string;
  phone?: string;
  email?: string;
}

const CreateContactModal = ({
  contactClose,
  close,
  cTags = [],
  importCSVContactMutation,
}) => {
  const [csvfile, setCsvfile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const createContactMutation = useCreateContactMutation();
  const form = useForm({
    initialValues: {
      name: "",
      phone: "",
      source: importMethod.MANUAL,
      contactType: cTags ?? [],
      countryCode: "91",
      tags: {},
      updateExisting: false,
    },
    validate: {
      phone: (value, values) => {
        if (values.source == importMethod.MANUAL)
          return !value
            ? "Phone Number cannot be blank"
            : !isValidPhoneNumber(value)
              ? "Invalid phone number"
              : null;
      },
      name: (value, values) =>
        values.source == importMethod.MANUAL &&
        (value.length ? null : "Name cannot be blank"),
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
      formData.append("file", csvfile);
      formData.append("update", form.getValues().updateExisting?.toString());
      for await (const item of form.getValues().contactType) {
        formData.append(
          `tags[${form.getValues().contactType.indexOf(item)}]`,
          item,
        );
      }
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
        phone: form.getValues().phone.slice(1),
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
              label="Import Contacts"
              key={form.key("source")}
              {...form.getInputProps("source")}
            >
              <Group>
                <Radio value={importMethod.MANUAL} label="Manual" />
                <Radio value={importMethod.CSV} label="Import CSV/XLSX" />
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
                label="Name"
                placeholder="Enter name"
                radius={"md"}
                size="md"
                required
                key={form.key("name")}
                {...form.getInputProps("name")}
              />
              <Stack gap={0}>
                <Group gap={3}>
                  <Text>Phone Number</Text>
                  <Text c="red">*</Text>
                </Group>
                <PhoneInputWithCountrySelect
                  defaultCountry="IN"
                  international
                  countryCallingCodeEditable={false}
                  placeholder="Enter phone number"
                  className={styles.inputPhone}
                  key={form.key("phone")}
                  {...form.getInputProps("phone")}
                />
                <Text size="sm" c={"red"}>
                  {form?.errors?.phone}
                </Text>
              </Stack>

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
                Utilizing CSV/XLSX file uploads to generate contact requires
                specific fields in the file: name, phone
                <NavLink
                  href={getFileUrlFromKey("/File/contact/demo.csv", false)}
                  label="Download Demo Csv File"
                  leftSection={<IconDownload size="1rem" stroke={1.5} />}
                  download
                  active
                  style={{ borderRadius: "4px" }}
                  target="_blank"
                />
              </Blockquote>
              <Switch
                mx={"lg"}
                label="Update the existing data while importing"
                key={form.key("updateExisting")}
                {...form.getInputProps("updateExisting")}
              />
              <ContainedFileInput
                mx={"lg"}
                label=""
                placeholder="Upload a csv file (.csv) or excel file (.xlsx)"
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
                  ? "Add Contact"
                  : "Import Contacts"
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
