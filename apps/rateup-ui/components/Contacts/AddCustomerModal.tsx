"use client";

import { useState } from "react";

import {
  ActionIcon,
  Blockquote,
  Box,
  Checkbox,
  Group,
  NavLink,
  Paper,
  Radio,
  ScrollArea,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { getHotkeyHandler, useDebouncedState } from "@mantine/hooks";
import {
  IconDownload,
  IconInfoCircle,
  IconRefresh,
  IconSearch,
} from "@tabler/icons-react";
import PhoneInputWithCountrySelect, {
  isValidPhoneNumber,
} from "react-phone-number-input";

import {
  useAddExistingContactMutation,
  useAddNewContactMutation,
  useContactGroup,
} from "../../backend/campaign/contactGroup/contactGroup.query";
import { useContacts } from "../../backend/campaign/contacts/contacts.query";
import { PAGE_SIZE, SAVE_HOTKEY } from "../../utils/constants";
import { contactAddType, importMethod } from "../../utils/enums";
import { showErrorToast } from "../../utils/notifications";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../Button/RateupButtons";
import { ContainedFileInput } from "../input/ContainedInput/ContainedInput";
import PaperLayout from "../styled/Layouts/PaperLayout";

import "react-phone-number-input/style.css";

import { DatePicker, DatePickerInput } from "@mantine/dates";
import { ColumnFiltersState } from "@tanstack/react-table";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";

import { ContactGroupType } from "@/types/enums";
import { FilterSelect } from "@/app/dashboard/contacts/page";

import { getFileUrlFromKey } from "../../utils/file-upload/upload";
import RateupLoader from "../Loaders/RateupLoader";
import styles from "./contact.module.css";
import ContactPagination from "./ContactPagination";

export interface IAddCustomer {
  name: string;
  email?: string;
  phone?: string;
  source?: string;
  dob?: Date;
  tags: any;
  type?: ContactGroupType;
}

const AddCustomerModal = ({
  groupId,
  close,
  existingContactIds,
  tags = [],
  createNewContactsFromCSV,
  type = ContactGroupType.NORMAL,
}) => {
  const [searchTerm, setSearchTerm] = useDebouncedState("", 200);
  const [isCreating, setIsCreating] = useState(false);
  const [addType, setAddType] = useState(contactAddType.NEW);
  const [customerList, setCustomerList] = useState<string[]>([]);
  const [csvfile, setCsvfile] = useState<File | null>(null);
  const [columnFilters, setColumnFilters] =
    useDebouncedState<ColumnFiltersState>([], 200);
  const createNewContactMutation = useAddNewContactMutation(groupId);
  const addExistingContactsMutation = useAddExistingContactMutation(groupId);
  const translations = useTranslations();
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: Number(PAGE_SIZE[0]),
  });
  const { isPending, data, refetch } = useContacts(
    pagination,
    searchTerm,
    null,
    columnFilters,
    type,
  );
  const { isLoading: isLoadingContactgroup, data: contactGroupData } =
    useContactGroup();
  let contactData = data?.users;
  const form = useForm({
    initialValues: {
      name: "",
      phone: "",
      email: "",
      dob: null,
      importMethod: importMethod.MANUAL,
      contactType: tags ?? [],
      countryCode: "91",
      tags: {},
      updateExisting: false,
    },
    validate: {
      phone: (value) => {
        if (
          form.values.importMethod == importMethod.MANUAL &&
          addType === contactAddType.NEW
        )
          return !value
            ? translations("Phone Number cannot be blank")
            : !isValidPhoneNumber(value)
              ? translations("Invalid phone number")
              : null;
      },
      name: (value) =>
        form.values.importMethod == importMethod.MANUAL &&
        addType == contactAddType.NEW &&
        !value.length
          ? translations("Name cannot be blank")
          : null,
    },
  });

  const allContactIds = contactData?.map((customer) => customer?.id);
  const remainingContactIds = allContactIds?.filter(
    (c) => !existingContactIds?.includes(c),
  );

  const handleSubmit = async () => {
    const validation = form.validate();
    if (validation.hasErrors) {
      if (validation.errors.contactType) {
        showErrorToast(validation.errors.contactType as string);
      }
      return;
    }
    setIsCreating(true);
    if (form.values.importMethod == importMethod.CSV) {
      if (!csvfile) return;
      const formData = new FormData();
      formData.append("update", form.getValues().updateExisting?.toString());
      const contactTypes = form.getValues().contactType;
      contactTypes.forEach((item, index) => {
        formData.append(`tags[${index}]`, item);
      });
      formData.append("file", csvfile);
      createNewContactsFromCSV.mutate(
        { data: formData, groupId },
        {
          onSettled: () => {
            setIsCreating(false);
            form.reset();
            close();
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
        const result = {};
        for await (const key of form.getValues().contactType) {
          if (form.getValues()?.tags?.hasOwnProperty(key)) {
            result[key] = form.getValues()?.tags?.[key];
          }
        }
        contactData = [
          {
            ...form.getValues(),
            phone: form.getValues().phone.slice(1),
            source:
              type === ContactGroupType.LOYALTY
                ? ContactGroupType.LOYALTY
                : "manual",
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
  const rows = contactData?.map((contact) => {
    if (type === ContactGroupType.LOYALTY) {
      return (
        <Table.Tr
          key={contact?.loyaltyCustomer?.id}
          bg={
            customerList.includes(contact?.loyaltyCustomer?.id)
              ? "var(--mantine-color-blue-light)"
              : undefined
          }
        >
          <Table.Td>
            <Checkbox
              aria-label={translations("Select row")}
              checked={
                customerList?.includes(contact?.loyaltyCustomer?.id) ||
                existingContactIds?.includes(contact?.loyaltyCustomer?.id)
              }
              disabled={existingContactIds?.includes(
                contact?.loyaltyCustomer?.id,
              )}
              onChange={(event) =>
                setCustomerList(
                  event.currentTarget.checked
                    ? [...customerList, contact?.loyaltyCustomer?.id]
                    : customerList.filter(
                        (id) => id !== contact?.loyaltyCustomer?.id,
                      ),
                )
              }
            />
          </Table.Td>
          <Table.Td>{contact?.name}</Table.Td>
          <Table.Td>{contact?.phone}</Table.Td>
          {type === ContactGroupType.LOYALTY && (
            <>
              <Table.Td>{contact?.email}</Table.Td>
              <Table.Td>
                {contact?.dob && dayjs(contact?.dob)?.format("DD/MM/YYYY")}
              </Table.Td>
            </>
          )}
        </Table.Tr>
      );
    } else {
      return (
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
              aria-label={translations("Select row")}
              checked={
                customerList?.includes(contact?.id) ||
                existingContactIds?.includes(contact?.id)
              }
              disabled={existingContactIds?.includes(contact?.id)}
              onChange={(event) =>
                setCustomerList(
                  event.currentTarget.checked
                    ? [...customerList, contact?.id]
                    : customerList.filter(
                        (id) => id !== contact?.loyaltyCustomer?.id,
                      ),
                )
              }
            />
          </Table.Td>
          <Table.Td>{contact?.name}</Table.Td>
          <Table.Td>{contact?.phone}</Table.Td>
        </Table.Tr>
      );
    }
  });
  if (isPending) return <RateupLoader />;
  let totalPageCount = (data?.totalCount ?? 1) / pagination.pageSize;

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
              label={translations("Choose")}
              styles={customStyle}
            >
              <Group>
                <Radio
                  value={contactAddType.NEW}
                  label={translations("Add New Contact")}
                />
                <Radio
                  value={contactAddType.EXISTING}
                  label={translations("Add Existing Contacts")}
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
                  label={translations("Import Contacts")}
                  styles={custominputstyle}
                >
                  <Group>
                    <Radio
                      value={importMethod.MANUAL}
                      label={translations("Manual")}
                    />
                    <Radio
                      value={importMethod.CSV}
                      label={translations("Import CSV/XLSX")}
                    />
                  </Group>
                </Radio.Group>

                {tags?.length > 0 && (
                  <Paper shadow="xl" p="md" px="xl">
                    <Checkbox.Group
                      key={form.key("contactType")}
                      {...form.getInputProps("contactType")}
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
                    label={translations("Name")}
                    placeholder={translations("Enter name")}
                    {...form.getInputProps("name")}
                    radius={"md"}
                    size="md"
                    required
                    styles={custominputstyle}
                  />
                  <Stack gap={0}>
                    <Group gap={3}>
                      <Text fw={"bold"} fz={14}>
                        {translations("Phone Number")}
                      </Text>
                      <Text fw={"bold"} fz={14} c="red">
                        *
                      </Text>
                    </Group>
                    <PhoneInputWithCountrySelect
                      defaultCountry="IN"
                      international
                      countryCallingCodeEditable={false}
                      placeholder={translations("Enter phone number")}
                      {...form.getInputProps("phone")}
                      className={styles.inputPhone}
                    />
                    <Text size="sm" c={"red"}>
                      {form?.errors?.phone}
                    </Text>
                  </Stack>
                  {type === ContactGroupType.LOYALTY && (
                    <>
                      <TextInput
                        label={translations("email")}
                        placeholder={translations("Enter the email")}
                        radius={"md"}
                        size="md"
                        type="email"
                        styles={custominputstyle}
                        {...form.getInputProps("email")}
                      />
                      <DatePickerInput
                        label={translations("dob")}
                        placeholder={translations("Enter the dob")}
                        radius={"md"}
                        size="md"
                        styles={custominputstyle}
                        maxDate={new Date()}
                        {...form.getInputProps("dob")}
                      />
                    </>
                  )}
                  {form
                    .getValues()
                    ?.contactType?.map(
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
                <>
                  <Blockquote
                    color="blue"
                    icon={<IconInfoCircle />}
                    p={"sm"}
                    iconSize={40}
                    mx={"lg"}
                  >
                    {translations(
                      "Utilizing CSV/XLSX file uploads to generate contact requires specific fields in the file: name, phone",
                    )}
                    <NavLink
                      href={getFileUrlFromKey("/File/contact/demo.csv", false)}
                      label={translations("Download Demo Csv File")}
                      leftSection={<IconDownload size="1rem" stroke={1.5} />}
                      download
                      active
                      style={{ borderRadius: "4px" }}
                      target="_blank"
                    />
                  </Blockquote>
                  <Switch
                    mx={"lg"}
                    label={translations(
                      "Update the existing data while importing",
                    )}
                    key={form.key("updateExisting")}
                    {...form.getInputProps("updateExisting")}
                  />
                  <ContainedFileInput
                    mx={"lg"}
                    label=""
                    placeholder={translations(
                      "Upload a csv file (.csv) or excel file (.xlsx)",
                    )}
                    accept=".csv,.xlsx"
                    multiple={false}
                    onChange={setCsvfile}
                    styles={{
                      input: {
                        border: "2px dashed lightgrey",
                        height: "60px",
                        textAlign: "center",
                      },
                    }}
                  />
                </>
              )}
            </Stack>
          )}
          {addType == contactAddType.EXISTING && (
            <Stack justify="center" gap={"md"}>
              <FilterSelect
                contactArray={contactGroupData?.map((data) => ({
                  value: data?.id,
                  label: data?.name,
                }))}
                setFilterByTag={setColumnFilters}
                filterByTag={columnFilters}
              />
              <Group justify="space-between" px={"md"}>
                <Checkbox
                  aria-label="select all"
                  label={translations("Select All")}
                  checked={remainingContactIds?.every((id) =>
                    customerList.includes(id),
                  )}
                  onChange={(event) => {
                    setCustomerList(
                      event.currentTarget.checked ? remainingContactIds : [],
                    );
                  }}
                  disabled={contactGroupData.every((customer) =>
                    existingContactIds.includes(customer?.id),
                  )}
                />
                <TextInput
                  leftSection={<IconSearch size="1.1rem" stroke={1.5} />}
                  radius="xl"
                  size="sm"
                  placeholder={translations("Search Contact")}
                  rightSectionWidth={60}
                  defaultValue={searchTerm}
                  onChange={(event) => setSearchTerm(event.currentTarget.value)}
                  w={300}
                />
              </Group>
              <PaperLayout>
                <ScrollArea h={200}>
                  <Table stickyHeader>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>
                          <Tooltip label={translations("refresh data")}>
                            <ActionIcon
                              variant="light"
                              onClick={() => {
                                refetch();
                              }}
                            >
                              <IconRefresh />
                            </ActionIcon>
                          </Tooltip>
                        </Table.Th>
                        <Table.Th>{translations("Name")}</Table.Th>
                        <Table.Th>{translations("Phone Number")}</Table.Th>
                        {type === ContactGroupType.LOYALTY && (
                          <>
                            <Table.Th>{translations("email")}</Table.Th>
                            <Table.Th>{translations("dob")}</Table.Th>
                          </>
                        )}
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>{rows}</Table.Tbody>
                  </Table>
                </ScrollArea>
                <ContactPagination
                  pagination={pagination}
                  setPagination={setPagination}
                  totalPageCount={totalPageCount}
                />
              </PaperLayout>
            </Stack>
          )}
          <Group justify="flex-end">
            <RateupButtonSecondary
              title={translations("cancel")}
              onClick={close}
            />
            <RateupButtonBlue
              title={translations("Add Member")}
              onClick={handleSubmit}
              loading={isCreating}
              disabled={
                form.values.importMethod == importMethod.CSV && !csvfile
              }
            />
          </Group>
        </Stack>
      </form>
    </Box>
  );
};

export default AddCustomerModal;
