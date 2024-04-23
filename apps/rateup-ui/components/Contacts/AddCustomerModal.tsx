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
  Blockquote,
  NavLink,
} from "@mantine/core";
import {
  RateupButtonSecondary,
  RateupButtonBlue,
} from "../Button/RateupButtons";
import { useEffect, useState } from "react";
import { useForm } from "@mantine/form";
import { IconDownload, IconInfoCircle, IconSearch } from "@tabler/icons-react";
import {
  useAddExistingContactMutation,
  useAddNewContactMutation,
} from "../../backend/campaign/contactGroup/contactGroup.query";
import { useCampaignContacts } from "../../backend/campaign/contacts/contacts.query";
import { contactAddType, importMethod } from "../../utils/enums";
import { ContainedFileInput } from "../input/ContainedInput/ContainedInput";
import { ImportContact } from "./CreateContactModal";
import Papa from "papaparse";
import { showErrorToast } from "../../utils/notifications";
import { getHotkeyHandler } from "@mantine/hooks";
import { SAVE_HOTKEY } from "../../utils/constants";
import PaperLayout from "../styled/Layouts/PaperLayout";
import PhoneInputWithCountrySelect, {
  isValidPhoneNumber,
} from "react-phone-number-input";
import "react-phone-number-input/style.css";
import styles from "./contact.module.css";
import { getFileUrlFromKey } from "../../utils/file-upload/upload";

export interface IAddCustomer {
  name: string;
  email?: string;
  phone?: string;
  source?: string;
  tags: any;
}

const AddCustomerModal = ({
  groupId,
  close,
  teamId,
  existingContactIds,
  tags = [],
}) => {
  const [contactType, setContactType] = useState<string[]>(["phone"]);
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
    data: contactData,
    error: error,
    refetch: refetch,
  } = useCampaignContacts() as {
    isLoading: boolean;
    data: ContactsData[];
    error: any;
    refetch: any;
  };

  const form = useForm({
    initialValues: {
      name: "",
      phone: "",
      importMethod: importMethod.MANUAL,
      contactType: ["phone"],
      countryCode: "91",
      tags: {},
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
      contactType: (value) =>
        !value.length ? "Must select any one: phone" : null,
    },
  });
  const createNewContactMutation = useAddNewContactMutation(groupId);
  const addExistingContactsMutation = useAddExistingContactMutation(groupId);
  const allContactIds = contactData?.map((customer) => customer?.id);
  const remainingContactIds = allContactIds?.filter(
    (c) => !existingContactIds?.includes(c),
  );

  useEffect(() => {
    form.values.contactType = contactType;
  }, [contactType]);
  useEffect(() => {
    if (!searchTerm.length && contactData) {
      setFilteredCustomerList(contactData);
    } else {
      if (contactData) {
        setFilteredCustomerList(
          contactData?.filter((contact) => {
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
  }, [searchTerm, contactData]);
  useEffect(() => {
    if (csvfile == null) return;

    setIsUpload(true);
    Papa.parse(csvfile, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header?.toLowerCase(),
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
      csvData?.every(function (contact) {
        if (contactType.includes("phone") && !/^\d+$/.test(contact?.phone)) {
          showErrorToast("Failed to import: file contain invalid phone number");
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
        ({ name, phone, ...obj }) => {
          const result = {};
          for (const key of tags) {
            if (obj.hasOwnProperty(key) && contactType?.includes(key)) {
              result[key] = obj[key];
            }
          }
          return {
            name,
            phone: !phone ? undefined : phone,
            source: importMethod.CSV,
            tags: result,
          };
        },
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
        const result = {};
        for (const key of contactType) {
          if (form.getValues()?.tags?.hasOwnProperty(key)) {
            result[key] = form.getValues()?.tags?.[key];
          }
        }
        contactData = [
          {
            name: form.values.name,
            phone: contactType.includes("phone") ? phone : undefined,
            source: importMethod.MANUAL,
            tags: result,
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
            existingContactIds?.includes(contact?.id)
          }
          disabled={existingContactIds?.includes(contact?.id)}
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
                <Radio value={contactAddType.NEW} label="Add New Contact" />
                <Radio
                  value={contactAddType.EXISTING}
                  label="Add Existing Contacts"
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
                  label="Import Contacts"
                  styles={custominputstyle}
                >
                  <Group>
                    <Radio value={importMethod.MANUAL} label="Manual" />
                    <Radio value={importMethod.CSV} label="Import CSV" />
                  </Group>
                </Radio.Group>

                {tags?.length > 0 && (
                  <Paper shadow="xl" p="md" px="xl">
                    <Checkbox.Group
                      value={contactType}
                      onChange={setContactType}
                    >
                      <Group>
                        {tags?.map((data) => (
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
                  {contactType?.map(
                    (data) =>
                      data !== "phone" && (
                        <TextInput
                          label={data}
                          placeholder={`Enter ${data}`}
                          {...form.getInputProps(`tags.${data}`)}
                          radius={"md"}
                          size="md"
                          required
                          key={data}
                        />
                      ),
                  )}
                </SimpleGrid>
              )}
              {form.values.importMethod == importMethod.CSV && (
                <>
                  <Blockquote
                    color="blue"
                    icon={<IconInfoCircle />}
                    p={"sm"}
                    iconSize={40}
                    mx={"lg"}
                  >
                    Utilizing CSV file uploads to generate contact requires
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
                </>
              )}
            </Stack>
          )}
          {addType == contactAddType.EXISTING && (
            <Stack justify="center" gap={"md"}>
              <Group justify="space-between" px={"md"}>
                <Checkbox
                  aria-label="select all"
                  label="Select All"
                  checked={remainingContactIds?.every((id) =>
                    customerList.includes(id),
                  )}
                  onChange={(event) => {
                    setCustomerList(
                      event.currentTarget.checked ? remainingContactIds : [],
                    );
                  }}
                  disabled={contactData.every((customer) =>
                    existingContactIds.includes(customer?.id),
                  )}
                />
                <TextInput
                  leftSection={<IconSearch size="1.1rem" stroke={1.5} />}
                  radius="xl"
                  size="sm"
                  placeholder={"Search Contact"}
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
                        <Table.Th>Name</Table.Th>
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
              title="Add Member"
              onClick={handleSubmit}
              loading={isCreating}
              disabled={
                isUpload ||
                contactData?.every((customer) =>
                  existingContactIds.includes(customer?.id),
                ) ||
                (form.values.importMethod == importMethod.CSV && !csvfile)
              }
            />
          </Group>
        </Stack>
      </form>
    </Box>
  );
};

export default AddCustomerModal;
