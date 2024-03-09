import {
  Checkbox,
  Group,
  MultiSelect,
  ScrollArea,
  Stack,
  Table,
} from "@mantine/core";
import FormModalLayout from "../Modal/FormModalLayout";
import PaperLayout from "../styled/Layouts/PaperLayout";
import { useState } from "react";
import { SearchInput } from "../../pages/dashboard/campaign";
import { useDeleteManyContactsMutation } from "../../backend/campaign/contacts/contacts.query";
import {
  useAddExistingContactToMultipleGroupsMutation,
  useDeleteManyContactGroupsMutation,
} from "../../backend/campaign/contactGroup/contactGroup.query";
import { TeamSelector } from "../input/TeamSelector";
import { ContactAcions } from "../../pages/dashboard/contacts";

const ContactAction = ({ opened, close, allContacts, allGroups, action }) => {
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedGroups, setSelectedGroups] = useState([]);
  const contactsByTeam = allContacts?.filter(
    (contact) => selectedTeamId === contact?.teamId,
  );
  const groupByTeams = allGroups?.filter(
    (group) => selectedTeamId === group?.teamId,
  );
  const deleteManyContactsMutation = useDeleteManyContactsMutation();
  const deleteManyContactGroupsMutation = useDeleteManyContactGroupsMutation();
  const addContactToGroupsMutation =
    useAddExistingContactToMultipleGroupsMutation(selectedGroups);

  const isDisabledSubmit =
    action === ContactAcions.ADD_CONTACTS_TO_GROUP
      ? !selectedIds?.length || !selectedGroups?.length
      : !selectedIds?.length;
  const filteredGroups = allGroups?.filter(
    (group) => group?.teamId === selectedTeamId,
  );
  const groupData = filteredGroups?.map((g) => ({
    label: g?.name,
    value: g?.id,
  }));
  const filteredContacts = searchText
    ? contactsByTeam?.filter(
        (contact) =>
          contact?.name.toLowerCase().includes(searchText.toLowerCase()) ||
          contact?.phone?.includes(searchText) ||
          contact?.email?.includes(searchText),
      )
    : contactsByTeam;

  const handleSubmit = () => {
    switch (action) {
      case ContactAcions.DELETE_CONTACTS:
        deleteManyContactsMutation.mutate(selectedIds, {
          onSuccess: () => {
            setSelectedIds([]);
            setSelectedTeamId(null);
            close();
          },
        });
        break;
      case ContactAcions.ADD_CONTACTS_TO_GROUP:
        addContactToGroupsMutation.mutate(
          { contactIds: selectedIds, contactGroupIds: selectedGroups },
          {
            onSuccess: () => {
              setSelectedIds([]);
              setSelectedTeamId(null);
              setSelectedGroups([]);
              close();
            },
          },
        );
        break;
      case ContactAcions.DELETE_GROUPS:
        deleteManyContactGroupsMutation.mutate(selectedIds, {
          onSuccess: () => {
            setSelectedIds([]);
            setSelectedTeamId(null);
            close();
          },
        });
        break;
    }
  };
  const rows = filteredContacts?.map((contact) => (
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

  const groupRows = filteredGroups?.map((group) => (
    <Table.Tr
      key={group?.id}
      bg={
        selectedIds.includes(group?.id)
          ? "var(--mantine-color-blue-light)"
          : undefined
      }
    >
      <Table.Td>
        <Checkbox
          aria-label="Select row"
          checked={selectedIds?.includes(group?.id)}
          onChange={(event) =>
            setSelectedIds(
              event.currentTarget.checked
                ? [...selectedIds, group?.id]
                : selectedIds.filter((id) => id !== group?.id),
            )
          }
        />
      </Table.Td>
      <Table.Td>{group?.name}</Table.Td>
      <Table.Td>{group?._count.contacts}</Table.Td>
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
        <Group justify="space-between">
          <Checkbox
            aria-label="select all"
            label="Select All"
            checked={
              action == ContactAcions.DELETE_GROUPS
                ? groupByTeams?.length &&
                  groupByTeams?.every((group) =>
                    selectedIds.includes(group?.id),
                  )
                : contactsByTeam?.length &&
                  contactsByTeam?.every((customer) =>
                    selectedIds.includes(customer?.id),
                  )
            }
            onChange={(event) => {
              if (event.currentTarget.checked) {
                setSelectedIds(
                  action == ContactAcions.DELETE_GROUPS
                    ? groupByTeams.map((group) => group.id)
                    : contactsByTeam.map((customer) => customer?.id),
                );
              } else setSelectedIds([]);
            }}
          />
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
                {action == ContactAcions.DELETE_CONTACTS && (
                  <Table.Tr>
                    <Table.Th />
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Phone Number</Table.Th>
                  </Table.Tr>
                )}
                {action == ContactAcions.DELETE_GROUPS && (
                  <Table.Tr>
                    <Table.Th />
                    <Table.Th>Group</Table.Th>
                    <Table.Th>Members</Table.Th>
                  </Table.Tr>
                )}
              </Table.Thead>
              <Table.Tbody>
                {action == ContactAcions.DELETE_GROUPS ? groupRows : rows}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </PaperLayout>
        {action == ContactAcions.ADD_CONTACTS_TO_GROUP ? (
          <MultiSelect
            radius={"10px"}
            searchable
            clearable
            data={groupData}
            value={selectedGroups}
            onChange={setSelectedGroups}
            placeholder={selectedGroups.length > 0 ? "" : "Select Groups"}
          />
        ) : null}
      </Stack>
    </FormModalLayout>
  );
};

export default ContactAction;
