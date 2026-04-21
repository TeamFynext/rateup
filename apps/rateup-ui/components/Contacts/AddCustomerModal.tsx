"use client";

import { useState } from "react";

import {
  ActionIcon,
  Box,
  Checkbox,
  Group,
  Radio,
  ScrollArea,
  Stack,
  Table,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useDebouncedState } from "@mantine/hooks";
import { IconRefresh, IconSearch } from "@tabler/icons-react";
import { ColumnFiltersState } from "@tanstack/react-table";
import dayjs from "dayjs";
import { useExtracted } from "next-intl";

import { ContactGroupType } from "@/types/enums";
import { FilterSelect } from "@/app/dashboard/contacts/page";

import {
  useAddExistingContactMutation,
  useAddNewContactMutation,
  useContactGroup,
} from "../../backend/campaign/contactGroup/contactGroup.query";
import { useContacts } from "../../backend/campaign/contacts/contacts.query";
import { PAGE_SIZE } from "../../utils/constants";
import { contactAddType } from "../../utils/enums";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../Button/RateupButtons";
import RateupLoader from "../Loaders/RateupLoader";
import PaperLayout from "../styled/Layouts/PaperLayout";
import ContactPagination from "./ContactPagination";
import CreateContactModal from "./CreateContactModal";

export interface IAddCustomer {
  name: string;
  email?: string;
  phone?: string;
  source?: string;
  dob?: Date;
  type?: ContactGroupType;
}

const AddCustomerModal = ({
  groupId,
  close,
  existingContactIds,
  createNewContactsFromCSV,
  type = ContactGroupType.NORMAL,
}) => {
  const [searchTerm, setSearchTerm] = useDebouncedState("", 200);
  const [isCreating, setIsCreating] = useState(false);
  const [addType, setAddType] = useState(contactAddType.NEW);
  const [customerList, setCustomerList] = useState<string[]>([]);
  const [columnFilters, setColumnFilters] =
    useDebouncedState<ColumnFiltersState>([], 200);
  const addExistingContactsMutation = useAddExistingContactMutation(groupId);
  const createNewContactMutation = useAddNewContactMutation(groupId);

  const translations = useExtracted();
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
  const contactData = data?.users;

  const allContactIds = contactData?.map((customer) => customer?.id);
  const remainingContactIds = allContactIds?.filter(
    (c) => !existingContactIds?.includes(c),
  );

  const handleAddExistingContacts = async () => {
    setIsCreating(true);
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
  };

  const customStyle = {
    label: {
      fontWeight: "bold",
      fontSize: "18px",
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
  const totalPageCount = (data?.totalCount ?? 1) / pagination.pageSize;

  return (
    <Box p="0">
      <Stack gap={"md"}>
        <Group>
          <Radio.Group
            value={addType}
            onChange={(value) => setAddType(value)}
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

        {addType == contactAddType.NEW ? (
          <CreateContactModal
            close={close}
            type={type}
            contactClose={close}
            importCSVContactMutation={createNewContactsFromCSV}
            createNewContactMutation={createNewContactMutation}
          />
        ) : (
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
                          <Table.Th>{translations("Email")}</Table.Th>
                          <Table.Th>{translations("Date of Birth")}</Table.Th>
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
            <Group justify="flex-end">
              <RateupButtonSecondary
                title={translations("cancel")}
                onClick={close}
              />
              <RateupButtonBlue
                title={translations("Add Member")}
                onClick={handleAddExistingContacts}
                loading={isCreating}
              />
            </Group>
          </Stack>
        )}
      </Stack>
    </Box>
  );
};

export default AddCustomerModal;
