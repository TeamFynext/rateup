import {
  Button,
  Checkbox,
  Group,
  ScrollArea,
  SimpleGrid,
  Stack,
  Title,
  Text,
  Paper,
  Flex,
  Loader,
  Box,
} from "@mantine/core";
import { IconPlus, IconUser, IconUsers } from "@tabler/icons-react";
import { ContainedTextField } from "../input/ContainedInput/ContainedInput";
import { useContacts } from "../../backend/campaign/contacts/contacts.query";
import { useState } from "react";
import { useContactGroupsByTeamId } from "../../backend/campaign/contactGroup/contactGroup.query";
import { useAddCampaignParticipants } from "../../backend/campaign/campaignParticipants/campaignParticipants.query";
import { showWarnToast } from "../../utils/notifications";
import { CampaignParticipantSource } from "../../types/enums";
import { useListState } from "@mantine/hooks";

const AddParticipantModal = ({ close, campaign }) => {
  const [selectedTab, setSelectedTab] = useState(
    CampaignParticipantSource.INDIVIDUAL,
  );
  const [selectedContacts, selectedContactsHandlers] = useListState([]);
  const [selectedGroups, selectedGroupsHandlers] = useListState([]);

  const [searchText, setSearchText] = useState("");
  const { data: contacts, isLoading: contactIsLoading } = useContacts();
  const { data: contactGroup, isLoading: groupIsLoading } =
    useContactGroupsByTeamId(campaign?.teamId);

  const isSelectedAll =
    selectedTab === CampaignParticipantSource.INDIVIDUAL
      ? selectedContacts.length === contacts?.length
      : selectedGroups.length === contactGroup?.data.length;

  const addCampaignParticipants = useAddCampaignParticipants(campaign?.id);

  const handleSubmit = () => {
    if (!selectedContacts.length && !selectedGroups.length) {
      showWarnToast("You have not selected any participant");
      return;
    }

    const contactIds = selectedContacts.map((customer) => customer.id);
    const groupIds = selectedGroups.map((group) => group.id);
    const participants = { contactIds: contactIds, groupIds: groupIds };
    addCampaignParticipants.mutate(
      { data: participants, campaignId: campaign?.id },
      {
        onSuccess: () => close(),
      },
    );
  };

  function handleSelectAll(e) {
    if (e.target.checked) {
      if (selectedTab == CampaignParticipantSource.INDIVIDUAL) {
        selectedContactsHandlers.setState(contacts);
      } else {
        selectedGroupsHandlers.setState(contactGroup.data);
      }
    } else {
      if (selectedTab == CampaignParticipantSource.INDIVIDUAL) {
        selectedContactsHandlers.setState([]);
      } else {
        selectedGroupsHandlers.setState([]);
      }
    }
  }

  const filteredContacts = searchText
    ? contacts?.filter(
        (c) =>
          c.name.toLowerCase().includes(searchText.toLowerCase()) ||
          c.phone.includes(searchText),
      )
    : contacts?.filter((c) => c.phone != null);
  const filteredGroups = searchText
    ? contactGroup?.data.filter((g) =>
        g.name.toLowerCase().includes(searchText.toLowerCase()),
      )
    : contactGroup?.data;
  return (
    <Box p={"lg"}>
      <Stack>
        <Group justify="space-between">
          <Title order={2}>Add Participants</Title>
          <Group>
            <Button
              variant={
                selectedTab == CampaignParticipantSource.INDIVIDUAL
                  ? "outline"
                  : "default"
              }
              leftSection={<IconUser />}
              radius={"md"}
              onClick={() =>
                setSelectedTab(CampaignParticipantSource.INDIVIDUAL)
              }
            >
              Individual
            </Button>
            <Button
              variant={
                selectedTab == CampaignParticipantSource.GROUP
                  ? "outline"
                  : "default"
              }
              leftSection={<IconUsers />}
              radius={"md"}
              onClick={() => setSelectedTab(CampaignParticipantSource.GROUP)}
            >
              Group
            </Button>
          </Group>
        </Group>
        <SimpleGrid cols={2}>
          <Stack gap={1}>
            <Group justify="space-between" mb={"xs"}>
              <Title order={6}>Select Contacts</Title>
              <Checkbox
                label="Select all"
                c={"#149a8a"}
                checked={isSelectedAll}
                onChange={handleSelectAll}
              />
            </Group>
            <ContainedTextField
              placeholder="Search contacts"
              radius={"lg"}
              size="md"
              value={searchText}
              onChange={(e) => setSearchText(e.currentTarget.value)}
            />
            <ScrollArea h={200}>
              <Paper shadow="xl" p={"lg"}>
                {contactIsLoading || (groupIsLoading && <Loader type="bars" />)}
                {selectedTab == CampaignParticipantSource.INDIVIDUAL &&
                  (filteredContacts?.length > 0 ? (
                    filteredContacts.map((contact) => (
                      <Individual
                        customer={contact}
                        selectedContacts={selectedContacts}
                        selectedContactsHandlers={selectedContactsHandlers}
                        key={contact?.id}
                        participants={campaign?.campaignParticipants}
                      />
                    ))
                  ) : (
                    <Text>No contacts found</Text>
                  ))}
                {selectedTab == CampaignParticipantSource.GROUP &&
                  (filteredGroups?.length > 0 ? (
                    filteredGroups.map((group) => (
                      <CustomerGroup
                        group={group}
                        selectedGroups={selectedGroups}
                        selectedGroupsHandlers={selectedGroupsHandlers}
                        key={group.id}
                      />
                    ))
                  ) : (
                    <Text>No group found</Text>
                  ))}
              </Paper>
            </ScrollArea>
          </Stack>
          <ScrollArea h={200}>
            {selectedContacts?.length || selectedGroups?.length ? (
              <Paper shadow="xl" p={"lg"}>
                {selectedContacts?.map((customer) => (
                  <Individual
                    customer={customer}
                    selectedContacts={selectedContacts}
                    selectedContactsHandlers={selectedContactsHandlers}
                    key={customer?.id}
                    participants={campaign?.campaignParticipants}
                  />
                ))}
                {selectedGroups?.map((group) => (
                  <CustomerGroup
                    group={group}
                    selectedGroups={selectedGroups}
                    selectedGroupsHandlers={selectedGroupsHandlers}
                    key={group?.id}
                  />
                ))}
              </Paper>
            ) : (
              <></>
            )}
          </ScrollArea>
        </SimpleGrid>
        <Flex justify={"flex-end"} gap={"md"} mt={"md"}>
          <Button variant="outline" radius={"xl"} onClick={close}>
            Cancel
          </Button>
          <Button
            radius={"xl"}
            leftSection={<IconPlus />}
            onClick={handleSubmit}
            loading={addCampaignParticipants.isPending}
          >
            Add Participants
          </Button>
        </Flex>
      </Stack>
    </Box>
  );
};

const Individual = ({
  customer,
  selectedContacts,
  selectedContactsHandlers,
  participants,
}) => {
  const isSelected = selectedContacts.some((c) => c?.id === customer?.id);

  const isAlreadySeleted = participants.some(
    (c) => c?.contactId === customer?.id,
  );

  return (
    <Group justify="space-between" my={"xs"}>
      <Stack gap={0}>
        <Title order={5}>{customer?.name}</Title>
        <Text c={"dimmed"} size="sm">
          {customer?.phone}
        </Text>
      </Stack>
      {isSelected ? (
        <Button
          variant="outline"
          onClick={() => {
            selectedContactsHandlers.filter((c) => c?.id !== customer?.id);
          }}
          radius={"xl"}
          size="sm"
        >
          Remove
        </Button>
      ) : (
        <Button
          onClick={() => {
            selectedContactsHandlers.append(customer);
          }}
          radius={"xl"}
          size="sm"
          w={90}
          disabled={isAlreadySeleted}
        >
          {isAlreadySeleted ? "Added" : "Add"}
        </Button>
      )}
    </Group>
  );
};

const CustomerGroup = ({ group, selectedGroups, selectedGroupsHandlers }) => {
  const isSelected = selectedGroups.some((c) => c?.id === group?.id);

  return (
    <Group justify="space-between">
      <Stack gap={0}>
        <Title order={5}>{group?.name}</Title>
        <Text c={"dimmed"} size="sm">
          {group?._count.contacts} members
        </Text>
      </Stack>
      {isSelected ? (
        <Button
          variant="outline"
          onClick={() => {
            selectedGroupsHandlers.filter((c) => c?.id !== group?.id);
          }}
          radius={"xl"}
          size="sm"
        >
          Remove
        </Button>
      ) : (
        <Button
          onClick={() => {
            selectedGroupsHandlers.append(group);
          }}
          radius={"xl"}
          size="sm"
          w={90}
          disabled={!group?._count.contacts}
        >
          Add
        </Button>
      )}
    </Group>
  );
};

export default AddParticipantModal;
