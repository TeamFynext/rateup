import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";

import {
  ActionIcon,
  Card,
  Divider,
  Group,
  Loader,
  Stack,
  Text,
} from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import {
  IconRefresh,
  IconSearch,
  IconSquareRoundedX,
} from "@tabler/icons-react";
import { FixedSizeList as List } from "react-window";

import { WaInboxMessage } from "@/types/global";
import useTranslations from "@/dictionaries/useTranslation";

import { ContactsWithLastMessage } from "../../../../backend/whatsapp/inbox/message/wamessage.api";
import {
  useContactsWithLastMessage,
  useFilteredContacts,
} from "../../../../backend/whatsapp/inbox/message/wamessage.query";
import { ContainedTextField } from "../../../input/ContainedInput/ContainedInput";
import AddUnknownContactModal from "./addUnknownContactModal";
import WaInboxChatExport from "./chatExport";
import WaInboxChatFilter, { ChatFilter } from "./chatFilter";
import WaInboxChatSelectCard from "./chatselectCard";
import classes from "./styles.module.css";

export default function WaInboxChatSelect(props: {
  contacts: ContactsWithLastMessage[];
  setFilteredContacts: (contacts: ContactsWithLastMessage[]) => void;
  messageCount?: string;
  setNewlyAdddedContact?: React.Dispatch<
    React.SetStateAction<ContactsWithLastMessage>
  >;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<ChatFilter>({
    messageType: "all",
    strictFilter: false,
    searchTerm: "",
    contactGroups: [],
    campaigns: [],
    tags: [],
  });
  const [processedFilter, setProcessedFilter] = useState<ChatFilter>(filter);
  const { ref, width, height } = useElementSize();
  const [shouldFetchAgainData, setShouldFetchAgainData] = useState(true);
  const [
    shouldFetchAgainFilteredContacts,
    setShouldFetchAgainFilteredContacts,
  ] = useState(true);
  const { translations } = useTranslations();
  const {
    data: filteredContacts,
    isFetched: isFilteredContactsFetched,
    isFetchingNextPage: isFilteredContactsFetchingNextPage,
    error: filteredContactsError,
    fetchNextPage: fetchNextPageFilteredContacts,
    refetch: refetchFilteredContacts,
    isRefetching: isRefetchingFilteredContacts,
  } = useFilteredContacts(
    encodeURIComponent(JSON.stringify(processedFilter)),
    checkIfAnyFilterisActive(filter) ? true : false,
  );

  const {
    error, // Error
    fetchNextPage,
    isError,
    data,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useContactsWithLastMessage();

  if (!props.contacts) {
    return null;
  }
  function checkIfAnyFilterisActive(filters: any) {
    return (
      filters.contactGroups.length > 0 ||
      filters.campaigns.length > 0 ||
      filters.tags.length > 0 ||
      filters.searchTerm?.length > 0 ||
      filters.messageType !== "all" ||
      filters.strictFilter !== false
    );
  }
  function prepareFilters(filters: any) {
    setFilter(filters);
    if (checkIfAnyFilterisActive(filters)) {
      const processedFilters = {
        ...filters,
        contactGroups: filters?.contactGroups?.map((group) => group.value),
        campaigns: filters?.campaigns?.map((group) => group.value),
        tags: filters?.tags?.map((group) => ({
          [group.group]: group.value,
        })),
      };
      setProcessedFilter(processedFilters);
    }
  }
  const contactsToDisplay = checkIfAnyFilterisActive(filter)
    ? filteredContacts?.pages?.length > 0
      ? filteredContacts?.pages
          ?.flat()
          ?.map((page) => page)
          .flat()
      : []
    : props?.contacts?.map((contact) => ({
        ...contact,
        total_contact_count: props.messageCount,
      }));

  function validateSearchStringAsMobileNumber(searchString: string): Boolean {
    return searchString.match(/^\d{10}$/) ? true : false;
  }

  function clearSearchTermFilter() {
    const currentFilters = { ...filter };
    currentFilters.searchTerm = "";
    setFilter(currentFilters);
  }
  function openChatDisplayForContact(data: Partial<ContactsData>) {
    router.push(`/dashboard/whatsapp/inbox?contactId=${data.id}`);
  }
  function onUnknownContactAddSuccess(contact: ContactsData) {
    props.setNewlyAdddedContact({
      ...contact,
      groups: [],
      userInitiatedFinalTimeStamp: "",
      lastMessage: {
        messageBody: {} as WaInboxMessage,
        waCreatedAt: "",
      },
    });
    openChatDisplayForContact(contact);
  }

  useEffect(() => {
    if (
      data.pages.length > 0 &&
      data.pages[data.pages.length - 1].length === 0
    ) {
      setShouldFetchAgainData(false);
    } else {
      setShouldFetchAgainData(true);
    }
  }, [data]);

  useEffect(() => {
    if (filteredContacts.pages.length > 0) {
      props?.setFilteredContacts(
        filteredContacts?.pages?.map((page) => page).flat(),
      );
      if (
        filteredContacts.pages[filteredContacts.pages.length - 1].length === 0
      ) {
        setShouldFetchAgainFilteredContacts(false);
      } else {
        setShouldFetchAgainFilteredContacts(true);
      }
    }
  }, [filteredContacts]);

  return (
    <Stack className={classes.wrapper}>
      <Stack className={classes.chat_select_header}>
        <ContainedTextField
          leftSection={
            <IconSearch style={{ marginLeft: "var(--mantine-spacing-xs)" }} />
          }
          rightSection={
            filter.searchTerm && (
              <IconSquareRoundedX
                size={18}
                style={{ marginRight: "var(--mantine-spacing-xs)" }}
                onClick={clearSearchTermFilter}
              />
            )
          }
          placeholder={translations["Search Contacts"]}
          value={filter?.searchTerm || ""}
          onChange={(e) =>
            prepareFilters({ ...filter, searchTerm: e.currentTarget.value })
          }
        />
        <Group className={classes.chat_select_header_filter_add_section}>
          <Stack gap={0}>
            <Text className={classes.chat_select_filter_text}>All Chats</Text>
            <Group className={classes.chat_select_filter_indicator_wrapper}>
              <Text className={classes.chat_indicator_text}>
                {contactsToDisplay?.[0]?.total_contact_count || 0} Chats
              </Text>
              {(isFetchingNextPage || isFilteredContactsFetchingNextPage) && (
                <Loader size={10} />
              )}
              <ActionIcon
                size={"xs"}
                loading={isRefetching || isRefetchingFilteredContacts}
                onClick={() => {
                  if (checkIfAnyFilterisActive(filter)) {
                    refetchFilteredContacts();
                  } else {
                    refetch();
                  }
                }}
              >
                <IconRefresh />
              </ActionIcon>
            </Group>
          </Stack>
          <Group>
            <AddUnknownContactModal
              {...{
                phone: "",
                triggerType: "action_button",
                successCallback: (contact) =>
                  onUnknownContactAddSuccess(contact),
              }}
            />
            <WaInboxChatFilter {...{ filter, setFilter: prepareFilters }} />
            <WaInboxChatExport filter={filter} />
          </Group>
        </Group>
      </Stack>
      <Divider />
      {isFilteredContactsFetched && contactsToDisplay.length === 0 ? (
        validateSearchStringAsMobileNumber(filter.searchTerm) ? (
          <AddUnknownContactModal
            phone={filter.searchTerm}
            successCallback={(contact) => {
              prepareFilters({
                ...filter,
                searchTerm: "",
              });
              onUnknownContactAddSuccess(contact);
            }}
          />
        ) : (
          <Card component={Group}>
            <Text c={"dimmed"} size="sm" ta={"center"}>
              {translations["No chats found"]} <br />
              {translations["search for a valid phone number or contact name"]}
            </Text>
          </Card>
        )
      ) : (
        <div className={classes.chat_cards_wrapper} ref={ref}>
          <List
            height={height}
            width={width}
            itemCount={contactsToDisplay?.length || 0}
            itemSize={69}
            onItemsRendered={(e) => {
              if (filteredContacts?.pages?.length > 0) {
                if (
                  !isFilteredContactsFetchingNextPage &&
                  shouldFetchAgainFilteredContacts &&
                  e.visibleStopIndex === contactsToDisplay.length - 1
                ) {
                  fetchNextPageFilteredContacts();
                }
              } else if (
                !isFetchingNextPage &&
                shouldFetchAgainData &&
                e.visibleStopIndex === contactsToDisplay.length - 1
              ) {
                fetchNextPage();
              }
            }}
            overscanCount={2}
          >
            {({ index, style }) => {
              // Get the contact for this index
              const contact = contactsToDisplay[index];

              // Render the item
              return (
                <div style={style}>
                  <WaInboxChatSelectCard key={contact.id} contact={contact} />
                </div>
              );
            }}
          </List>
          {(isError || filteredContactsError) && (
            <Text size="xs" c="red">
              {error?.message}
              {filteredContactsError?.message}
            </Text>
          )}
        </div>
      )}
    </Stack>
  );
}
