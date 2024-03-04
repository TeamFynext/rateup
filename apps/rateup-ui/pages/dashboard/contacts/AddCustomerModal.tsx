import {
  Box,
  Checkbox,
  Group,
  Paper,
  Radio,
  SimpleGrid,
  Stack,
  TextInput,
  ScrollArea,
  Table,
  Text,
} from "@mantine/core";
import {
  RateupButtonSecondary,
  RateupButtonBlue,
} from "../../../components/Button/RateupButtons";
import { useEffect, useState } from "react";
import { useForm } from "@mantine/form";
import { IconPlus, IconSearch } from "@tabler/icons-react";
import {
  useAddExistingContactMutation,
  useAddNewContactMutation,
} from "../../../backend/campaign/contactGroup/contactGroup.query";
import { useCampaignContactsByTeamId } from "../../../backend/campaign/contacts/contacts.query";
import { contactAddType, importMethod } from "../../../utils/enums";
import { ContainedFileInput } from "../../../components/input/ContainedInput/ContainedInput";
import { ImportContact } from "./CreateContactModal";
import Papa from "papaparse";
import { showErrorToast } from "../../../utils/notifications";
import { getHotkeyHandler } from "@mantine/hooks";
import { SAVE_HOTKEY, emailPattern } from "../../../utils/constants";
import PaperLayout from "../../../components/styled/Layouts/PaperLayout";
import PhoneInputWithCountrySelect, {
  isValidPhoneNumber,
} from "react-phone-number-input";
import "react-phone-number-input/style.css";
import styles from "./contacts.module.css";

export interface IAddCustomer {
  name: string;
  email?: string;
  phone?: string;
  source?: string;
}

const AddCustomerModal = ({ groupId, close, teamId, existingCustomers }) => {
  const [contactType, setContactType] = useState<string[]>(["phone", "email"]);
  const [csvData, setCsvData] = useState<ImportContact[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [addType, setAddType] = useState(contactAddType.NEW);
  const [customerList, setCustomerList] = useState<string[]>([]);
  const [filteredCustomerList, setFilteredCustomerList] = useState([]);
  const [csvfile, setCsvfile] = useState<File | null>(null);
  const [isUpload, setIsUpload] = useState(false);

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
      countryCode: "91",
    },
    validate: {
      phone: (value) => {
        if (
          form.values.importMethod == importMethod.MANUAL &&
          addType === contactAddType.NEW &&
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
        addType == contactAddType.NEW &&
        !value.length
          ? "Name cannot be blank"
          : null,
      email: (value) => {
        if (
          form.values.importMethod == importMethod.MANUAL &&
          addType === contactAddType.NEW &&
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
  const createNewContactMutation = useAddNewContactMutation(groupId);

  const addExistingContactsMutation = useAddExistingContactMutation(groupId);

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
        setIsCreating(false);
        return;
      }
      let dataToUpload: IAddCustomer[] = csvData?.map(
        ({ name, email, phone }) => ({
          name,
          email: !email ? undefined : email,
          phone: !phone ? undefined : phone,
          source: importMethod.CSV,
        }),
      );
      createNewContactMutation.mutate(
        { data: dataToUpload, groupId: groupId },
        {
          onSuccess: () => {
            close();
            setIsCreating(false);
            form.reset();
          },
          onError: () => {
            setIsCreating(false);
            form.reset();
          },
        },
      );
    } else {
      if (addType == contactAddType.EXISTING) {
        addExistingContactsMutation.mutate(
          {
            customerList: customerList,
            groupId: groupId,
          },
          {
            onSuccess: () => {
              setCustomerList([]);
              setIsCreating(false);
              close();
            },
            onError: () => {
              setCustomerList([]);
              setIsCreating(false);
              close();
            },
          },
        );
      } else {
        let contactData: IAddCustomer[] = [form.values];
        const phone = form.values.phone.slice(1);
        contactData = [
          {
            name: form.values.name,
            phone: contactType.includes("phone") ? phone : undefined,
            email: contactType.includes("email")
              ? form.values.email
              : undefined,
            source: importMethod.MANUAL,
          },
        ];
        createNewContactMutation.mutate(
          {
            data: contactData,
            groupId: groupId,
          },
          {
            onSuccess: () => {
              setIsCreating(false);
              form.reset();
              close();
            },
            onError: () => {
              setIsCreating(false);
              form.reset();
            },
          },
        );
      }
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
          checked={
            customerList?.includes(contact?.id) ||
            existingCustomers?.includes(contact?.id)
          }
          disabled={existingCustomers?.includes(contact?.id)}
          onChange={(event) =>
            setCustomerList(
              event.currentTarget.checked
                ? [...customerList, contact?.id]
                : customerList.filter((id) => id !== contact?.id),
            )
          }
        />
      </Table.Td>
      <Table.Td>{contact?.name}</Table.Td>
      <Table.Td>{contact?.phone}</Table.Td>
    </Table.Tr>
  ));

  return (
    <Box p="0">
      <form
        onSubmit={form.onSubmit(handleSubmit)}
        onKeyDown={getHotkeyHandler([
          [SAVE_HOTKEY, (event: any) => form.onSubmit(handleSubmit)(event)],
        ])}
      >
        <Stack gap={"md"}>
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
            <Stack gap={"lg"}>
              <Group justify="space-between" mt={"sm"}>
                <Radio.Group
                  value={form.values.importMethod}
                  onChange={(value) =>
                    form.setFieldValue("importMethod", value)
                  }
                  name="importmethod"
                  label="Import Customers"
                  styles={custominputstyle}
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
                    <Stack gap={0}>
                      <Group gap={3}>
                        <Text fw={"bold"} fz={14}>
                          Phone Number
                        </Text>
                        <Text fw={"bold"} fz={14} c="red">
                          *
                        </Text>
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
                      styles={custominputstyle}
                    />
                  )}
                </SimpleGrid>
              )}
              {form.values.importMethod == importMethod.CSV && (
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
              )}
            </Stack>
          )}
          {addType == contactAddType.EXISTING && (
            <Stack justify="center" gap={"md"}>
              <Group justify="space-between" px={"md"}>
                <Checkbox
                  aria-label="select all"
                  label="Select All"
                  checked={contactDataByTeamId?.data?.every((customer) =>
                    customerList.includes(customer?.id),
                  )}
                  onChange={(event) => {
                    const allCustomers = contactDataByTeamId?.data?.map(
                      (customer) => customer?.id,
                    );
                    const remainingCustomers = allCustomers.filter(
                      (c) => !existingCustomers?.includes(c),
                    );
                    setCustomerList(
                      event.currentTarget.checked ? remainingCustomers : [],
                    );
                  }}
                  disabled={contactDataByTeamId?.data?.every((customer) =>
                    existingCustomers.includes(customer?.id),
                  )}
                />
                <TextInput
                  leftSection={<IconSearch size="1.1rem" stroke={1.5} />}
                  radius="xl"
                  size="sm"
                  placeholder={"Search Customer"}
                  rightSectionWidth={60}
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.currentTarget.value)}
                  w={300}
                />
              </Group>
              <PaperLayout>
                <ScrollArea h={200}>
                  <Table stickyHeader>
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
              </PaperLayout>
            </Stack>
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
              disabled={
                isUpload ||
                contactDataByTeamId?.data?.every((customer) =>
                  existingCustomers.includes(customer?.id),
                )
              }
            ></RateupButtonBlue>
          </Group>
        </Stack>
      </form>
    </Box>
  );
};

export default AddCustomerModal;
