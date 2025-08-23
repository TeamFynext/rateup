import { useState } from "react";

import {
  ActionIcon,
  Box,
  Checkbox,
  Group,
  MultiSelect,
  ScrollArea,
  Stack,
  Table,
  Tooltip,
} from "@mantine/core";
import { useDebouncedState } from "@mantine/hooks";
import { IconRefresh } from "@tabler/icons-react";
import { ColumnFiltersState } from "@tanstack/react-table";
import { useTranslations } from "next-intl";

import { useAddExistingContactToMultipleGroupsMutation } from "../../backend/campaign/contactGroup/contactGroup.query";
import { useContacts } from "../../backend/campaign/contacts/contacts.query";
import { SearchInput } from "../../pages/dashboard/campaign";
import { FilterSelect } from "../../pages/dashboard/contacts";
import { PAGE_SIZE } from "../../utils/constants";
import { showLoadingToast } from "../../utils/notifications";
import { TeamSelector } from "../input/TeamSelector";
import RateupLoader from "../Loaders/RateupLoader";
import FormModalLayout from "../Modal/FormModalLayout";
import PaperLayout from "../styled/Layouts/PaperLayout";
import ContactPagination from "./ContactPagination";

const ContactAction = ({ opened, close, allGroups, action }) => {
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [columnFilters, setColumnFilters] =
    useDebouncedState<ColumnFiltersState>([], 200);
  const [searchText, setSearchText] = useDebouncedState("", 200);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: Number(PAGE_SIZE[0]),
  });

  const addContactToGroupsMutation =
    useAddExistingContactToMultipleGroupsMutation(selectedGroups, () => {
      setSelectedIds([]);
      setSelectedTeamId(null);
      setSelectedGroups([]);
      close();
    });
  const {
    isPending,
    data: allContacts,
    refetch,
  } = useContacts(pagination, searchText, null, columnFilters);
  const isDisabledSubmit = !selectedIds?.length || !selectedGroups?.length;
  const filteredGroups = allGroups?.filter(
    (group) => group?.teamId === selectedTeamId,
  );
  const groupData = filteredGroups?.map((g) => ({
    label: g?.name,
    value: g?.id,
  }));
  const translations = useTranslations();
  const handleSubmit = () => {
    showLoadingToast(
      translations("Contact adding to existing group"),
      "contact-group-add-existing",
      true,
      translations("Adding Contact to group"),
    );
    addContactToGroupsMutation.mutate({
      contactIds: selectedIds,
      contactGroupIds: selectedGroups,
    });
  };

  const rows = allContacts?.users?.map((contact) => (
    <Table.Tr
      key={contact?.id}
      bg={
        selectedIds.includes(contact?.id)
          ? "var(--mantine-color-blue-light)"
          : undefined
      }
    >
      <Table.Td>
        <Checkbox
          aria-label="Select row"
          checked={selectedIds?.includes(contact?.id)}
          onChange={(event) =>
            setSelectedIds(
              event.currentTarget.checked
                ? [...selectedIds, contact?.id]
                : selectedIds.filter((id) => id !== contact?.id),
            )
          }
        />
      </Table.Td>
      <Table.Td>{contact?.name}</Table.Td>
      <Table.Td>{contact?.phone}</Table.Td>
    </Table.Tr>
  ));
  let totalPageCount = (allContacts?.totalCount ?? 1) / pagination.pageSize;
  return (
    <FormModalLayout
      opened={opened}
      title={action}
      onClose={() => {
        setSelectedIds([]);
        setSelectedTeamId(null);
        setSelectedGroups([]);
        close();
      }}
      centered
      size="lg"
      includeCancelButton
      buttonTitle={translations("Done")}
      onSubmit={handleSubmit}
      submitButtonDisabled={isDisabledSubmit}
    >
      {isPending ? (
        <RateupLoader />
      ) : (
        <Stack>
          <Group justify="space-between">
            <TeamSelector
              value={selectedTeamId}
              onChange={(value) => {
                setSelectedGroups([]);
                setSelectedIds([]);
                setSelectedTeamId(value);
              }}
              styles={{
                input: {
                  height: "10px",
                },
              }}
            />
            <FilterSelect
              contactArray={filteredGroups?.map((data) => ({
                value: data?.id,
                label: data?.name,
              }))}
              setFilterByTag={setColumnFilters}
              filterByTag={columnFilters}
            />
          </Group>
          <Group justify="space-between">
            {columnFilters?.length === 0 ? (
              <Checkbox
                aria-label="select all"
                label={translations("Select All")}
                checked={
                  allContacts?.users?.length &&
                  allContacts?.users?.every((customer) =>
                    selectedIds.includes(customer?.id),
                  )
                }
                onChange={(event) => {
                  if (event.currentTarget.checked) {
                    setSelectedIds(
                      allContacts?.users.map((customer) => customer?.id),
                    );
                  } else setSelectedIds([]);
                }}
              />
            ) : (
              <Box />
            )}

            <SearchInput
              placeholder={translations("Search")}
              searchText={searchText}
              setSearchText={setSearchText}
              width={300}
              size="sm"
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
          <MultiSelect
            radius={"10px"}
            searchable
            clearable
            data={groupData}
            value={selectedGroups}
            onChange={setSelectedGroups}
            placeholder={
              selectedGroups.length > 0 ? "" : translations("Select Groups")
            }
          />
        </Stack>
      )}
    </FormModalLayout>
  );
};

export default ContactAction;
