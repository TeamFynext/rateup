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
  Badge,
  Card,
  Divider,
  Group,
  Indicator,
  Stack,
  Tabs,
  Text,
} from "@mantine/core";
import {
  IconMessageCog,
  IconPercentage100,
  IconRefresh,
  IconSearch,
  IconSquareRoundedX,
  IconTicket,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";

import { WaInboxMessage } from "@/types/global";
import {
  ContactsWithLastMessage,
  WaGetMessagesBody,
  WaMessagePage,
} from "@/backend/whatsapp/inbox/message/wamessage.api";
import {
  useFilteredContacts,
  useWaTicktes,
} from "@/backend/whatsapp/inbox/message/wamessage.query";
import { useWsData } from "@/context/UserContext";
import useTranslations from "@/dictionaries/useTranslation";
import useContactStore from "@/pages/dashboard/whatsapp/inbox/store";

import { ContainedTextField } from "../../../input/ContainedInput/ContainedInput";
import WhatsAppInboxLoader from "../loader";
import AddUnknownContactModal from "./addUnknownContactModal";
import WaInboxChatExport from "./chatExport";
import WaInboxChatFilter, { ChatFilter } from "./chatFilter";
import WaInboxChatSelectCard from "./chatselectCard";
import ChatSelectSkeletonCardList from "./chatselectCard/Skeleton";
import classes from "./styles.module.css";
import TicketSelectCard from "./ticketSelectCard";

enum TabsEnum {
  all = "all",
  // tickets = "tickets",
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
      filters.messageType !== "usermessages" ||
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
    isLoading: isContactLoading,
    isFetching,
  } = useFilteredContacts(encodeURIComponent(JSON.stringify(processedFilter)));

  // const {
  //   status: ticketsStatus,
  //   data: tickets,
  //   isPending: isTicketsLoading,
  //   error: ticketsError,
  //   fetchNextPage: fetchNextPageTickets,
  //   isFetchingNextPage: isTicketsFetchingNextPage,
  //   hasNextPage: hasNextPageTickets,
  //   isFetching: isTicketFetching,
  // } = useWaTicktes();

  const allFilteredContactsRow = useMemo(
    () =>
      filteredContacts ? filteredContacts.pages.flatMap((d) => d.rows) : [],
    [filteredContacts],
  );
  // const { allTicketsRow, totalTickets } = useMemo(() => {
  //   const data = tickets?.pages?.flatMap((d) => d?.rows) ?? [];
  //   return {
  //     allTicketsRow: data[0]?.data ?? [],
  //     totalTickets: data[0]?.totalTickets ?? 0,
  //   };
  // }, [tickets]);

  const parentRef = useRef(null);
  const ticketsParentRef = useRef(null);

  // The virtualizer
  const contactRowVirtualizer = useVirtualizer({
    count: hasNextPageFilteredContacts
      ? allFilteredContactsRow.length + 1
      : allFilteredContactsRow.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 70,
    overscan: 5,
  });
  // const ticketsRowVirtualizer = useVirtualizer({
  //   count: hasNextPageTickets ? allTicketsRow.length + 1 : allTicketsRow.length,
  //   getScrollElement: () => ticketsParentRef.current,
  //   estimateSize: () => 82,
  //   overscan: 5,
  // });
  useEffect(() => {
    const [lastItem] = [...contactRowVirtualizer.getVirtualItems()].reverse();

    if (!lastItem) {
      return;
    }

    if (
      checkIfAnyFilterisActive(filter) &&
      lastItem.index >= allFilteredContactsRow.length - 1 &&
      hasNextPageFilteredContacts &&
      !isFilteredContactsFetchingNextPage
    ) {
      fetchNextPageFilteredContacts();
    }
  }, [
    allFilteredContactsRow.length,
    checkIfAnyFilterisActive,
    contactRowVirtualizer,
    fetchNextPageFilteredContacts,
    filter,
    hasNextPageFilteredContacts,
    isFilteredContactsFetchingNextPage,
  ]);

  // useEffect(() => {
  //   const [lastItem] = [...ticketsRowVirtualizer.getVirtualItems()].reverse();

  //   if (!lastItem) {
  //     return;
  //   }

  //   if (
  //     lastItem.index >= allTicketsRow.length - 1 &&
  //     hasNextPageTickets &&
  //     !isTicketsFetchingNextPage
  //   ) {
  //     fetchNextPageTickets();
  //   }
  // }, [
  //   allTicketsRow.length,
  //   ticketsRowVirtualizer,
  //   fetchNextPageTickets,
  //   hasNextPageTickets,
  //   isTicketsFetchingNextPage,
  // ]);

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
      let updatedContacts = [...allFilteredContactsRow];
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
      allFilteredContactsRow,
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
      let contact = allFilteredContactsRow.find(
        (contact) => contact.id === searchParams.get("contactId"),
      );
      if (contact && selectedContact !== contact) {
        setSelectedContact(contact);
      }
    }
  }, [
    allFilteredContactsRow,
    searchParams,
    selectedContact,
    setSelectedContact,
  ]);

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
    let tab = router.query?.tab as string;
    if (tab === "All") {
      prepareFilters({ ...filter, messageType: "all" });
    } else {
      prepareFilters({ ...filter, messageType: "usermessages" });
    }
  }, [router.query?.tab]);

  if (isContactLoading)
    return <WhatsAppInboxLoader isLoading={isContactLoading} />;

  return (
    <Stack className={classes.wrapper} gap={"xs"}>
      <Group className={classes.chat_select_header} gap={"xs"}>
        <Indicator
          inline
          label={allFilteredContactsRow?.[0]?.total_contact_count || 6}
          size={16}
          color="red"
          pos={"fixed"}
          top={filter.messageType === "usermessages" ? 80 : 124}
          left={100}
          style={{ zIndex: 1000 }}
          visibleFrom="sm"
        />
        <ContainedTextField
          leftSection={
            <IconSearch style={{ marginLeft: "var(--mantine-spacing-xs)" }} />
          }
          rightSection={
            filter.searchTerm && (
              <IconSquareRoundedX
                size={18}
                style={{ marginRight: "var(--mantine-spacing-xs)" }}
                onClick={() => prepareFilters({ ...filter, searchTerm: null })}
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
              isFilteredContactsFetchingNextPage || isRefetchingFilteredContacts
            }
            onClick={refetchFilteredContacts}
          >
            <IconRefresh />
          </ActionIcon>
        </Group>
        <WaInboxChatFilter filter={filter} setFilter={prepareFilters} />
        <WaInboxChatExport filter={filter} />
      </Group>
      {/* <Tabs
        radius="md"
        styles={{
          panel: {
            paddingTop: 5,
          },
        }}
        defaultValue={TabsEnum.all}
      > */}
      {/* <Tabs.List mx="md" grow>
          {Object.values(TabsEnum).map((aTab) => (
            <Tabs.Tab
              key={aTab}
              value={aTab}
              h={25}
              leftSection={
                <Indicator
                  inline
                  label={
                    aTab === TabsEnum.all
                      ? allFilteredContactsRow?.[0]?.total_contact_count || 0
                      : totalTickets || 0
                  }
                  size={16}
                  color="red"
                >
                  {aTab === TabsEnum.all && <IconMessageCog size={18} />}
                </Indicator>
              }
            />
          ))}
        </Tabs.List> */}

      {/* <Tabs.Panel value="all"> */}
      <div>
        {filteredContactsStatus === "pending" ? (
          <Text px={"md"}>Loading...</Text>
        ) : filteredContactsStatus === "error" ? (
          <Text px={"md"}>Error: {filteredContactsError?.message}</Text>
        ) : (
          <div
            ref={parentRef}
            className="List"
            style={{
              height: `calc(100dvh - 160px)`,
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
                const isLoaderRow =
                  virtualRow.index > allFilteredContactsRow.length - 1;
                const post = allFilteredContactsRow[virtualRow.index];

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
                      !hasNextPageFilteredContacts && "Nothing more to load"
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
                ) : isContactLoading || isFetching ? (
                  <ChatSelectSkeletonCardList />
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
      </div>
      {/* </Tabs.Panel> */}
      {/* <Tabs.Panel value="tickets" h="80dvh">
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
                          !hasNextPageTickets && "Nothing more to load"
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
          </div>
        </Tabs.Panel> */}
      {/* </Tabs> */}
    </Stack>
  );
};

export default React.memo(WaInboxChatSelect);
