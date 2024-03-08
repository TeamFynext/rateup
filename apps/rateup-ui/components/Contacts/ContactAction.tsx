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
import { useAddExistingContactToMultipleGroupsMutation } from "../../backend/campaign/contactGroup/contactGroup.query";
import { TeamSelector } from "../input/TeamSelector";
import { ContactAcions } from "../../pages/dashboard/contacts";

const ContactAction = ({ opened, close, allContacts, allGroups, action }) => {
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedGroups, setSelectedGroups] = useState([]);
  const contactsByTeam = allContacts?.filter(
    (contact) => selectedTeamId === contact?.teamId,
  );
  const deleteManyContactsMutation = useDeleteManyContactsMutation();
  const addContactToGroupsMutation =
    useAddExistingContactToMultipleGroupsMutation(selectedGroups);

  const isDisabledSubmit =
    action === ContactAcions.ADD_CONTACTS_TO_GROUP
      ? !selectedContactIds?.length || !selectedGroups?.length
      : !selectedContactIds?.length;
  //Todo : correct filtering using useEffect
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
        deleteManyContactsMutation.mutate(selectedContactIds, {
          onSuccess: () => {
            close();
          },
        });
        break;
      case ContactAcions.ADD_CONTACTS_TO_GROUP:
        addContactToGroupsMutation.mutate(
          { contactIds: selectedContactIds, contactGroupIds: selectedGroups },
          {
            onSuccess: () => {
              setSelectedContactIds([]);
              setSelectedTeamId(null);
              setSelectedGroups([]);
              close();
            },
          },
        );
        break;
    }
  };
  const rows = filteredContacts?.map((contact) => (
    <Table.Tr
      key={contact?.id}
      bg={
        selectedContactIds.includes(contact?.id)
          ? "var(--mantine-color-blue-light)"
          : undefined
      }
    >
      <Table.Td>
        <Checkbox
          aria-label="Select row"
          checked={selectedContactIds?.includes(contact?.id)}
          onChange={(event) =>
            setSelectedContactIds(
              event.currentTarget.checked
                ? [...selectedContactIds, contact?.id]
                : selectedContactIds.filter((id) => id !== contact?.id),
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
        setSelectedContactIds([]);
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
            setSelectedContactIds([]);
            setSelectedTeamId(value);
          }}
        />
        <Group justify="space-between">
          <Checkbox
            aria-label="select all"
            label="Select All"
            checked={contactsByTeam?.every((customer) =>
              selectedContactIds.includes(customer?.id),
            )}
            onChange={(event) =>
              setSelectedContactIds(
                event.currentTarget.checked
                  ? contactsByTeam.map((customer) => customer?.id)
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
