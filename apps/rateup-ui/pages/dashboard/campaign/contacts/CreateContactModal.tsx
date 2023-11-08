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
import CSVReader from "../../../../components/Promotion/CSVReader";
import { useCreateContactMutation } from "../../../../backend/campaign/contacts/contacts.query";
import { notifications } from "@mantine/notifications";
import { IconCheck } from "@tabler/icons-react";
import { ICreateContact } from "../../../../backend/campaign/contacts/contacts.api";

const CreateContactModal = ({ contactClose, close }) => {
  const [contactType, setContactType] = useState<string[]>(["phone", "email"]);
  const [csvData, setCsvData] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [upload, setUpload] = useState(null);

  const form = useForm({
    initialValues: {
      name: "",
      phone: "",
      email: "",
      teamId: null,
      importMethod: "manual",
      contactType: ["phone", "email"],
    },
    validate: {
      phone: (value) =>
        contactType.includes("phone") &&
        (value.length !== 10
          ? "Must contain 10 numbers"
          : !/^\d+$/.test(value)
          ? "Must contain only numbers"
          : null),
      name: (value) => (value.length ? null : "Cannot be empty"),
      teamId: (value) => (value ? null : "Must select a team"),
      email: (value) =>
        contactType.includes("email") && !/^\S+@\S+$/.test(value)
          ? "Invalid email"
          : null,
      contactType: (value) =>
        !value.length ? "Must select any one: phone or email" : null,
    },
  });

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

  useEffect(() => {
    if (form?.values) {
      form.values.contactType = contactType;
    }
  }, [contactType]);

  const handleSubmit = () => {
    const validation = form.validate();
    if (validation.hasErrors) {
      if (validation.errors.contactType) {
        notifications.show({
          id: "show-error",
          title: "Failed",
          message: validation.errors.contactType,
          color: "red",
          icon: <IconCheck size={"1rem"}></IconCheck>,
          autoClose: 3000,
        });
      }
      return;
    }
    setIsCreating(true);
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
                <Radio value="manual" label="Manual" />
                <Radio value="csv" label="Import CSV" />
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
          {form.values.importMethod == "manual" && (
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
          {form.values.importMethod == "csv" && (
            <Stack>
              <CSVReader setCsvData={setCsvData}></CSVReader>
              {upload && <Progress value={upload}></Progress>}
            </Stack>
          )}

          <Group justify="flex-end">
            <RateupButtonSecondary
              title="cancel"
              onClick={contactClose}
            ></RateupButtonSecondary>
            <RateupButtonBlue
              title="Add Customer"
              type="button"
              loading={isCreating}
              onClick={handleSubmit}
            ></RateupButtonBlue>
          </Group>
        </Stack>
      </form>
    </Box>
  );
};
export default CreateContactModal;
