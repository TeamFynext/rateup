"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  ActionIcon,
  Card,
  Divider,
  Group,
  Indicator,
  Paper,
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
import { useTranslations } from "next-intl";

import { MessagePlatform } from "@/types/enums";
import { WaInboxMessage } from "@/types/global";
import { saveContactsToDB } from "@/app/dashboard/inbox/idb";
import useContactStore, {
  makeFilterKey,
  useChatContactCountStore,
  useContactsStore,
  useMessagesStore,
} from "@/app/dashboard/inbox/store";
import { ContactsWithLastMessage } from "@/backend/whatsapp/inbox/message/wamessage.api";
import { useFilteredContacts } from "@/backend/whatsapp/inbox/message/wamessage.query";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import { useUser } from "@/context/UserContext";

import { ContainedTextField } from "../../../input/ContainedInput/ContainedInput";
import WhatsAppInboxLoader from "../loader";
import AddUnknownContactModal from "./addUnknownContactModal";
import { ChatFilter, useChatFilterStore } from "./chatFilter";
import WaInboxChatSelectCard from "./chatselectCard";
import ChatSelectSkeletonCardList from "./chatselectCard/Skeleton";
import InboxSettings from "./InboxSettings";
import classes from "./styles.module.css";

const WaInboxChatSelect = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as string) ?? "New";
  const { filter, setFilter } = useChatFilterStore();
  const [processedFilter, setProcessedFilter] = useState<ChatFilter>(null);
  const {
    setSelectedContact,
    setFilter: setFilterForContactsStore,
    addContactsForFilter,
    loadContactsFromDB,
  } = useContactsStore();
  const currentFilterKey = useContactsStore((s) => s.currentFilterKey);
  const contactsById = useContactsStore((s) => s.contactsById);
  const selectedContact = useContactsStore((s) => s.selectedContact);
  const contactsByFilter = useContactsStore((s) => s.contactsByFilter);

  useEffect(() => {
    setFilterForContactsStore(processedFilter);
    loadContactsFromDB(processedFilter);
  }, [processedFilter, setFilterForContactsStore, loadContactsFromDB]);
  const queryClient = useQueryClient();

  const translations = useTranslations();
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

  const { data: waSettings, isLoading } = useWaSettings();

  const {
    // setSelectedContact,
    // selectedContact,
    setFilterData,
    openedContactIds,
    setOpenedContactIds,
  } = useContactStore();

  // const allFilteredContactsRow = useMemo(
  //   () =>
  //     filteredContacts
  //       ? filteredContacts.pages.flatMap((d) =>
  //           d.rows.map((r) => ({
  //             ...r,
  //             unReadMessageCount: openedContactIds.includes(r.id)
  //               ? 0
  //               : r.unReadMessageCount,
  //           })),
  //         )
  //       : [],
  //   [filteredContacts, openedContactIds],
  // );

  useEffect(() => {
    if (isRefetchingFilteredContacts) setOpenedContactIds([]);
  }, [isRefetchingFilteredContacts]);

  const parentRef = useRef(null);
  /////////////////////////////////////////////////////////////
  // The virtualizer
  // const contactRowVirtualizer = useVirtualizer({
  //   count: hasNextPageFilteredContacts
  //     ? allFilteredContactsRow.length + 1
  //     : allFilteredContactsRow.length,
  //   getScrollElement: () => parentRef.current,
  //   estimateSize: () => 87,
  //   overscan: 5,
  // });
  // useEffect(() => {
  //   const [lastItem] = [...contactRowVirtualizer.getVirtualItems()].reverse();

  //   if (!lastItem) {
  //     return;
  //   }

  //   if (
  //     checkIfAnyFilterisActive(filter) &&
  //     lastItem.index >= allFilteredContactsRow.length - 1 &&
  //     hasNextPageFilteredContacts &&
  //     !isFilteredContactsFetchingNextPage
  //   ) {
  //     fetchNextPageFilteredContacts();
  //   }
  // }, [
  //   allFilteredContactsRow.length,
  //   fetchNextPageFilteredContacts,
  //   hasNextPageFilteredContacts,
  //   isFilteredContactsFetchingNextPage,
  //   contactRowVirtualizer.getVirtualItems(), // This is the key change - use getVirtualItems()
  // ]);
  //////////////////////////////////////////////////////////
  // const { wsData } = useWsData();

  // const findAndReturnTheIndexOfTheContact = useCallback(
  //   (list: ContactsWithLastMessage[], contactId: string) => {
  //     return list.findIndex((contact) => contact.id === contactId);
  //   },
  //   [],
  // );

  // const updateTheContactObject = useCallback(
  //   (cObj: ContactsWithLastMessage, newMessage: WaGetMessagesBody) => {
  //     return {
  //       ...cObj,
  //       lastMessage: newMessage,
  //       lastReceivedMessageTimeStamp:
  //         newMessage.messageBody.exchangeProcess === "receive"
  //           ? newMessage.waCreatedAt
  //           : cObj?.lastReceivedMessageTimeStamp,
  //     };
  //   },
  //   [],
  // );

  // const updateWaContactsList = useCallback(
  //   (newMessage: { contact: ContactsData; message: WaGetMessagesBody }) => {
  //     let updatedContacts = [...allFilteredContactsRow];
  //     const contactIndex = findAndReturnTheIndexOfTheContact(
  //       updatedContacts,
  //       newMessage.contact.id,
  //     );
  //     const contactId = useContactStore.getState().selectedContact?.id;
  //     if (
  //       contactIndex !== -1 &&
  //       contactId === updatedContacts?.[contactIndex]?.id
  //     ) {
  //       let data = updateTheContactObject(
  //         updatedContacts[contactIndex],
  //         newMessage.message,
  //       );
  //       if (data) setSelectedContact(data);
  //     } else {
  //       queryClient.invalidateQueries({
  //         queryKey: ["contacts", "filtered"],
  //       });
  //     }
  //   },
  //   [
  //     findAndReturnTheIndexOfTheContact,
  //     allFilteredContactsRow,
  //     queryClient,
  //     setSelectedContact,
  //     updateTheContactObject,
  //   ],
  // );

  // useEffect(() => {
  //   let contactId = searchParams.get("contactId");
  //   if (contactId && !selectedContact) {
  //     // let contact = allFilteredContactsRow.find(
  //     //   (contact) => contact.id === searchParams.get("contactId"),
  //     // );
  //     let contact = contactsById.get(contactId)
  //     if (contact && selectedContact !== contact) {
  //       setSelectedContact(contact);
  //     }
  //   }
  // }, [
  //   // allFilteredContactsRow,
  //   contactsById,
  //   searchParams,
  //   selectedContact,
  //   setSelectedContact,
  // ]);

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
        setFilterData(encodeURIComponent(JSON.stringify(processedFilters)));
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

  useEffect(() => {
    const filterKey = makeFilterKey(processedFilter);
    if (
      !filteredContacts ||
      !currentFilterKey ||
      filterKey !== currentFilterKey
    )
      return;
    filteredContacts.pages.forEach((page) => {
      if (page.rows?.length) {
        const existingIds = new Set(contactsByFilter[currentFilterKey] || []);
        const newContacts = page.rows
          .filter((c) => !existingIds.has(c.id))
          .map((c) => ({ ...c, updatedAt: new Date().toISOString() }));
        console.log("newContacts", newContacts);
        if (newContacts.length)
          addContactsForFilter(currentFilterKey, newContacts, tab);
      }
    });
  }, [
    filteredContacts,
    currentFilterKey,
    addContactsForFilter,
    processedFilter,
    tab,
  ]);
  console.log(
    "contactsById.get(selectedContact?.id)",
    contactsById.get(selectedContact?.id),
  );
  const contactIds = useMemo(
    () => contactsByFilter[currentFilterKey] || [],
    [contactsById, currentFilterKey],
  );
  const openChatDisplayForContact = useCallback(
    (data: Partial<ContactsData>) => {
      // router.push(`/dashboard/inbox?tab=${tab}&contactId=${data.id}`);
    },
    [router],
  );

  const rowVirtualizer = useVirtualizer({
    count: contactIds.length,
    estimateSize: () => 87,
    overscan: 5,
    getScrollElement: () => parentRef.current,
  });
  useEffect(() => {
    const last = rowVirtualizer.getVirtualItems().at(-1);
    if (
      !isFilteredContactsFetchingNextPage &&
      hasNextPageFilteredContacts &&
      last?.index >= contactIds.length - 1
    ) {
      fetchNextPageFilteredContacts();
    }
  }, [
    rowVirtualizer.getVirtualItems(),
    contactIds.length,
    hasNextPageFilteredContacts,
    isFilteredContactsFetchingNextPage,
    fetchNextPageFilteredContacts,
  ]);

  const onUnknownContactAddSuccess = useCallback(
    (contact: ContactsData) => {
      setSelectedContact({
        ...contact,
        groups: [],
        lastReceivedMessageTimeStamp: "",
        lastMessage: {
          messageBody: {} as WaInboxMessage,
          waCreatedAt: "",
          sourcePlatform: MessagePlatform.WHATSAPP,
          sourceIdentifier: "",
        },
        assignedUsers: [],
      });
      // openChatDisplayForContact(contact);
    },
    [setSelectedContact],
  );
  useEffect(() => {
    let tab = searchParams.get("tab") as string;
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
        waMessageAssignStatus: null,
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
  }, [searchParams, filter, prepareFilters]);

  if (isContactLoading || isLoading)
    return <WhatsAppInboxLoader isLoading={isContactLoading || isLoading} />;

  return (
    <Paper withBorder p={0} className="h-full">
      <Group gap="xs" align="center" wrap="nowrap" p={6.3}>
        <ContainedTextField
          leftSection={<IconSearch size={18} color="gray" stroke={1.5} />}
          rightSection={
            filter.searchTerm ? (
              <ActionIcon
                size="sm"
                variant="subtle"
                color="gray"
                onClick={() => setFilter({ ...filter, searchTerm: "" })}
                aria-label={translations("Clear search")}
              >
                <IconSquareRoundedX size={18} />
              </ActionIcon>
            ) : null
          }
          placeholder={translations("Search Contacts")}
          value={filter?.searchTerm || ""}
          onChange={(e) =>
            setFilter({ ...filter, searchTerm: e.currentTarget.value })
          }
          autoFocus
          flex={1}
        />
        <Group
          className={classes.chat_select_filter_indicator_wrapper}
          gap={4}
          p={0}
        >
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
            aria-label={translations("Refresh")}
          >
            <IconRefresh />
          </ActionIcon>
        </Group>
        <InboxSettings
          tab={tab}
          onUnknownContactAddSuccess={onUnknownContactAddSuccess}
        />
      </Group>
      <div>
        {!contactIds.length && filteredContactsStatus === "pending" ? (
          <Text px={"md"}>Loading...</Text>
        ) : !contactIds.length && filteredContactsStatus === "error" ? (
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
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: "100%",
                position: "relative",
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const isLoaderRow = virtualRow.index > contactIds.length - 1;
                const post = contactsById.get(contactIds[virtualRow.index]);

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
                      <WaInboxChatSelectCard
                        contact={post}
                        waSettings={waSettings}
                      />
                    )}
                    <Divider />
                  </div>
                );
              })}
              {rowVirtualizer.getVirtualItems()?.length === 0 &&
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
                      {translations("No chats found")} <br />
                      {translations(
                        "search for a valid phone number or contact name",
                      )}
                    </Text>
                  </Card>
                ))}
            </div>
          </div>
        )}
      </div>
    </Paper>
  );
};

export const NewInboxIcon = (props) => {
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
  if (!count) return <IconMessageBolt {...props} />;
  return (
    <div className="flex">
      <Indicator label={count} inline size={16} color="black">
        <IconMessageBolt {...props} />
      </Indicator>
    </div>
  );
};

export const AssignedInboxIcon = (props) => {
  const { totalCount } = useChatContactCountStore();
  if (!totalCount?.assigned) return <IconUserCheck {...props} />;
  return (
    <div className="flex">
      <Indicator label={totalCount.assigned} inline size={16} color="black">
        <IconUserCheck {...props} />
      </Indicator>
    </div>
  );
};

export const AssignedToMeInboxIcon = (props) => {
  const { totalCount } = useChatContactCountStore();
  if (!totalCount?.assignedToMe) return <IconUserCircle {...props} />;
  return (
    <div className="flex">
      <Indicator label={totalCount.assignedToMe} inline size={16} color="black">
        <IconUserCircle {...props} />
      </Indicator>
    </div>
  );
};

export const ClosedInboxIcon = (props) => {
  const { totalCount } = useChatContactCountStore();
  if (!totalCount?.closed) return <IconMessageCheck {...props} />;
  return (
    <div className="flex">
      <Indicator label={totalCount.closed} inline size={16} color="black">
        <IconMessageCheck {...props} />
      </Indicator>
    </div>
  );
};

export const BlockedInboxIcon = (props) => {
  const { totalCount } = useChatContactCountStore();
  if (!totalCount?.blocked) return <IconForbid2 {...props} />;
  return (
    <div className="flex">
      <Indicator label={totalCount.blocked} inline size={16} color="black">
        <IconForbid2 {...props} />
      </Indicator>
    </div>
  );
};

export default React.memo(WaInboxChatSelect);
