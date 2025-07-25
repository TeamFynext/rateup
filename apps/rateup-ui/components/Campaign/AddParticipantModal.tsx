import { useState } from "react";

import {
  Box,
  Button,
  Checkbox,
  CloseButton,
  Flex,
  Group,
  Loader,
  MultiSelect,
  ScrollArea,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import { useDebouncedState, useListState } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";

import useTranslations from "@/dictionaries/useTranslation";

import { useCampaignData } from "../../backend/campaign/campaign.query";
import { useAddCampaignParticipants } from "../../backend/campaign/campaignParticipants/campaignParticipants.query";
import { useContactGroupsByTeamId } from "../../backend/campaign/contactGroup/contactGroup.query";
import { useContacts } from "../../backend/campaign/contacts/contacts.query";
import {
  CampaignParticipantAddStatus,
  CampaignParticipantSource,
  ContactGroupType,
} from "../../types/enums";
import { PAGE_SIZE } from "../../utils/constants";
import { showWarnToast } from "../../utils/notifications";
import ContactPagination from "../Contacts/ContactPagination";
import { ContainedTextField } from "../input/ContainedInput/ContainedInput";
import RateupLoader from "../Loaders/RateupLoader";
import PaperLayout from "../styled/Layouts/PaperLayout";

const AddParticipantModal = ({ close, campaign, campaignType }) => {
  const [selectedTab, setSelectedTab] = useState(
    CampaignParticipantSource.INDIVIDUAL,
  );
  const [selectedContacts, selectedContactsHandlers] = useListState([]);
  const [selectedGroups, selectedGroupsHandlers] = useListState([]);
  const [selectedCampaigns, selectedCampaignsHandlers] = useListState([]);
  const [selectedStatus, selectedStatusHandlers] = useListState(
    Object.values(CampaignParticipantAddStatus) || [],
  );

  const [searchText, setSearchText] = useDebouncedState("", 200);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: Number(PAGE_SIZE[0]),
  });
  const { data, isPending } = useContacts(pagination, searchText);
  const { translations } = useTranslations();
  const { data: contactGroup, isLoading: groupIsLoading } =
    useContactGroupsByTeamId(campaign?.teamId);
  const { data: campaignData, isPending: isAllCampaignLoading } =
    useCampaignData(campaignType);
  const addCampaignParticipants = useAddCampaignParticipants(
    campaign?.id,
    () => {
      close();
    },
  );
  if (isPending) return <RateupLoader />;
  let contacts = data?.users;
  const isSelectedAll =
    selectedTab === CampaignParticipantSource.INDIVIDUAL
      ? selectedContacts.length === contacts?.length
      : selectedGroups.length === contactGroup?.data.length;

  const handleSubmit = () => {
    if (
      selectedContacts.length === 0 &&
      selectedGroups.length === 0 &&
      selectedCampaigns?.length === 0
    ) {
      showWarnToast(translations["You have not selected any participant"]);
      return;
    }

    const contactIds = selectedContacts.map((customer) => customer.id);
    const groupIds = selectedGroups.map((group) => group.id);
    const campaignIds = selectedCampaigns.map((campaign) => campaign.id);
    const participants = {
      contactIds,
      groupIds,
      campaignIds,
      status: selectedStatus,
    };
    addCampaignParticipants.mutate({
      data: participants,
      campaignId: campaign?.id,
    });
  };

  function handleSelectAll(e) {
    const isChecked = e.target.checked;
    const emptyState = [];

    switch (selectedTab) {
      case CampaignParticipantSource.INDIVIDUAL:
        selectedContactsHandlers.setState(isChecked ? contacts : emptyState);
        break;
      case CampaignParticipantSource.GROUP:
        selectedGroupsHandlers.setState(
          isChecked
            ? contactGroup.data?.filter((data) => data?._count.contacts)
            : emptyState,
        );
        break;
      case CampaignParticipantSource.CAMPAIGN:
        selectedCampaignsHandlers.setState(
          isChecked
            ? campaignData.data?.filter(
                (data) => data?.campaignParticipantsCount,
              )
            : emptyState,
        );
        break;
      default:
        break;
    }
  }

  const filteredContacts = contacts?.filter((c) => c.phone != null);
  const filteredGroups = searchText
    ? contactGroup?.data.filter((g) =>
        g.name.toLowerCase().includes(searchText.toLowerCase()),
      )
    : contactGroup?.data;
  const filteredCampaigns = searchText
    ? campaignData?.data.filter((g) =>
        g.name.toLowerCase().includes(searchText.toLowerCase()),
      )
    : campaignData?.data;
  let totalPageCount = (data?.totalCount ?? 1) / pagination.pageSize;

  return (
    <Box px={"md"} pb={"md"}>
      <Stack>
        <SimpleGrid cols={2}>
          <ContainedTextField
            placeholder={`Search ${selectedTab?.toLowerCase()}`}
            defaultValue={searchText}
            onChange={(e) => setSearchText(e.currentTarget.value)}
            rightSection={
              <CloseButton
                aria-label="Clear input"
                onClick={() => setSearchText("")}
                display={searchText ? undefined : "none"}
                mr={"xs"}
              />
            }
            mah={40}
          />
          <SegmentedControl
            data={Object.values(CampaignParticipantSource)}
            value={selectedTab}
            onChange={(value) =>
              setSelectedTab(value as CampaignParticipantSource)
            }
            color={"var(--mantine-color-whatsapp-green-filled)"}
            radius={"md"}
            defaultValue={CampaignParticipantSource.INDIVIDUAL}
            tt={"capitalize"}
            miw={200}
          />
          <Stack gap={1}>
            <PaperLayout>
              <Group justify="space-between" mb={4}>
                <Title order={6}>
                  {translations["Select"]} {selectedTab?.toLowerCase()}
                </Title>
                <Checkbox
                  label={translations["Select all"]}
                  c={"#149a8a"}
                  checked={isSelectedAll}
                  onChange={handleSelectAll}
                />
              </Group>
              <ScrollArea h={300} pr={"sm"}>
                <Tabs value={selectedTab} color="var(--tertiary-color)">
                  {isPending ||
                    isAllCampaignLoading ||
                    (groupIsLoading && <Loader type="bars" />)}
                  <Tabs.Panel value={CampaignParticipantSource.INDIVIDUAL}>
                    {filteredContacts?.length > 0 ? (
                      filteredContacts.map((contact) => {
                        const isAlreadySeleted =
                          contact?.campaignParticipants?.some(
                            (c) => c?.campaignId === campaign?.id,
                          );
                        return (
                          <Individual
                            customer={contact}
                            selectedContacts={selectedContacts}
                            selectedContactsHandlers={selectedContactsHandlers}
                            key={contact?.id}
                            isAlreadySelected={isAlreadySeleted}
                          />
                        );
                      })
                    ) : (
                      <Text>{translations["No contacts found"]}</Text>
                    )}
                  </Tabs.Panel>
                  <Tabs.Panel value={CampaignParticipantSource.GROUP}>
                    {filteredGroups?.length > 0 ? (
                      filteredGroups.map((group) => (
                        <CustomerGroup
                          group={group}
                          selectedGroups={selectedGroups}
                          selectedGroupsHandlers={selectedGroupsHandlers}
                          key={group.id}
                        />
                      ))
                    ) : (
                      <Text>{translations["No group found"]}</Text>
                    )}
                  </Tabs.Panel>
                  <Tabs.Panel value={CampaignParticipantSource.CAMPAIGN}>
                    <MultiSelect
                      label={translations["message status"]}
                      placeholder={translations["Pick status"]}
                      data={Object.values(CampaignParticipantAddStatus)}
                      onChange={(e: any) => selectedStatusHandlers.setState(e)}
                      value={selectedStatus}
                      searchable
                      hidePickedOptions
                    />
                    {filteredCampaigns?.length > 0 ? (
                      filteredCampaigns.map((campaign) => (
                        <CustomerCampaign
                          campaign={campaign}
                          selectedCampaigns={selectedCampaigns}
                          selectedCampaignsHandlers={selectedCampaignsHandlers}
                          key={campaign.id}
                        />
                      ))
                    ) : (
                      <Text>{translations["No group found"]}</Text>
                    )}
                  </Tabs.Panel>
                </Tabs>
              </ScrollArea>
              {selectedTab === CampaignParticipantSource.INDIVIDUAL &&
                filteredContacts?.length > 0 && (
                  <ContactPagination
                    pagination={pagination}
                    setPagination={setPagination}
                    totalPageCount={totalPageCount}
                  />
                )}
            </PaperLayout>
          </Stack>
          {selectedContacts?.length > 0 ||
          selectedGroups?.length > 0 ||
          selectedCampaigns?.length > 0 ? (
            <PaperLayout>
              <ScrollArea h={325} pr={"sm"}>
                {selectedContacts?.map((customer) => {
                  const isAlreadySeleted = customer.campainParticipants?.some(
                    (c) => c?.campaignId === campaign?.id,
                  );
                  return (
                    <Individual
                      customer={customer}
                      selectedContacts={selectedContacts}
                      selectedContactsHandlers={selectedContactsHandlers}
                      key={customer?.id}
                      isAlreadySelected={isAlreadySeleted}
                    />
                  );
                })}
                {selectedGroups?.map((group) => (
                  <CustomerGroup
                    group={group}
                    selectedGroups={selectedGroups}
                    selectedGroupsHandlers={selectedGroupsHandlers}
                    key={group?.id}
                  />
                ))}
                {selectedCampaigns?.map((group) => (
                  <CustomerCampaign
                    campaign={group}
                    selectedCampaigns={selectedCampaigns}
                    selectedCampaignsHandlers={selectedCampaignsHandlers}
                    key={group?.id}
                  />
                ))}
              </ScrollArea>
            </PaperLayout>
          ) : (
            <></>
          )}
        </SimpleGrid>
        <Flex justify={"flex-end"} gap={"md"}>
          <Button variant="outline" radius={"xl"} onClick={close}>
            {translations["Cancel"]}
          </Button>
          <Button
            radius={"xl"}
            leftSection={<IconPlus />}
            onClick={handleSubmit}
            loading={addCampaignParticipants.isPending}
          >
            {translations["Add Participants"]}
          </Button>
        </Flex>
      </Stack>
    </Box>
  );
};

export const Individual = ({
  customer,
  selectedContacts,
  selectedContactsHandlers,
  isAlreadySelected = false,
}) => {
  const isSelected = selectedContacts.some((c) => c?.id === customer?.id);
  const { translations } = useTranslations();

  return (
    <Group justify="space-between" my={"xs"}>
      <Stack gap={0}>
        <Title order={5} lineClamp={1} maw={190}>
          {customer?.name}
        </Title>
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
          {translations["Remove"]}
        </Button>
      ) : (
        <Button
          onClick={() => {
            selectedContactsHandlers.append(customer);
          }}
          radius={"xl"}
          size="sm"
          w={90}
          disabled={isAlreadySelected}
        >
          {isAlreadySelected ? translations["Added"] : translations["Add"]}
        </Button>
      )}
    </Group>
  );
};

export const CustomerGroup = ({
  group,
  selectedGroups,
  selectedGroupsHandlers,
  isAlreadySelected = false,
}) => {
  const isSelected = selectedGroups.some((c) => c?.id === group?.id);
  const { translations } = useTranslations();
  return (
    <Group justify="space-between">
      <Stack gap={0}>
        <Title order={5} lineClamp={1} maw={190}>
          {group?.name}
        </Title>
        <Text c={"dimmed"} size="sm">
          {group.type === ContactGroupType.NORMAL
            ? group?._count.contacts
            : group._count.LoyaltyCustomerMap}{" "}
          members
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
          {translations["Remove"]}
        </Button>
      ) : (
        <Button
          onClick={() => {
            selectedGroupsHandlers.append(group);
          }}
          radius={"xl"}
          size="sm"
          w={90}
          disabled={
            isAlreadySelected ||
            (group.type === ContactGroupType.NORMAL
              ? !group?._count.contacts
              : !group._count.LoyaltyCustomerMap)
          }
        >
          {isAlreadySelected ? translations["Added"] : translations["Add"]}
        </Button>
      )}
    </Group>
  );
};
const CustomerCampaign = ({
  campaign,
  selectedCampaigns,
  selectedCampaignsHandlers,
}) => {
  const isSelected = selectedCampaigns.some((c) => c?.id === campaign?.id);
  const { translations } = useTranslations();
  return (
    <Group justify="space-between" py={4}>
      <Title order={5} lineClamp={1} maw={190}>
        {campaign?.name}
      </Title>
      {isSelected ? (
        <Button
          variant="outline"
          onClick={() => {
            selectedCampaignsHandlers.filter((c) => c?.id !== campaign?.id);
          }}
          radius={"xl"}
          size="sm"
        >
          {translations["Remove"]}
        </Button>
      ) : (
        <Button
          onClick={() => {
            selectedCampaignsHandlers.append(campaign);
          }}
          radius={"xl"}
          size="sm"
          w={90}
          disabled={!campaign?.campaignParticipantsCount}
        >
          {translations["Add"]}
        </Button>
      )}
    </Group>
  );
};
export default AddParticipantModal;
