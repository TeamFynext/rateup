import { useState } from "react";
import {
  Box,
  Checkbox,
  Group,
  MultiSelect,
  ScrollArea,
  Stack,
  Table,
} from "@mantine/core";
import { useAddExistingContactToMultipleGroupsMutation } from "../../backend/campaign/contactGroup/contactGroup.query";
import { SearchInput } from "../../pages/dashboard/campaign";
import { FilterSelect } from "../../pages/dashboard/contacts";
import FormModalLayout from "../Modal/FormModalLayout";
import { TeamSelector } from "../input/TeamSelector";
import PaperLayout from "../styled/Layouts/PaperLayout";
import { showLoadingToast } from "../../utils/notifications";

const ContactAction = ({ opened, close, allContacts, allGroups, action }) => {
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [filterByTag, setFilterByTag] = useState<string[]>([]);

  const addContactToGroupsMutation =
    useAddExistingContactToMultipleGroupsMutation(selectedGroups, () => {
      setSelectedIds([]);
      setSelectedTeamId(null);
      setSelectedGroups([]);
      close();
    });

  const isDisabledSubmit = !selectedIds?.length || !selectedGroups?.length;
  const filteredGroups = allGroups?.filter(
    (group) => group?.teamId === selectedTeamId,
  );
  const groupData = filteredGroups?.map((g) => ({
    label: g?.name,
    value: g?.id,
  }));
  const filteredContacts = searchText
    ? allContacts?.filter(
        (contact) =>
          contact?.name.toLowerCase().includes(searchText.toLowerCase()) ||
          contact?.phone?.includes(searchText) ||
          contact?.email?.includes(searchText),
      )
    : allContacts;

  const handleSubmit = () => {
    showLoadingToast(
      "Contact adding to existing group",
      "contact-group-add-existing",
      true,
      "Adding Contact to group",
    );
    addContactToGroupsMutation.mutate({
      contactIds: selectedIds,
      contactGroupIds: selectedGroups,
    });
  };

  const sourceArray: string[] = Array.from(
    new Set(filteredContacts?.map((data) => data?.source)),
  );
  const rows = filteredContacts
    ?.filter((data) =>
      sourceArray?.some((data) => filterByTag.includes(data))
        ? filterByTag?.includes(data.source)
        : data,
    )
    ?.filter((data) =>
      filterByTag.filter((value) => !sourceArray.includes(value))?.length > 0
        ? data?.contactGroups?.some((group) =>
            filterByTag?.includes(group.contactGroup.name),
          )
        : data,
    )
    ?.map((contact) => (
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
      buttonTitle="Done"
      onSubmit={handleSubmit}
      submitButtonDisabled={isDisabledSubmit}
    >
      <Stack>
        <TeamSelector
          value={selectedTeamId}
          onChange={(value) => {
            setSelectedGroups([]);
            setSelectedIds([]);
            setSelectedTeamId(value);
          }}
        />
        <FilterSelect
          contactArray={filteredGroups?.map((data) => data?.name)}
          sourceArray={sourceArray}
          filterByTag={filterByTag}
          setFilterByTag={setFilterByTag}
        />
        <Group justify="space-between">
          {filterByTag?.length === 0 ? (
            <Checkbox
              aria-label="select all"
              label="Select All"
              checked={
                allContacts?.length &&
                allContacts?.every((customer) =>
                  selectedIds.includes(customer?.id),
                )
              }
              onChange={(event) => {
                if (event.currentTarget.checked) {
                  setSelectedIds(allContacts.map((customer) => customer?.id));
                } else setSelectedIds([]);
              }}
            />
          ) : (
            <Box />
          )}

          <SearchInput
            placeholder={"Search"}
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
                  <Table.Th />
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Phone Number</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>{rows}</Table.Tbody>
            </Table>
          </ScrollArea>
        </PaperLayout>
        <MultiSelect
          radius={"10px"}
          searchable
          clearable
          data={groupData}
          value={selectedGroups}
          onChange={setSelectedGroups}
          placeholder={selectedGroups.length > 0 ? "" : "Select Groups"}
        />
      </Stack>
    </FormModalLayout>
  );
};

export default ContactAction;
