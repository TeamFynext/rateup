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
  Progress,
} from "@mantine/core";
import { useEffect, useState } from "react";
import { useForm } from "@mantine/form";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../Button/RateupButtons";
import {
  useCreateContactMutation,
  useImportContactMutation,
} from "../../backend/campaign/contacts/contacts.query";
import { ICreateContact } from "../../backend/campaign/contacts/contacts.api";
import { ContainedFileInput } from "../input/ContainedInput/ContainedInput";
import Papa from "papaparse";
import { importMethod } from "../../utils/enums";
import { showErrorToast } from "../../utils/notifications";
import { getHotkeyHandler } from "@mantine/hooks";
import { SAVE_HOTKEY, emailPattern } from "../../utils/constants";
import PhoneInputWithCountrySelect, {
  isValidPhoneNumber,
} from "react-phone-number-input";
import "react-phone-number-input/style.css";
import styles from "./contact.module.css";

export interface ImportContact {
  name: string;
  phone?: string;
  email?: string;
}

const CreateContactModal = ({ contactClose, close }) => {
  const [contactType, setContactType] = useState<string[]>(["phone"]);
  const [csvfile, setCsvfile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpload, setIsUpload] = useState(false);
  const [csvData, setCsvData] = useState<ImportContact[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const form = useForm({
    initialValues: {
      name: "",
      phone: "",
      email: "",
      importMethod: importMethod.MANUAL,
      contactType: ["phone"],
      countryCode: "91",
    },
    validate: {
      phone: (value) => {
        if (
          form.values.importMethod == importMethod.MANUAL &&
          contactType.includes("phone")
        )
          return !value
            ? "Phone Number cannot be blank"
            : !isValidPhoneNumber(value)
              ? "Invalid phone number"
              : null;
      },
      name: (value) =>
        form.values.importMethod == importMethod.MANUAL &&
        (value.length ? null : "Name cannot be blank"),
      email: (value) => {
        if (
          form.values.importMethod == importMethod.MANUAL &&
          contactType.includes("email")
        )
          return !value
            ? "Email cannot be blank"
            : !emailPattern.test(value)
              ? "Invalid email"
              : null;
      },
      contactType: (value) =>
        !value.length ? "Must select any one: phone or email" : null,
    },
  });

  useEffect(() => {
    if (csvfile == null) return;

    setIsUpload(true);
    Papa.parse(csvfile, {
      header: true,
      skipEmptyLines: true,
      complete: function (results) {
        setCsvData(results?.data as ImportContact[]);
        setIsUpload(false);
      },
    });
  }, [csvfile]);

  const createContactMutation = useCreateContactMutation();

  const importContactMutation = useImportContactMutation();

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
      let isValid: boolean = true;
      csvData?.every(function (contact, index) {
        if (contactType.includes("phone") && !/^\d+$/.test(contact?.phone)) {
          showErrorToast("Failed to import: file contain invalid phone number");
          isValid = false;
          return false;
        }
        if (
          contactType.includes("email") &&
          !/^\S+@\S+$/.test(contact?.email)
        ) {
          showErrorToast("Failed to import: file contain invalid Email");
          isValid = false;
          return false;
        }
        return true;
      });
      if (!isValid) {
        setCsvfile(null);
        return;
      }
      let dataToUpload = csvData?.map(({ name, email, phone }) => ({
        teamId: form.values.teamId,
        email: !email ? undefined : email,
        phone: !phone ? undefined : phone,
        name: name,
        source: importMethod.CSV,
      }));
      importContactMutation.mutate(dataToUpload, {
        onSuccess: () => {
          setIsCreating(false);
          contactClose();
          close();
        },
        onError: () => {
          setIsCreating(false);
          form.reset();
          form.setFieldValue("importMethod", importMethod.CSV);
        },
      });
    } else {
      let contactData: ICreateContact = {
        name: form.values.name,
        phone: contactType.includes("phone")
          ? form.values.phone.slice(1)
          : undefined,
        teamId: form.values.teamId,
        email: contactType.includes("email") ? form.values.email : undefined,
        source: importMethod.MANUAL,
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
                <Radio value={importMethod.CSV} label="Import CSV" />
              </Group>
            </Radio.Group>

            <Paper shadow="xl" p="md" px="xl">
              <Checkbox.Group value={contactType} onChange={setContactType}>
                <Group>
                  <Checkbox value="phone" label="Phone" />
                  <Checkbox value="email" label="Email" />
                </Group>
              </Checkbox.Group>
            </Paper>
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
              {contactType.includes("phone") && (
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
              )}
              {contactType.includes("email") && (
                <TextInput
                  label="Email"
                  placeholder="Enter email id"
                  {...form.getInputProps("email")}
                  required
                  radius={"md"}
                  size="md"
                />
              )}
            </SimpleGrid>
          )}
          {form.values.importMethod == importMethod.CSV && (
            <Stack>
              <ContainedFileInput
                mx={"lg"}
                label=""
                placeholder="Upload a csv file (.csv)"
                accept=".csv"
                multiple={false}
                onChange={setCsvfile}
                styles={{
                  input: {
                    border: ".125rem dashed lightgrey",
                    height: "3.75rem",
                    textAlign: "center",
                  },
                }}
              ></ContainedFileInput>
              {isUpload && <Progress value={uploadProgress}></Progress>}
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
              disabled={isUpload}
            ></RateupButtonBlue>
          </Group>
        </Stack>
      </form>
    </Box>
  );
};
export default CreateContactModal;
