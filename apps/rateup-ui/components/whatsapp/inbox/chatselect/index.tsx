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
  Text,
} from "@mantine/core";
import {
  IconForbid2,
  IconMessageBolt,
  IconMessageCheck,
  IconRefresh,
  IconSearch,
  IconSquareRoundedX,
  IconUserCheck,
  IconUserCircle,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";

import { WaInboxMessage } from "@/types/global";
import {
  ContactsWithLastMessage,
  WaGetMessagesBody,
  WaMessagePage,
} from "@/backend/whatsapp/inbox/message/wamessage.api";
import { useFilteredContacts } from "@/backend/whatsapp/inbox/message/wamessage.query";
import { useWsData } from "@/context/UserContext";
import useTranslations from "@/dictionaries/useTranslation";
import useContactStore, {
  useChatContactCountStore,
} from "@/pages/dashboard/whatsapp/inbox/store";

import { ContainedTextField } from "../../../input/ContainedInput/ContainedInput";
import WhatsAppInboxLoader from "../loader";
import AddUnknownContactModal from "./addUnknownContactModal";
import WaInboxChatExport from "./chatExport";
import WaInboxChatFilter, {
  ChatFilter,
  useChatFilterStore,
} from "./chatFilter";
import WaInboxChatSelectCard from "./chatselectCard";
import ChatSelectSkeletonCardList from "./chatselectCard/Skeleton";
import classes from "./styles.module.css";

const WaInboxChatSelect = () => {
  const router = useRouter();
  const tab = (router.query?.tab as string) ?? "New";
  const { filter, setFilter } = useChatFilterStore();
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
      filters.strictFilter !== false ||
      !filters.waMessageAssignStatus ||
      filters.waMessageAssignStatus.length
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

  const {
    setSelectedContact,
    selectedContact,
    setFilterData,
    openedContactIds,
    setOpenedContactIds,
  } = useContactStore();

  const allFilteredContactsRow = useMemo(
    () =>
      filteredContacts
        ? filteredContacts.pages.flatMap((d) =>
            d.rows.map((r) => ({
              ...r,
              unReadMessageCount: openedContactIds.includes(r.id)
                ? 0
                : r.unReadMessageCount,
            })),
          )
        : [],
    [filteredContacts, openedContactIds],
  );

  useEffect(() => {
    if (isRefetchingFilteredContacts) setOpenedContactIds([]);
  }, [isRefetchingFilteredContacts]);

  const parentRef = useRef(null);

  // The virtualizer
  const contactRowVirtualizer = useVirtualizer({
    count: hasNextPageFilteredContacts
      ? allFilteredContactsRow.length + 1
      : allFilteredContactsRow.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 70,
    overscan: 5,
  });
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
    fetchNextPageFilteredContacts,
    hasNextPageFilteredContacts,
    isFilteredContactsFetchingNextPage,
    contactRowVirtualizer.getVirtualItems(), // This is the key change - use getVirtualItems()
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
        lastReceivedMessageTimeStamp:
          newMessage.messageBody.exchangeProcess === "receive"
            ? newMessage.waCreatedAt
            : cObj?.lastReceivedMessageTimeStamp,
      };
    },
    [],
  );

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
        if (
          !newData.pages[0].messages.find(
            (message) => message.id === wsData.inbox.message.id,
          )
        ) {
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
        setFilterData(encodeURIComponent(JSON.stringify(processedFilter)));
      }
    },
    [checkIfAnyFilterisActive],
  );

  const validateSearchStringAsMobileNumber = useCallback(
    (searchString: string): boolean => {
      return !!RegExp(/^\d{10}$/).exec(searchString);
    },
    [],
  );

  const openChatDisplayForContact = useCallback(
    (data: Partial<ContactsData>) => {
      router.push(`/dashboard/whatsapp/inbox?tab=&${tab}contactId=${data.id}`);
    },
    [router],
  );

  const onUnknownContactAddSuccess = useCallback(
    (contact: ContactsData) => {
      setSelectedContact({
        ...contact,
        groups: [],
        lastReceivedMessageTimeStamp: "",
        lastMessage: {
          messageBody: {} as WaInboxMessage,
          waCreatedAt: "",
        },
        assignedUsers: [],
      });
      openChatDisplayForContact(contact);
    },
    [openChatDisplayForContact, setSelectedContact],
  );
  useEffect(() => {
    let tab = router.query?.tab as string;
    if (!tab) return;
    if (tab === "blocked") {
      prepareFilters({
        ...filter,
        messageType: "all",
        waMessageAssignStatus: undefined,
        blockedUsers: true,
      });
      return;
    }
    if (tab === "All") {
      prepareFilters({
        ...filter,
        messageType: "all",
        waMessageAssignStatus: undefined,
        blockedUsers: false,
      });
    } else {
      prepareFilters({
        ...filter,
        messageType: tab === "Sent" ? "all" : "usermessages",
        waMessageAssignStatus: tab,
        blockedUsers: false,
      });
    }
  }, [router.query?.tab, filter, prepareFilters]);

  if (isContactLoading)
    return <WhatsAppInboxLoader isLoading={isContactLoading} />;

  return (
    <Stack className={classes.wrapper} gap={"xs"}>
      <Group
        className={classes.chat_select_header}
        gap="xs"
        align="center"
        wrap="nowrap"
      >
        <ContainedTextField
          leftSection={<IconSearch size={18} color="gray" stroke={1.5} />}
          rightSection={
            filter.searchTerm ? (
              <ActionIcon
                size="sm"
                variant="subtle"
                color="gray"
                onClick={() => setFilter({ ...filter, searchTerm: "" })}
                aria-label={translations["Clear search"]}
              >
                <IconSquareRoundedX size={18} />
              </ActionIcon>
            ) : null
          }
          placeholder={translations["Search Contacts"]}
          value={filter?.searchTerm || ""}
          onChange={(e) =>
            setFilter({ ...filter, searchTerm: e.currentTarget.value })
          }
          autoFocus
          flex={1}
        />
        <AddUnknownContactModal
          phone=""
          triggerType="action_button"
          successCallback={onUnknownContactAddSuccess}
        />
        <Group className={classes.chat_select_filter_indicator_wrapper} gap={4}>
          <ActionIcon
            h={30}
            w={30}
            variant="light"
            radius="md"
            loading={
              isFilteredContactsFetchingNextPage || isRefetchingFilteredContacts
            }
            onClick={() => {
              refetchFilteredContacts();
              queryClient.invalidateQueries({
                queryKey: ["contactInboxCount"],
              });
            }}
            aria-label={translations["Refresh"]}
          >
            <IconRefresh />
          </ActionIcon>
        </Group>
        <WaInboxChatFilter tab={router.query?.tab as string} />
        <WaInboxChatExport filter={filter} />
      </Group>
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
              height: `calc(100dvh - 130px)`,
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
                      hasNextPageFilteredContacts ? (
                        "Loading more..."
                      ) : (
                        "Nothing more to load"
                      )
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
                      setFilter({
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
    </Stack>
  );
};

export const NewInboxIcon = () => {
  const { totalCount } = useChatContactCountStore();
  const { filter } = useChatFilterStore();
  const count = useMemo(() => {
    const mapStatus = {
      ASSIGNED: "newAssigned",
      UNASSIGNED: "newUnassigned",
      ASSIGNEDTOME: "newAssignedTome",
    };
    if (filter.newStatuses.length) {
      const newStatuses = [...filter.newStatuses].filter((status) =>
        filter.newStatuses.includes("ASSIGNED")
          ? status !== "ASSIGNEDTOME"
          : true,
      );
      return newStatuses.reduce((acc, status) => {
        acc += totalCount[mapStatus[status]];
        return acc;
      }, 0);
    } else {
      return totalCount.new;
    }
  }, [filter.newStatuses, totalCount]);
  if (!count) return <IconMessageBolt />;
  return (
    <Indicator label={count} inline size={16} color="black">
      <IconMessageBolt />
    </Indicator>
  );
};

export const AssignedInboxIcon = () => {
  const { totalCount } = useChatContactCountStore();
  if (!totalCount?.assigned) return <IconUserCheck />;
  return (
    <Indicator label={totalCount.assigned} inline size={16} color="black">
      <IconUserCheck />
    </Indicator>
  );
};

export const AssignedToMeInboxIcon = () => {
  const { totalCount } = useChatContactCountStore();
  if (!totalCount?.assignedToMe) return <IconUserCircle />;
  return (
    <Indicator label={totalCount.assignedToMe} inline size={16} color="black">
      <IconUserCircle />
    </Indicator>
  );
};

export const ClosedInboxIcon = () => {
  const { totalCount } = useChatContactCountStore();
  if (!totalCount?.closed) return <IconMessageCheck />;
  return (
    <Indicator label={totalCount.closed} inline size={16} color="black">
      <IconMessageCheck />
    </Indicator>
  );
};

export const BlockedInboxIcon = () => {
  const { totalCount } = useChatContactCountStore();
  if (!totalCount?.blocked) return <IconForbid2 />;
  return (
    <Indicator label={totalCount.blocked} inline size={16} color="black">
      <IconForbid2 />
    </Indicator>
  );
};

export default React.memo(WaInboxChatSelect);
