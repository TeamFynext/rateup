import {
  Box,
  Checkbox,
  Group,
  Paper,
  Radio,
  SimpleGrid,
  Stack,
  TextInput,
  Center,
  ScrollArea,
  Table,
} from "@mantine/core";
import {
  RateupButtonSecondary,
  RateupButtonBlue,
} from "../../../../../components/Button/RateupButtons";
import CSVReader from "../../../../../components/Promotion/CSVReader";
import { useEffect, useState } from "react";
import { useForm } from "@mantine/form";
import { IconCheck, IconSearch } from "@tabler/icons-react";
import {
  useAddExistingContactMutation,
  useAddNewContactMutation,
} from "../../../../../backend/campaign/contactGroup/contactGroup.query";
import { useCampaignContactsByTeamId } from "../../../../../backend/campaign/contacts/contacts.query";
import { contactAddType, importMethod } from "../../../../../utils/enums";
import { notifications } from "@mantine/notifications";

export interface IAddCustomer {
  name: string;
  email?: string;
  phone?: string;
}

const AddCustomerModal = ({ groupId, close, teamId }) => {
  const [contactType, setContactType] = useState<string[]>(["phone", "email"]);
  const [csvData, setCsvData] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [addType, setAddType] = useState(contactAddType.NEW);
  const [customerList, setCustomerList] = useState<string[]>([]);
  const [filteredCustomerList, setFilteredCustomerList] = useState([]);

  const {
    isLoading: isLoading,
    data: contactDataByTeamId,
    error: error,
    refetch: refetch,
  } = useCampaignContactsByTeamId(teamId) as {
    isLoading: boolean;
    data: ContactsResponse;
    error: any;
    refetch: any;
  };

  const form = useForm({
    initialValues: {
      name: "",
      phone: "",
      email: "",
      importMethod: importMethod.MANUAL,
      contactType: ["phone", "email"],
    },
    validate: {
      phone: (value) =>
        addType === contactAddType.NEW &&
        contactType.includes("phone") &&
        (value.length !== 10
          ? "Must contain 10 numbers"
          : !/^\d+$/.test(value)
          ? "Must contain only numbers"
          : null),
      name: (value) =>
        addType == contactAddType.NEW && !value.length
          ? "Cannot be empty"
          : null,
      email: (value) =>
        addType === contactAddType.NEW &&
        contactType.includes("email") &&
        !/^\S+@\S+$/.test(value)
          ? "Invalid email"
          : null,
      contactType: (value) =>
        !value.length ? "Must select any one: phone or email" : null,
    },
  });
  const createNewContactMutation = useAddNewContactMutation(
    groupId,
    () => {
      close();
      setIsCreating(false);
      form.reset();
    },
    () => {
      close();
      setIsCreating(false);
      form.reset();
    },
  );

  const addExistingContactsMutation = useAddExistingContactMutation(
    groupId,
    () => {
      setCustomerList([]);
      setIsCreating(false);
      close();
    },
    () => {
      setCustomerList([]);
      setIsCreating(false);
      close();
    },
  );

  useEffect(() => {
    form.values.contactType = contactType;
  }, [contactType]);

  useEffect(() => {
    if (!searchTerm.length && contactDataByTeamId?.data) {
      setFilteredCustomerList(contactDataByTeamId?.data);
    } else {
      if (contactDataByTeamId?.data) {
        setFilteredCustomerList(
          contactDataByTeamId?.data?.filter((contact) => {
            return (
              contact?.name
                .toLowerCase()
                .startsWith(searchTerm.toLowerCase()) ||
              contact?.phone?.startsWith(searchTerm)
            );
          }),
        );
      }
    }
  }, [searchTerm, contactDataByTeamId?.data]);

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
    if (addType == contactAddType.EXISTING) {
      addExistingContactsMutation.mutate({
        customerList: customerList,
        groupId: groupId,
      });
    } else {
      let contactData: IAddCustomer = form.values;
      if (!contactType.includes("email")) {
        contactData = {
          name: form.values.name,
          phone: form.values.phone,
        };
      }
      if (!contactType.includes("phone")) {
        contactData = {
          name: form.values.name,
          email: form.values.email,
        };
      }
      createNewContactMutation.mutate({ data: contactData, groupId: groupId });
    }
  };

  const customStyle = {
    label: {
      fontWeight: "bold",
      fontSize: "18px",
    },
  };
  const custominputstyle = {
    label: {
      fontWeight: "bold",
      fontSize: "14px",
    },
  };

  const rows = filteredCustomerList?.map((contact) => (
    <Table.Tr
      key={contact?.id}
      bg={
        customerList.includes(contact?.id)
          ? "var(--mantine-color-blue-light)"
          : undefined
      }
    >
      <Table.Td>
        <Checkbox
          aria-label="Select row"
          checked={customerList?.includes(contact?.id)}
          onChange={(event) =>
            setCustomerList(
              event.currentTarget.checked
                ? [...customerList, contact?.id]
                : customerList.filter((id) => id !== contact?.id),
            )
          }
        />
      </Table.Td>
      {/* <Table.Td>{contact?.position}</Table.Td> */}
      <Table.Td>{contact?.name}</Table.Td>
      <Table.Td>{contact?.phone}</Table.Td>
    </Table.Tr>
  ));

  return (
    <Box p="0">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap={"md"}>
          {addType == contactAddType.EXISTING && (
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
          )}
          <Group>
            <Radio.Group
              value={addType}
              onChange={setAddType}
              name="addType"
              label="Choose"
              styles={customStyle}
            >
              <Group>
                <Radio value={contactAddType.NEW} label="Add New Customer" />
                <Radio
                  value={contactAddType.EXISTING}
                  label="Add Existing customer"
                />
              </Group>
            </Radio.Group>
          </Group>
          {addType == contactAddType.NEW && (
            <>
              <Group justify="space-between">
                <Radio.Group
                  value={form.values.importMethod}
                  onChange={(value) =>
                    form.setFieldValue("importMethod", value)
                  }
                  name="importmethod"
                  label="Import Customers"
                  styles={customStyle}
                >
                  <Group>
                    <Radio value={importMethod.MANUAL} label="Manual" />
                    <Radio value={importMethod.CSV} label="Import CSV" />
                  </Group>
                </Radio.Group>

                <Paper shadow="xl" p="md" px="xl">
                  <Checkbox.Group value={contactType} onChange={setContactType}>
                    <Group>
                      <Checkbox
                        value="phone"
                        label="Phone"
                        checked
                        styles={custominputstyle}
                      />
                      <Checkbox
                        value="email"
                        label="Email"
                        checked
                        styles={custominputstyle}
                      />
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
                    styles={custominputstyle}
                  />
                  {contactType.includes("phone") && (
                    <TextInput
                      label="Phone Number"
                      placeholder="Enter phone number"
                      {...form.getInputProps("phone")}
                      required
                      radius={"md"}
                      size="md"
                      styles={custominputstyle}
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
                      styles={custominputstyle}
                    />
                  )}
                </SimpleGrid>
              )}
              {form.values.importMethod == importMethod.CSV && (
                <CSVReader setCsvData={setCsvData}></CSVReader>
              )}
            </>
          )}
          {addType == contactAddType.EXISTING && (
            <ScrollArea h={200}>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th />
                    <Table.Th>Customer Name</Table.Th>
                    <Table.Th>Phone Number</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>{rows}</Table.Tbody>
              </Table>
            </ScrollArea>
          )}
          <Group justify="flex-end">
            <RateupButtonSecondary
              title="cancel"
              onClick={close}
            ></RateupButtonSecondary>
            <RateupButtonBlue
              title="Add Customer"
              onClick={handleSubmit}
              loading={isCreating}
            ></RateupButtonBlue>
          </Group>
        </Stack>
      </form>
    </Box>
  );
};

export default AddCustomerModal;
