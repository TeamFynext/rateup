import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/router";

import {
  ActionIcon,
  Card,
  Group,
  Indicator,
  SegmentedControl,
  Stack,
  Tabs,
  Text,
} from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import {
  IconMessageCog,
  IconMessageDots,
  IconRefresh,
  IconSearch,
  IconSquareRoundedX,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { FixedSizeList as List } from "react-window";

import { WaInboxMessage } from "@/types/global";
import { useWsData } from "@/context/UserContext";
import useTranslations from "@/dictionaries/useTranslation";
import useContactStore from "@/pages/dashboard/whatsapp/inbox/store";

import {
  ContactsWithLastMessage,
  WaGetMessagesBody,
  WaMessagePage,
} from "../../../../backend/whatsapp/inbox/message/wamessage.api";
import {
  useContactsWithLastMessage,
  useFilteredContacts,
  useMessageCount,
  useWaTicktes,
} from "../../../../backend/whatsapp/inbox/message/wamessage.query";
import { ContainedTextField } from "../../../input/ContainedInput/ContainedInput";
import WhatsAppInboxLoader from "../loader";
import AddUnknownContactModal from "./addUnknownContactModal";
import WaInboxChatExport from "./chatExport";
import WaInboxChatFilter, { ChatFilter } from "./chatFilter";
import WaInboxChatSelectCard from "./chatselectCard";
import classes from "./styles.module.css";

enum TabsEnum {
  active = "active",
  all = "all",
}

const WaInboxChatSelect = () => {
  const router = useRouter();
  const [tab, setTab] = useState(TabsEnum.active);
  const [contactList, setContactList] = useState<ContactsWithLastMessage[]>([]);
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
  const { ref: ref2, width: width2, height: height2 } = useElementSize();
  const { ref: ref3, width: width3, height: height3 } = useElementSize();

  const queryClient = useQueryClient();
  const [shouldFetchAgainData, setShouldFetchAgainData] = useState(true);
  const [
    shouldFetchAgainFilteredContacts,
    setShouldFetchAgainFilteredContacts,
  ] = useState(true);
  const [shouldFetchAgainTickets, setShouldFetchAgainTickets] = useState(true);
  const { translations } = useTranslations();
  const checkIfAnyFilterisActive = useCallback((filters: any) => {
    return (
      filters.contactGroups.length > 0 ||
      filters.campaigns.length > 0 ||
      filters.tags.length > 0 ||
      filters.searchTerm?.length > 0 ||
      filters.messageType !== "all" ||
      filters.strictFilter !== false
    );
  }, []);

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
  // const {
  //   data: tickets,
  //   isPending: isTicketsLoading,
  //   error: ticketsError,
  //   fetchNextPage: fetchNextPageTickets,
  //   isError: isTicketsError,
  //   isFetchingNextPage: isTicketsFetchingNextPage,
  //   refetch: refetchTickets,
  //   isRefetching: isTicketsRefetching,
  // } = useWaTicktes();

  const {
    data: contactsWithLastMessage,
    isLoading: isContactsFetching,
    error,
    fetchNextPage,
    isError,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useContactsWithLastMessage(TabsEnum.active === tab);

  const { data: messageCount, isPending } = useMessageCount();
  const { wsData } = useWsData();

  const findAndReturnTheIndexOfTheContact = useCallback(
    (list: ContactsWithLastMessage[], contactId: string) => {
      return list.findIndex((contact) => contact.id === contactId);
    },
    [],
  );

  const updateTheContactObject = useCallback(
    (cObj: ContactsWithLastMessage, newMessage: WaGetMessagesBody) => {
      return {
        ...cObj,
        lastMessage: newMessage,
        userInitiatedFinalTimeStamp:
          newMessage.messageBody.exchangeProcess === "receive"
            ? newMessage.waCreatedAt
            : cObj?.userInitiatedFinalTimeStamp,
      };
    },
    [],
  );

  const updateWaContactsList = useCallback(
    (newMessage: { contact: ContactsData; message: WaGetMessagesBody }) => {
      setContactList((prevList) => {
        let updatedContacts = [...prevList];
        const contactIndex = findAndReturnTheIndexOfTheContact(
          updatedContacts,
          newMessage.contact.id,
        );
        if (contactIndex !== -1) {
          updatedContacts[contactIndex] = updateTheContactObject(
            updatedContacts[contactIndex],
            newMessage.message,
          );
        } else {
          queryClient.invalidateQueries({
            queryKey: ["contacts", "last-message"],
          });
        }
        return updatedContacts.sort((a, b) => {
          const aDate = new Date(a.lastMessage.waCreatedAt);
          const bDate = new Date(b.lastMessage.waCreatedAt);
          return bDate.getTime() - aDate.getTime();
        });
      });
    },
    [findAndReturnTheIndexOfTheContact, updateTheContactObject, queryClient],
  );

  useEffect(() => {
    if (contactsWithLastMessage) {
      setContactList(
        contactsWithLastMessage?.pages?.map((page) => page).flat(),
      );
    }
  }, [contactsWithLastMessage]);

  useEffect(() => {
    if (wsData && wsData.type === "inbox") {
      updateWaContactsList(wsData.inbox);
      const currentData: {
        pages: WaMessagePage[];
        pageParams: string[];
      } = queryClient.getQueryData(["wa-messages", wsData.inbox.contact.id]);
      if (currentData) {
        const newData = { ...currentData };
        if (!newData.pages[0].messages.includes(wsData.inbox.message)) {
          newData.pages[0].messages.push(wsData.inbox.message);
          queryClient.setQueryData(
            ["wa-messages", wsData.inbox.contact.id],
            newData,
          );
        }
      }
    }
  }, [wsData, updateWaContactsList, queryClient]);

  const searchParams = useSearchParams();
  const { setSelectedContact, selectedContact } = useContactStore();

  useEffect(() => {
    let contactId = searchParams.get("contactId");
    if (contactId) {
      let contact = contactList.find(
        (contact) => contact.id === searchParams.get("contactId"),
      );
      if (contact && selectedContact !== contact) {
        setSelectedContact(contact);
      }
    }
  }, [contactList, searchParams, selectedContact, setSelectedContact]);
  const prepareFilters = useCallback(
    (filters: any) => {
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
    },
    [checkIfAnyFilterisActive],
  );

  const contactsToDisplay = useMemo(() => {
    return checkIfAnyFilterisActive(filter)
      ? filteredContacts?.pages?.length > 0
        ? filteredContacts?.pages
            ?.flat()
            ?.map((page) => page)
            .flat()
        : []
      : contactList;
  }, [filter, filteredContacts, contactList, checkIfAnyFilterisActive]);

  const validateSearchStringAsMobileNumber = useCallback(
    (searchString: string): Boolean => {
      return searchString?.match(/^\d{10}$/) ? true : false;
    },
    [],
  );

  const clearSearchTermFilter = useCallback(() => {
    const currentFilters = { ...filter };
    currentFilters.searchTerm = "";
    setFilter(currentFilters);
  }, [filter]);

  const openChatDisplayForContact = useCallback(
    (data: Partial<ContactsData>) => {
      router.push(`/dashboard/whatsapp/inbox?contactId=${data.id}`);
    },
    [router],
  );

  const onUnknownContactAddSuccess = useCallback(
    (contact: ContactsData) => {
      setSelectedContact({
        ...contact,
        groups: [],
        userInitiatedFinalTimeStamp: "",
        lastMessage: {
          messageBody: {} as WaInboxMessage,
          waCreatedAt: "",
        },
      });
      openChatDisplayForContact(contact);
    },
    [openChatDisplayForContact, setSelectedContact],
  );

  useEffect(() => {
    if (
      contactsWithLastMessage?.pages.length > 0 &&
      contactsWithLastMessage?.pages[contactsWithLastMessage?.pages.length - 1]
        .length === 0
    ) {
      setShouldFetchAgainData(false);
    } else {
      setShouldFetchAgainData(true);
    }
  }, [contactsWithLastMessage]);

  useEffect(() => {
    if (filteredContacts.pages.length > 0) {
      setContactList(filteredContacts?.pages?.map((page) => page).flat());
      if (
        filteredContacts.pages[filteredContacts.pages.length - 1].length === 0
      ) {
        setShouldFetchAgainFilteredContacts(false);
      } else {
        setShouldFetchAgainFilteredContacts(true);
      }
    }
  }, [filteredContacts]);
  // useEffect(() => {
  //   if (tickets?.pages.length > 0) {
  //     setContactList(tickets?.pages?.map((page) => page).flat());
  //     if (tickets.pages[tickets.pages.length - 1].length === 0) {
  //       setShouldFetchAgainTickets(false);
  //     } else {
  //       setShouldFetchAgainTickets(true);
  //     }
  //   }
  // }, [tickets]);

  if (
    isContactsFetching ||
    isPending
    // || isTicketsLoading
  )
    return (
      <WhatsAppInboxLoader
        isLoading={
          isContactsFetching || isPending
          //  || isTicketsLoading
        }
      />
    );
  if (error) return <div>Error:{error?.message}</div>;

  return (
    <Stack className={classes.wrapper} gap={"xs"}>
      <Group className={classes.chat_select_header} gap={"xs"}>
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
          flex={1}
        />
        <AddUnknownContactModal
          phone=""
          triggerType="action_button"
          successCallback={onUnknownContactAddSuccess}
        />
        <Group className={classes.chat_select_filter_indicator_wrapper}>
          <ActionIcon
            h={30}
            w={30}
            variant="light"
            radius="md"
            loading={
              isFetchingNextPage ||
              isFilteredContactsFetchingNextPage ||
              isRefetching ||
              isRefetchingFilteredContacts
            }
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
        <WaInboxChatFilter filter={filter} setFilter={prepareFilters} />
        <WaInboxChatExport filter={filter} />
      </Group>
      <Tabs
        variant="pills"
        px="md"
        radius="md"
        styles={{
          panel: {
            paddingTop: 5,
          },
        }}
        value={tab}
        onChange={(value) => {
          setTab(value as TabsEnum);
          refetch();
          setFilter({
            ...filter,
            messageType: "all",
          });
        }}
      >
        <Tabs.List
          grow
          style={{
            borderRadius: "var(--tabs-radius)",
            border: ".5px dashed var(--tabs-color)",
          }}
        >
          {Object.values(TabsEnum).map((aTab) => (
            <Tabs.Tab
              key={aTab}
              value={aTab}
              leftSection={
                <Indicator
                  inline
                  label={messageCount[aTab] || 0}
                  size={16}
                  color="red"
                >
                  {aTab === TabsEnum.active && <IconMessageCog size={18} />}
                  {aTab === TabsEnum.all && <IconMessageDots size={18} />}
                </Indicator>
              }
            />
          ))}
        </Tabs.List>

        <Tabs.Panel value="active" h="80dvh">
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
                <Text c="dimmed" size="sm" ta="center">
                  {translations["No chats found"]} <br />
                  {
                    translations[
                      "search for a valid phone number or contact name"
                    ]
                  }
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
                  const contact = contactsToDisplay[index];
                  return (
                    <div style={style}>
                      <WaInboxChatSelectCard
                        key={contact.id}
                        contact={contact}
                      />
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
        </Tabs.Panel>
        <Tabs.Panel value="all" h="80dvh">
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
                <Text c="dimmed" size="sm" ta="center">
                  {translations["No chats found"]} <br />
                  {
                    translations[
                      "search for a valid phone number or contact name"
                    ]
                  }
                </Text>
              </Card>
            )
          ) : (
            <div className={classes.chat_cards_wrapper} ref={ref2}>
              <List
                height={height2}
                width={width2}
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
                  const contact = contactsToDisplay[index];
                  return (
                    <div style={style}>
                      <WaInboxChatSelectCard
                        key={contact.id}
                        contact={contact}
                      />
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
        </Tabs.Panel>
        <Tabs.Panel value="tickets" h="80dvh">
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
                <Text c="dimmed" size="sm" ta="center">
                  {translations["No chats found"]} <br />
                  {
                    translations[
                      "search for a valid phone number or contact name"
                    ]
                  }
                </Text>
              </Card>
            )
          ) : (
            <div className={classes.chat_cards_wrapper} ref={ref3}>
              <List
                height={height3}
                width={width3}
                itemCount={contactsToDisplay?.length || 0}
                itemSize={69}
                onItemsRendered={(e) => {
                  //   if (tickets?.pages?.length > 0) {
                  // if (
                  //   !isTicketsFetchingNextPage &&
                  //   shouldFetchAgainTickets &&
                  //   e.visibleStopIndex === contactsToDisplay.length - 1
                  // ) {
                  //   fetchNextPageTickets();
                  // }
                }}
                overscanCount={2}
              >
                {({ index, style }) => {
                  const contact = contactsToDisplay[index];
                  return (
                    <div style={style}>
                      <WaInboxChatSelectCard
                        key={contact.id}
                        contact={contact}
                      />
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
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};

export default React.memo(WaInboxChatSelect);
