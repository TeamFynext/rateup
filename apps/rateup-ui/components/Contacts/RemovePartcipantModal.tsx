import { Checkbox, Group, ScrollArea, Stack, Table } from "@mantine/core";
import { useState } from "react";
import { useRemoveContactsFromGroup } from "../../backend/campaign/contactGroup/contactGroup.query";
import {
  RateupButtonSecondary,
  RateupButtonPrimary,
} from "../Button/RateupButtons";
import { SearchInput } from "../../pages/dashboard/campaign";
import PaperLayout from "../styled/Layouts/PaperLayout";
import NothingFound from "../NothingFound/NothingFound";

const RemovePartcipantModal = ({ customerList, groupId, close }) => {
  const [searchText, setSearchText] = useState("");
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const removeContactsMutation = useRemoveContactsFromGroup(groupId, () => {});
  const filteredCustomerList = searchText
    ? customerList?.filter(
        (customer) =>
          customer?.name.toLowerCase().includes(searchText.toLowerCase()) ||
          customer?.phone?.startsWith(searchText),
      )
    : customerList;

  const handleRemoveCustomers = () => {
    removeContactsMutation.mutate(
      { contactIds: selectedCustomers, groupId },
      {
        onSuccess: () => {
          close();
        },
      },
    );
  };
  const rows =
    filteredCustomerList?.length > 0 ? (
      filteredCustomerList?.map((customer) => (
        <Table.Tr
          key={customer?.id}
          bg={
            selectedCustomers.includes(customer?.id)
              ? "var(--mantine-color-blue-light)"
              : undefined
          }
        >
          <Table.Td>
            <Checkbox
              aria-label="Select row"
              checked={selectedCustomers?.includes(customer?.id)}
              onChange={(event) =>
                setSelectedCustomers(
                  event.currentTarget.checked
                    ? [...selectedCustomers, customer?.id]
                    : selectedCustomers.filter((id) => id !== customer?.id),
                )
              }
            />
          </Table.Td>
          <Table.Td>{customer?.name}</Table.Td>
          <Table.Td>{customer?.phone}</Table.Td>
        </Table.Tr>
      ))
    ) : (
      <Table.Tr>
        <Table.Td />
        <Table.Td colSpan={2} align="center">
          {" "}
          No members found
        </Table.Td>
      </Table.Tr>
    );
  return customerList?.length ? (
    <Stack>
      <Stack gap={"md"} justify="center">
        <Group justify="space-between">
          <Checkbox
            aria-label="select all"
            label="Select All"
            checked={customerList?.every((customer) =>
              selectedCustomers.includes(customer?.id),
            )}
            onChange={(event) =>
              setSelectedCustomers(
                event.currentTarget.checked
                  ? customerList.map((customer) => customer?.id)
                  : [],
              )
            }
          />
          <SearchInput
            placeholder={"Search contact"}
            searchText={searchText}
            setSearchText={setSearchText}
            width={300}
            size="sm"
          />
        </Group>
        <PaperLayout>
          <ScrollArea h={200}>
            <Table w={500} stickyHeader>
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
      <Group justify={"flex-end"} py={"sm"}>
        <RateupButtonSecondary title="cancel" onClick={close} />
        <RateupButtonPrimary
          title="Remove members"
          onClick={handleRemoveCustomers}
        />
      </Group>
    </Stack>
  ) : (
    <NothingFound text="No Contacts Found" />
  );
};

export default RemovePartcipantModal;
