import {
  Box,
  Checkbox,
  Flex,
  Group,
  Paper,
  Radio,
  SimpleGrid,
  Stack,
  TextInput,
  Text,
  Center,
} from "@mantine/core";
import {
  RateupButtonSecondary,
  RateupButtonBlue,
} from "../../../../../components/Button/RateupButtons";
import CSVReader from "../../../../../components/Promotion/CSVReader";
import { TeamSelector } from "../../../../../components/input/TeamSelector";
import { useState } from "react";
import { useForm } from "@mantine/form";
import { IconSearch } from "@tabler/icons-react";

const AddCustomerModal = () => {
  const [selectedTeamID, setSelectedTeamID] = useState("");
  const [value, setValue] = useState<string[]>(["phone", "email"]);
  const [importMethod, setImportMethod] = useState("manual");
  const [csvData, setCsvData] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const form = useForm({});
  const handleSubmit = () => {};
  return (
    <Box p="0">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <Center my="md">
            <TextInput
              leftSection={<IconSearch size="1.1rem" stroke={1.5} />}
              radius="xl"
              size="md"
              placeholder={"Search Customer"}
              rightSectionWidth={60}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.currentTarget.value)}
              w={500}
            />
          </Center>

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
                  <Checkbox value="phone" label="Phone" checked />
                  <Checkbox value="email" label="Email" checked />
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
              onClick={close}
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

export default AddCustomerModal;
