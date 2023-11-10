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
  Flex,
  Progress,
} from "@mantine/core";
import { TeamSelector } from "../../../../components/input/TeamSelector";
import { useEffect, useState } from "react";
import { useForm } from "@mantine/form";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../../../../components/Button/RateupButtons";
import {
  useCreateContactMutation,
  useImportContactMutation,
} from "../../../../backend/campaign/contacts/contacts.query";
import { ICreateContact } from "../../../../backend/campaign/contacts/contacts.api";
import { ContainedFileInput } from "../../../../components/input/ContainedInput/ContainedInput";
import Papa from "papaparse";
import { importMethod } from "../../../../utils/enums";
import { showErrorToast } from "../../../../utils/notifications";

export interface ImportContact {
  name: string;
  phone?: string;
  email?: string;
}

const CreateContactModal = ({ contactClose, close }) => {
  const [contactType, setContactType] = useState<string[]>(["phone", "email"]);
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
      teamId: null,
      importMethod: importMethod.MANUAL,
      contactType: ["phone", "email"],
    },
    validate: {
      phone: (value) =>
        form.values.importMethod == importMethod.MANUAL &&
        contactType.includes("phone") &&
        (value.length !== 10
          ? "Must contain 10 numbers"
          : !/^\d+$/.test(value)
          ? "Must contain only numbers"
          : null),
      name: (value) =>
        form.values.importMethod == importMethod.MANUAL &&
        (value.length ? null : "Cannot be empty"),
      teamId: (value) => (value ? null : "Must select a team"),
      email: (value) =>
        form.values.importMethod == importMethod.MANUAL &&
        contactType.includes("email") &&
        !/^\S+@\S+$/.test(value)
          ? "Invalid email"
          : null,
      contactType: (value) =>
        !value.length ? "Must select any one: phone or email" : null,
    },
  });

  useEffect(() => {
    console.log("csvdata", csvfile);
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

  const createContactMutation = useCreateContactMutation(
    () => {
      setIsCreating(false);
      contactClose();
      close();
      form.reset();
    },
    () => {
      setIsCreating(false);
      form.reset();
    },
  );

  const importContactMutation = useImportContactMutation(
    () => {
      setIsCreating(false);
      contactClose();
      close();
    },
    () => {
      setIsCreating(false);
      form.reset();
      form.setFieldValue("importMethod", importMethod.CSV);
    },
  );

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
        console.log("contact?.phone", contact?.phone);
        if (
          contactType.includes("phone") &&
          contact?.phone.length != 10 &&
          !/^\d+$/.test(contact?.phone)
        ) {
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
      }));
      importContactMutation.mutate(dataToUpload);
    } else {
      let contactData: ICreateContact = form.values;
      if (!contactType.includes("email")) {
        contactData = {
          name: form.values.name,
          phone: form.values.phone,
          teamId: form.values.teamId,
        };
      }
      if (!contactType.includes("phone")) {
        contactData = {
          name: form.values.name,
          email: form.values.email,
          teamId: form.values.teamId,
        };
      }
      createContactMutation.mutate(contactData);
    }
  };
  return (
    <Box p="0">
      <form onSubmit={handleSubmit}>
        <Stack>
          <Text>Select Team</Text>
          <Flex justify={"flex-start"}>
            <TeamSelector
              value={form.values.teamId}
              onChange={(value) => form.setFieldValue("teamId", value)}
            ></TeamSelector>
          </Flex>

          <Group justify="space-between">
            <Radio.Group
              value={form.values.importMethod}
              onChange={(value) => form.setFieldValue("importMethod", value)}
              name="importMethod"
              label="Import Customers"
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
                placeholder="Enter customer name"
                {...form.getInputProps("name")}
                radius={"md"}
                size="md"
                required
              />
              {contactType.includes("phone") && (
                <TextInput
                  label="Phone Number"
                  placeholder="Enter phone number"
                  {...form.getInputProps("phone")}
                  required
                  radius={"md"}
                  size="md"
                />
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
                    border: "2px dashed lightgrey",
                    height: "60px",
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
                  ? "Add Customer"
                  : "Import Customers"
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
