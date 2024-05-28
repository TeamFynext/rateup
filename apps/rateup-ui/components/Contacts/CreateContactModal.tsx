import { useEffect, useState } from "react";
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
  const [contactType, setContactType] = useState<string[]>([...cTags]);
  const [csvfile, setCsvfile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const createContactMutation = useCreateContactMutation();
  const form = useForm({
    initialValues: {
      name: "",
      phone: "",
      importMethod: importMethod.MANUAL,
      contactType: [],
      countryCode: "91",
      tags: {},
    },
    validate: {
      phone: (value) => {
        if (form.values.importMethod == importMethod.MANUAL)
          return !value
            ? "Phone Number cannot be blank"
            : !isValidPhoneNumber(value)
              ? "Invalid phone number"
              : null;
      },
      name: (value) =>
        form.values.importMethod == importMethod.MANUAL &&
        (value.length ? null : "Name cannot be blank"),
    },
  });

  useEffect(() => {
    if (form?.values) {
      form.values.contactType = contactType;
    }
  }, [contactType]);

  const handleSubmit = () => {
    const validation = form.validate();
    if (validation.hasErrors) {
      if (validation.errors.contactType) {
        showErrorToast(validation.errors.contactType);
      }
      return;
    }
    setIsCreating(true);
    if (form.values.importMethod == importMethod.CSV) {
      if (!csvfile) return;
      const formData = new FormData();
      formData.append("file", csvfile);
      contactType.forEach((item, index) => {
        formData.append(`tags[${index}]`, item);
      });
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
      for (const key of contactType) {
        if (form.getValues()?.tags?.hasOwnProperty(key)) {
          result[key] = form.getValues()?.tags?.[key];
        }
      }
      form.values.tags = result;
      let contactData: ICreateContact = {
        name: form.values.name,
        phone: form.values.phone.slice(1),
        teamId: form.values.teamId,
        source: importMethod.MANUAL,
        tags: form.values.tags,
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
      >
        <Stack>
          <Group justify="space-between">
            <Radio.Group
              value={form.values.importMethod}
              onChange={(value) => form.setFieldValue("importMethod", value)}
              name="importMethod"
              label="Import Contacts"
            >
              <Group>
                <Radio value={importMethod.MANUAL} label="Manual" />
                <Radio value={importMethod.CSV} label="Import CSV/XLSX" />
              </Group>
            </Radio.Group>

            {cTags?.length > 0 && (
              <Paper shadow="xl" p="md" px="xl">
                <Checkbox.Group value={contactType} onChange={setContactType}>
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
          {form.values.importMethod == importMethod.MANUAL && (
            <SimpleGrid cols={2}>
              <TextInput
                label="Name"
                placeholder="Enter name"
                {...form.getInputProps("name")}
                radius={"md"}
                size="md"
                required
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
                  {...form.getInputProps("phone")}
                  className={styles.inputPhone}
                />
                <Text size="sm" c={"red"}>
                  {form?.errors?.phone}
                </Text>
              </Stack>

              {contactType?.map(
                (data) =>
                  data !== "phone" && (
                    <TextInput
                      label={data}
                      placeholder={`Enter ${data}`}
                      {...form.getInputProps(`tags.${data}`)}
                      radius={"md"}
                      size="md"
                      key={data}
                    />
                  ),
              )}
            </SimpleGrid>
          )}
          {form.values.importMethod == importMethod.CSV && (
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
            <RateupButtonSecondary
              title="cancel"
              onClick={contactClose}
            ></RateupButtonSecondary>
            <RateupButtonBlue
              title={
                form.values.importMethod == importMethod.MANUAL
                  ? "Add Contact"
                  : "Import Contacts"
              }
              type="button"
              loading={isCreating}
              onClick={handleSubmit}
              disabled={
                form.values.importMethod == importMethod.CSV && !csvfile
              }
            ></RateupButtonBlue>
          </Group>
        </Stack>
      </form>
    </Box>
  );
};
export default CreateContactModal;
