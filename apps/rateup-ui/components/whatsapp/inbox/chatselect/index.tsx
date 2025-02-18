import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/router";

import {
  ActionIcon,
  Card,
  Divider,
  Group,
  Indicator,
  Stack,
  Tabs,
  Text,
} from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import {
  IconMessageCog,
  IconRefresh,
  IconSearch,
  IconSquareRoundedX,
  IconTicket,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";

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
import TicketSelectCard from "./ticketSelectCard";

enum TabsEnum {
  all = "all",
  tickets = "tickets",
}

const WaInboxChatSelect = () => {
  const router = useRouter();
  const [filter, setFilter] = useState<ChatFilter>({
    messageType: "usermessages",
    strictFilter: false,
    searchTerm: "",
    contactGroups: [],
    campaigns: [],
    tags: [],
  });
  const [processedFilter, setProcessedFilter] = useState<ChatFilter>(filter);

  const queryClient = useQueryClient();

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
    status: filteredContactsStatus,
    data: filteredContacts,
    isFetchingNextPage: isFilteredContactsFetchingNextPage,
    error: filteredContactsError,
    fetchNextPage: fetchNextPageFilteredContacts,
    refetch: refetchFilteredContacts,
    isRefetching: isRefetchingFilteredContacts,
    hasNextPage: hasNextPageFilteredContacts,
  } = useFilteredContacts(
    encodeURIComponent(JSON.stringify(processedFilter)),
    checkIfAnyFilterisActive(filter) ? true : false,
  );

  const {
    status: ticketsStatus,
    data: tickets,
    isPending: isTicketsLoading,
    error: ticketsError,
    fetchNextPage: fetchNextPageTickets,
    isFetchingNextPage: isTicketsFetchingNextPage,
    hasNextPage: hasNextPageTickets,
  } = useWaTicktes();

  const {
    status,
    data,
    isLoading: isContactsFetching,
    error,
    fetchNextPage,
    isFetchingNextPage,
    refetch,
    isFetching,
    isRefetching,
    hasNextPage,
  } = useContactsWithLastMessage(filter.messageType === "all");
  const { data: messageCount, isPending } = useMessageCount();

  const allFilteredContacts = useMemo(
    () =>
      filteredContacts ? filteredContacts.pages.flatMap((d) => d.rows) : [],
    [filteredContacts],
  );
  const allContactsRow = useMemo(
    () => (data ? data.pages.flatMap((d) => d.rows) : []),
    [data],
  );
  const allTicketsRow = useMemo(
    () => (tickets ? tickets.pages.flatMap((d) => d.rows) : []),
    [tickets],
  );

  const listRows = checkIfAnyFilterisActive(filter)
    ? allFilteredContacts
    : allContactsRow;

  const parentRef = useRef(null);
  const ticketsParentRef = useRef(null);

  // The virtualizer
  const contactRowVirtualizer = useVirtualizer({
    count: hasNextPage ? listRows.length + 1 : listRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 70,
    overscan: 5,
  });
  const ticketsRowVirtualizer = useVirtualizer({
    count: hasNextPageTickets ? allTicketsRow.length + 1 : allTicketsRow.length,
    getScrollElement: () => ticketsParentRef.current,
    estimateSize: () => 83,
    overscan: 5,
  });
  useEffect(() => {
    const [lastItem] = [...contactRowVirtualizer.getVirtualItems()].reverse();

    if (!lastItem) {
      return;
    }

    if (
      checkIfAnyFilterisActive(filter) &&
      lastItem.index >= allFilteredContacts.length - 1 &&
      hasNextPageFilteredContacts &&
      !isFilteredContactsFetchingNextPage
    ) {
      fetchNextPageFilteredContacts();
    } else if (
      lastItem.index >= allContactsRow.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }, [
    allContactsRow.length,
    allFilteredContacts.length,
    checkIfAnyFilterisActive,
    contactRowVirtualizer,
    fetchNextPage,
    fetchNextPageFilteredContacts,
    filter,
    hasNextPage,
    hasNextPageFilteredContacts,
    isFetchingNextPage,
    isFilteredContactsFetchingNextPage,
  ]);

  useEffect(() => {
    const [lastItem] = [...ticketsRowVirtualizer.getVirtualItems()].reverse();

    if (!lastItem) {
      return;
    }

    if (
      lastItem.index >= allTicketsRow.length - 1 &&
      hasNextPageTickets &&
      !isTicketsFetchingNextPage
    ) {
      fetchNextPageTickets();
    }
  }, [
    allTicketsRow.length,
    ticketsRowVirtualizer,
    fetchNextPageTickets,
    hasNextPageTickets,
    isTicketsFetchingNextPage,
  ]);

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
  const { setSelectedContact, selectedContact } = useContactStore();

  const updateWaContactsList = useCallback(
    (newMessage: { contact: ContactsData; message: WaGetMessagesBody }) => {
      let updatedContacts = [...listRows];
      const contactIndex = findAndReturnTheIndexOfTheContact(
        updatedContacts,
        newMessage.contact.id,
      );
      const contactId = useContactStore.getState().selectedContact?.id;
      if (
        contactIndex !== -1 &&
        contactId === updatedContacts?.[contactIndex]?.id
      ) {
        let data = updateTheContactObject(
          updatedContacts[contactIndex],
          newMessage.message,
        );
        if (data) setSelectedContact(data);
      } else {
        queryClient.invalidateQueries({
          queryKey: ["contacts", "last-message"],
        });
      }
    },
    [
      findAndReturnTheIndexOfTheContact,
      listRows,
      queryClient,
      setSelectedContact,
      updateTheContactObject,
    ],
  );

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

  useEffect(() => {
    let contactId = searchParams.get("contactId");
    if (contactId && !selectedContact) {
      let contact = allContactsRow.find(
        (contact) => contact.id === searchParams.get("contactId"),
      );
      if (contact && selectedContact !== contact) {
        setSelectedContact(contact);
      }
    }
  }, [allContactsRow, searchParams, selectedContact, setSelectedContact]);

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

  if (isContactsFetching || isPending || isTicketsLoading)
    return (
      <WhatsAppInboxLoader
        isLoading={isContactsFetching || isPending || isTicketsLoading}
      />
    );

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
        radius="md"
        styles={{
          panel: {
            paddingTop: 5,
          },
        }}
        defaultValue="all"
      >
        <Tabs.List
          mx="md"
          grow
          style={{
            borderRadius: "var(--tabs-radius)",
            // border: ".5px dashed var(--tabs-color)",
          }}
        >
          {Object.values(TabsEnum).map((aTab) => (
            <Tabs.Tab
              key={aTab}
              value={aTab}
              h={25}
              leftSection={
                <Indicator
                  inline
                  label={
                    filter?.messageType === "usermessages" &&
                    aTab === TabsEnum.all
                      ? allFilteredContacts?.[0]?.total_contact_count || 0
                      : messageCount[aTab] || 0
                  }
                  size={16}
                  color="red"
                >
                  {aTab === TabsEnum.all && <IconMessageCog size={18} />}
                  {aTab === TabsEnum.tickets && <IconTicket size={18} />}
                </Indicator>
              }
            />
          ))}
        </Tabs.List>

        <Tabs.Panel value="all">
          <div>
            {status === "pending" || filteredContactsStatus === "pending" ? (
              <Text px={"md"}>Loading...</Text>
            ) : status === "error" || filteredContactsStatus === "error" ? (
              <Text px={"md"}>
                Error: {error?.message ?? filteredContactsError?.message}
              </Text>
            ) : (
              <div
                ref={parentRef}
                className="List"
                style={{
                  height: `68dvh`,
                  width: `100%`,
                  overflow: "auto",
                }}
              >
                <Divider />
                <div
                  style={{
                    height: `${contactRowVirtualizer.getTotalSize()}px`,
                    width: "100%",
                    position: "relative",
                  }}
                >
                  {contactRowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const isLoaderRow = virtualRow.index > listRows.length - 1;
                    const post = listRows[virtualRow.index];

                    return (
                      <div
                        key={virtualRow.index}
                        className={
                          virtualRow.index % 2 ? "ListItemOdd" : "ListItemEven"
                        }
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        {isLoaderRow ? (
                          hasNextPage && "Loading more..."
                        ) : (
                          <WaInboxChatSelectCard contact={post} />
                        )}
                        <Divider />
                      </div>
                    );
                  })}
                  {contactRowVirtualizer.getVirtualItems()?.length === 0 &&
                    (validateSearchStringAsMobileNumber(filter.searchTerm) ? (
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
                    ))}
                </div>
              </div>
            )}

            {isFetching && !isFetchingNextPage
              ? "Background Updating..."
              : null}
          </div>
        </Tabs.Panel>
        <Tabs.Panel value="tickets" h="80dvh">
          <div>
            {ticketsStatus === "pending" ? (
              <Text px={"md"}>Loading...</Text>
            ) : ticketsStatus === "error" ? (
              <Text px={"md"}>Error: {ticketsError.message}</Text>
            ) : (
              <div
                ref={ticketsParentRef}
                className="List"
                style={{
                  height: `68dvh`,
                  width: `100%`,
                  overflow: "auto",
                }}
              >
                <Divider />
                <div
                  style={{
                    height: `${ticketsRowVirtualizer.getTotalSize()}px`,
                    width: "100%",
                    position: "relative",
                  }}
                >
                  {ticketsRowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const isLoaderRow =
                      virtualRow.index > allTicketsRow.length - 1;

                    const post = allTicketsRow[virtualRow.index];

                    return (
                      <div
                        key={virtualRow.index}
                        className={
                          virtualRow.index % 2 ? "ListItemOdd" : "ListItemEven"
                        }
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        {isLoaderRow ? (
                          hasNextPageTickets ? (
                            "Loading more..."
                          ) : (
                            "Nothing more to load"
                          )
                        ) : (
                          <TicketSelectCard ticket={post} />
                        )}
                        <Divider />
                      </div>
                    );
                  })}
                  {ticketsRowVirtualizer.getVirtualItems()?.length === 0 && (
                    <Card component={Group}>
                      <Text c="dimmed" size="sm" ta="center">
                        {translations["No chats found"]} <br />
                      </Text>
                    </Card>
                  )}
                </div>
              </div>
            )}
            {!isTicketsFetchingNextPage ? "Background Updating..." : null}
          </div>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};

export default React.memo(WaInboxChatSelect);
