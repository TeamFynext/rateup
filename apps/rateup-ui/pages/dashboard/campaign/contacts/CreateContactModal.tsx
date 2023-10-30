import {
  Paper,
  Stack,
  Center,
  Text,
  Box,
  Select,
  Group,
  Checkbox,
  Radio,
  SimpleGrid,
  TextInput,
  Flex,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconUser } from "@tabler/icons-react";
import FormModalLayout from "../../../../components/Modal/FormModalLayout";
import { TeamSelector } from "../../../../components/input/TeamSelector";
import { useEffect, useState } from "react";
import { useForm } from "@mantine/form";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../../../../components/Button/RateupButtons";
import CSVReader from "../../../../components/Promotion/CSVReader";

const CreateContactModal = ({ contactClose }) => {
  const [selectedTeamID, setSelectedTeamID] = useState("");
  const [value, setValue] = useState<string[]>(["phone", "email"]);
  const [importMethod, setImportMethod] = useState("manual");
  const [csvData, setCsvData] = useState("");

  const form = useForm();

  const handleSubmit = () => {};
  useEffect(() => {
    close();
  }, []);
  return (
    <Box p="0">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <Text>Select Team</Text>
          <Flex justify={"flex-start"}>
            <TeamSelector
              value={selectedTeamID}
              onChange={setSelectedTeamID}
            ></TeamSelector>
          </Flex>

          <Group justify="space-between">
            <Radio.Group
              value={importMethod}
              onChange={setImportMethod}
              name="importmethod"
              label="Import Customers"
            >
              <Group>
                <Radio value="manual" label="Manual" />
                <Radio value="csv" label="Import CSV" />
              </Group>
            </Radio.Group>

            <Paper shadow="xl" p="md" px="xl">
              <Checkbox.Group value={value} onChange={setValue}>
                <Group>
                  <Checkbox value="phone" label="Phone" />
                  <Checkbox value="email" label="Email" />
                </Group>
              </Checkbox.Group>
            </Paper>
          </Group>
          {importMethod == "manual" && (
            <SimpleGrid cols={2}>
              <TextInput
                label="Name"
                placeholder="Enter customer name"
                {...form.getInputProps("name")}
                radius={"md"}
                size="md"
                required
              />
              {value.includes("phone") && (
                <TextInput
                  label="Phone Number"
                  placeholder="Enter phone number"
                  {...form.getInputProps("phone")}
                  required
                  radius={"md"}
                  size="md"
                />
              )}
              {value.includes("email") && (
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
          {importMethod == "csv" && (
            <CSVReader setCsvData={setCsvData}></CSVReader>
          )}

          <Group justify="flex-end">
            <RateupButtonSecondary
              title="cancel"
              onClick={contactClose}
            ></RateupButtonSecondary>
            <RateupButtonBlue
              title="Add Customer"
              type="submit"
            ></RateupButtonBlue>
          </Group>
        </Stack>
      </form>
    </Box>
  );
};
export default CreateContactModal;
