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
import lodash from "lodash";
import {
  ChevronDown,
  Clock,
  Download,
  Filter,
  Key,
  Loader,
  MessageSquare,
  RefreshCcw,
  Search,
  UserPlus,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { MessagePlatform, WaMessageAssignStatus } from "@/types/enums";
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
import { Button } from "@/components/ui/button";
import { useLifecycleContext } from "@/context/LifecycleContext";
import { useUser } from "@/context/UserContext";

import { ContainedTextField } from "../../../input/ContainedInput/ContainedInput";
import WhatsAppInboxLoader from "../loader";
import AddUnknownContactModal, {
  AddUnknownContactForm,
} from "./addUnknownContactModal";
import WaInboxChatFilter, {
  ChatFilter,
  useChatFilterStore,
} from "./chatFilter";
import WaInboxChatSelectCard from "./chatselectCard";
import ChatSelectSkeletonCardList from "./chatselectCard/Skeleton";
import ChatselectPanelHeader from "./ChatselectPanelHeader";

const WaInboxChatSelect = () => {
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as string) ?? "New";
  const { filter, setFilter, previousFilterForTab, clearFilter } =
    useChatFilterStore();
  const [processedFilter, setProcessedFilter] = useState<ChatFilter>(null);
  const {
    setSelectedContact,
    selectedContact,
    loadContactsFromDB,
    isLoading: isStoreLoading,
    clearContactsForFilter,
  } = useContactsStore();
  const currentFilterKey = useContactsStore((s) => s.currentFilterKey);
  const contactsById = useContactsStore((s) => s.contactsById);
  const contactsByFilter = useContactsStore((s) => s.contactsByFilter);
  const { mergeMessages } = useMessagesStore();
  const { user } = useUser();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await loadContactsFromDB(processedFilter, user);
      if (cancelled) return;
    })();

    return () => {
      cancelled = true;
    };
  }, [processedFilter]);

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
  } = useFilteredContacts(
    encodeURIComponent(JSON.stringify(processedFilter)),
    !!processedFilter,
  );

  const { data: waSettings, isLoading } = useWaSettings();

  const { setFilterData, filterData } = useContactStore();

  const parentRef = useRef(null);

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
  function updateInitialMessagesToStore(contacts) {
    contacts.map((c) => {
      const messageMap = new Map();
      c.messages.map((m) => {
        const key = `${c.id}_${m.sourceIdentifier}`;
        const all = `${c.id}_all`;
        messageMap.set(key, [...(messageMap.get(key) ?? []), m]);
        messageMap.set(all, [...(messageMap.get(all) ?? []), m]);
      });
      Array.from(messageMap.entries()).map(([key, messages]) => {
        mergeMessages(key, messages, false);
      });
    });
  }
  useEffect(() => {
    if (!filteredContacts || !currentFilterKey) return;
    const filterKey = makeFilterKey(processedFilter);
    if (filterKey !== currentFilterKey) return;

    let isActive = true;

    const state = useContactsStore.getState();

    const getNewContacts = (page) => {
      const existingIds = new Set(state.contactsByFilter[filterKey] || []);
      const filteredContacts = page.rows.filter((c) => {
        const existingContact = state.contactsById.get(c.id);
        if (!existingContact) return true;
        return !existingIds.has(c.id);
      });

      return filteredContacts.map((c) => {
        if (state.contactsById.get(c.id)) return c;
        return { ...c, updatedAt: new Date().toISOString() };
      });
    };

    const syncContacts = async () => {
      if (!filteredContacts || !isActive) return;
      const allContacts = filteredContacts.pages.flatMap((p) => p.rows) ?? [];
      if (!allContacts?.length) {
        clearContactsForFilter(processedFilter);
        return;
      }

      for (const page of filteredContacts.pages) {
        if (!isActive || !page.rows?.length) continue;

        const newContacts = getNewContacts(page);

        if (newContacts.length) {
          await state.addContactsForFilter(filterKey, newContacts);
          updateInitialMessagesToStore(newContacts);
        }
      }
    };

    (async () => {
      await syncContacts();
    })();

    return () => {
      isActive = false;
    };
  }, [filteredContacts, currentFilterKey, processedFilter, tab]);

  const contactIds = useMemo(
    () => contactsByFilter[currentFilterKey] || [],
    [contactsById, currentFilterKey, contactsByFilter],
  );

  const rowCount = contactIds.length + (hasNextPageFilteredContacts ? 1 : 0);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 90,
    overscan: 5,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const lastItem = virtualItems.at(-1);

  useEffect(() => {
    if (!lastItem || !hasNextPageFilteredContacts) return;
    if (
      lastItem.index === rowCount - 1 &&
      !isFilteredContactsFetchingNextPage &&
      hasNextPageFilteredContacts
    ) {
      fetchNextPageFilteredContacts();
    }
  }, [
    lastItem?.index,
    rowCount,
    isFilteredContactsFetchingNextPage,
    hasNextPageFilteredContacts,
    fetchNextPageFilteredContacts,
  ]);

  useEffect(() => {
    if (!filter || !Array.isArray(filter.status)) {
      clearFilter();
    }
  }, [filter]);

  useEffect(() => {
    const openStatus = [
      WaMessageAssignStatus.ASSIGNED,
      WaMessageAssignStatus.UNASSIGNED,
    ];
    const hasOpenStatus = filter?.status?.some((s) =>
      openStatus.includes(s as WaMessageAssignStatus),
    );
    if (tab === "Addressed" && hasOpenStatus) {
      setFilter({
        ...filter,
        status: filter.status.filter(
          (s) => !openStatus.includes(s as WaMessageAssignStatus),
        ),
      });
    } else if (tab === "All" && !hasOpenStatus) {
      const prFilter = previousFilterForTab?.find((t) => t.tab === "All");
      if (prFilter) {
        const openStatusInPrFilter = prFilter?.filter?.status?.filter((s) =>
          openStatus.includes(s as WaMessageAssignStatus),
        );
        setFilter({
          ...filter,
          status: [...filter.status, ...openStatusInPrFilter],
        });
      } else {
        setFilter({ ...filter, status: [...filter.status, ...openStatus] });
      }
    }
  }, [tab]);

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
    },
    [setSelectedContact],
  );
  useEffect(() => {
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
    } else if (tab === "New") {
      prepareFilters({
        ...filter,
        messageType: "all",
        waMessageAssignStatus: "UnAssigned",
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
  }, [tab, filter, prepareFilters]);

  useEffect(() => {
    if (parentRef.current) {
      parentRef.current.scrollTop = 0;
    }
  }, [tab]);

  const lifeCycleLabels = useLifecycleContext();

  if (isContactLoading || isLoading)
    return <WhatsAppInboxLoader isLoading={isContactLoading || isLoading} />;

  return (
    <div className="h-full bg-background">
      <ChatselectPanelHeader
        isRefetchingFilteredContacts={isRefetchingFilteredContacts}
        onUnknownContactAddSuccess={onUnknownContactAddSuccess}
        refetchFilteredContacts={() => {
          refetchFilteredContacts();
        }}
        tab={tab}
      />
      <div>
        {isStoreLoading ||
        (!contactIds.length && filteredContactsStatus === "pending") ? (
          <Text px={"md"}>Loading...</Text>
        ) : !contactIds.length && filteredContactsStatus === "error" ? (
          <Text px={"md"}>Error: {filteredContactsError?.message}</Text>
        ) : (
          <div
            ref={parentRef}
            className="List"
            style={{
              height: `calc(100dvh - 65px)`,
              width: `100%`,
              overflow: "auto",
            }}
          >
            <Divider />
            <div
              style={{
                // height: `${rowVirtualizer.getTotalSize()}px`,
                width: "100%",
                position: "relative",
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const isBottomLoader =
                  hasNextPageFilteredContacts &&
                  isFilteredContactsFetchingNextPage &&
                  virtualRow.index === rowCount - 1;
                let contact: any = null;
                if (!isBottomLoader) {
                  contact = contactsById.get(contactIds[virtualRow.index]);
                }
                return (
                  <div
                    data-index={virtualRow.index}
                    key={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      // height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    {isBottomLoader ? (
                      <div className="flex items-center justify-center py-2">
                        <Loader className="h-5 w-5 animate-spin text-[#009987]" />
                      </div>
                    ) : (
                      <>
                        <WaInboxChatSelectCard
                          contact={contact}
                          waSettings={waSettings}
                          lifeCycleLabels={lifeCycleLabels}
                        />
                        <Divider />
                      </>
                    )}
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
                ) : !contactIds.length && (isContactLoading || isFetching) ? (
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
