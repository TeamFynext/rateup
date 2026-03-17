"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";

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
  IconMessageCheck,
  IconUserCheck,
  IconUserCircle,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CheckCircle, Loader, Loader2, UserCheck } from "lucide-react";
import { useExtracted } from "next-intl";

import { MessagePlatform, WaMessageAssignStatus } from "@/types/enums";
import { WaInboxMessage } from "@/types/global";
import { saveContactsToDB } from "@/app/dashboard/inbox/idb";
import useContactStore, {
  makeFilterKey,
  useChatContactCountStore,
  useContactsStore,
  useMessagesStore,
} from "@/app/dashboard/inbox/store";
import { useBulkAssignStatusMutation } from "@/backend/campaign/contacts/contacts.query";
import { useFilteredContacts } from "@/backend/whatsapp/inbox/message/wamessage.query";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLifecycleContext } from "@/context/LifecycleContext";
import { useUser } from "@/context/UserContext";

import WhatsAppInboxLoader from "../loader";
import AddUnknownContactModal from "./addUnknownContactModal";
import BulkAssignUser from "./AssignUser";
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
    updateContactById,
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

  const translations = useExtracted();
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

  const {
    mutate: bulkAssignStatusMutation,
    isPending: isBulkAssignStatusPending,
  } = useBulkAssignStatusMutation(null);

  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const [selectedChats, setSelectedChats] = useState([]);
  const [showBulkAssignDialog, setShowBulkAssignDialog] = useState(false);
  const [openConfirmHandleClose, setOpenConfirmHandleClose] = useState(false);

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
    setIsSelectionMode(false);
    if (parentRef.current) {
      parentRef.current.scrollTop = 0;
    }
  }, [tab]);

  const lifeCycleLabels = useLifecycleContext();

  if (isContactLoading || isLoading)
    return <WhatsAppInboxLoader isLoading={isContactLoading || isLoading} />;

  const toggleSelectAll = () => {
    if (selectedChats.length === contactIds.length) {
      setSelectedChats([]);
    } else {
      setSelectedChats(contactIds);
    }
  };

  const handleBulkClose = async () => {
    await bulkAssignStatusMutation(
      {
        contactIds: selectedChats,
        waMessageAssignStatus: WaMessageAssignStatus.CLOSED,
      },
      {
        onSuccess: () => {
          setSelectedChats([]);
          setIsSelectionMode(false);
          setOpenConfirmHandleClose(false);
          selectedChats.forEach((contactId) => {
            updateContactById(contactId, (existing) => ({
              ...existing,
              waMessageAssignStatus: WaMessageAssignStatus.CLOSED,
              closedAt: new Date().toISOString(),
              closedUser: {
                name: user?.userName,
                id: user?.userId,
              },
              assignedUsers: [],
            }));
          });
        },
      },
    );
  };

  return (
    <div className="h-full bg-background">
      <ChatselectPanelHeader
        isRefetchingFilteredContacts={isRefetchingFilteredContacts}
        onUnknownContactAddSuccess={onUnknownContactAddSuccess}
        refetchFilteredContacts={() => {
          refetchFilteredContacts();
        }}
        tab={tab}
        isSelectionMode={isSelectionMode}
        setIsSelectionMode={setIsSelectionMode}
        setSelectedChats={setSelectedChats}
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
            {isSelectionMode && selectedChats.length > 0 && (
              <div className="h-12 px-3 border-b flex items-center justify-between transition-all">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedChats.length === contactIds.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded text-foreground focus:ring-primary"
                    />

                    <span className="text-sm font-medium text-foreground">
                      {selectedChats.length} selected
                    </span>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setSelectedChats([])}
                  >
                    {translations("Clear")}
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  {tab !== "Assigned" && tab !== "mine" && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setShowBulkAssignDialog(true)}
                          >
                            <UserCheck className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>

                        <TooltipContent>
                          <p>{translations("Assign selected chats")}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

                  {tab !== "Addressed" && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => setOpenConfirmHandleClose(true)}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>

                        <TooltipContent>
                          <p>{translations("Close selected chats")}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
            )}
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
                          isSelectionMode={isSelectionMode}
                          selectedChats={selectedChats}
                          setSelectedChats={setSelectedChats}
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
      {/* confirm close */}
      <Dialog
        open={openConfirmHandleClose}
        onOpenChange={setOpenConfirmHandleClose}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{translations("Close selected chats")}?</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            {translations("Are you sure you want to close the selected chats")}.
          </p>

          <DialogFooter className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setOpenConfirmHandleClose(false)}
            >
              {translations("Cancel")}
            </Button>

            <Button
              disabled={isBulkAssignStatusPending}
              onClick={() => {
                handleBulkClose();
              }}
            >
              {isBulkAssignStatusPending && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              {translations("Confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/*bulk assign*/}
      <Dialog
        open={showBulkAssignDialog}
        onOpenChange={setShowBulkAssignDialog}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Assign {selectedChats.length} Chat
              {selectedChats.length > 1 ? "s" : ""}
            </DialogTitle>

            <DialogDescription>
              {translations(
                "Select a team member to assign the selected conversations",
              )}
            </DialogDescription>
          </DialogHeader>
          <BulkAssignUser
            filterData={filterData}
            contactIds={selectedChats}
            onSuccess={() => {
              setSelectedChats([]);
              setIsSelectionMode(false);
              setShowBulkAssignDialog(false);
            }}
          />
        </DialogContent>
      </Dialog>
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
