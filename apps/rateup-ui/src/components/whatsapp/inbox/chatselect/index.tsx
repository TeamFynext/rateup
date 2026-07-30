import { useSearch } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CheckCircle, Loader, Loader2, UserCheck } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useBulkAssignStatusMutation } from "@/backend/campaign/contacts/contacts.query";
import { getRowKey } from "@/backend/whatsapp/inbox/message/wamessage.api";
import type { WaGetMessagesBody } from "@/backend/whatsapp/inbox/message/wamessage.api";
import type { ContactsWithLastMessage } from "@/backend/whatsapp/inbox/message/wamessage.api";
import { useFilteredContacts } from "@/backend/whatsapp/inbox/message/wamessage.query";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import useContactStore, {
  makeFilterKey,
  useContactsStore,
  useMessagesStore,
} from "@/components/dashboard/inbox/store.ts";
import type { ContactWithUpdatedAt } from "@/components/dashboard/inbox/store.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import { useLifecycleContext } from "@/context/LifecycleContext.ts";
import { useUser } from "@/context/UserContext.tsx";
import { MessagePlatform, WaMessageAssignStatus } from "@/types/enums.ts";
import type { WaInboxMessage } from "@/types/global";

import WhatsAppInboxLoader from "../loader/index.tsx";
import AddUnknownContactModal from "./addUnknownContactModal/index.tsx";
import BulkAssignUser from "./AssignUser.tsx";
import type { ChatFilter } from "./chatFilterStore.ts";
import { useChatFilterStore } from "./chatFilterStore.ts";
import WaInboxChatSelectCard from "./chatselectCard/index.tsx";
import ChatSelectSkeletonCardList from "./chatselectCard/Skeleton.tsx";
import ChatselectPanelHeader from "./ChatselectPanelHeader.tsx";

const WaInboxChatSelect = () => {
  const searchParams = useSearch({ strict: false });
  const tab = (searchParams.tab as string) ?? "open";
  const { filter, setFilter, clearFilter } = useChatFilterStore();
  const [processedFilter, setProcessedFilter] = useState<ChatFilter | null>(null);
  const {
    setSelectedContact,
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

  const { t: translations } = useTranslation();
  const checkIfAnyFilterisActive = useCallback((filters: any) => {
    return (
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
  } = useFilteredContacts(encodeURIComponent(JSON.stringify(processedFilter)), !!processedFilter);

  const { data: waSettings, isLoading } = useWaSettings();

  const { setFilterData, filterData } = useContactStore();

  const { mutate: bulkAssignStatusMutation, isPending: isBulkAssignStatusPending } =
    useBulkAssignStatusMutation(null);

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
        };
        setProcessedFilter(processedFilters);
        setFilterData(encodeURIComponent(JSON.stringify(processedFilters)));
      }
    },
    [checkIfAnyFilterisActive],
  );

  const validateSearchStringAsMobileNumber = useCallback((searchString: string): boolean => {
    return !!RegExp(/^\d{10}$/).exec(searchString);
  }, []);
  function updateInitialMessagesToStore(contacts: ContactsWithLastMessage[]) {
    contacts.map((c) => {
      // Rows are conversation-grained; bucket preview messages by the ticket key
      // (conversationId ?? id) so two tickets of one contact don't share a bucket.
      const rowKey = getRowKey(c);
      const messageMap = new Map();
      c.messages.map((m: Partial<WaGetMessagesBody>) => {
        const key = `${rowKey}_${m.sourceIdentifier}`;
        const all = `${rowKey}_all`;
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

    const getNewContacts = (page: { rows: ContactsWithLastMessage[] }) => {
      const existingIds = new Set(state.contactsByFilter[filterKey] || []);
      // Rows are tickets — dedupe on the ticket key, not the contact id, or a
      // contact's second ticket would be discarded as a duplicate of its first.
      const filteredContacts = page.rows.filter((c) => {
        const existingContact = state.contactsById.get(getRowKey(c));
        if (!existingContact) return true;
        return !existingIds.has(getRowKey(c));
      });

      return filteredContacts.map((c) => {
        // A row that is already in the store keeps its stored `updatedAt`: the
        // store merges over the existing entry, so the field is never lost even
        // though this re-emitted row does not carry one itself.
        if (state.contactsById.get(getRowKey(c)))
          return c as ContactsWithLastMessage & { updatedAt: string };
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
    const openStatus = [WaMessageAssignStatus.ASSIGNED, WaMessageAssignStatus.UNASSIGNED];
    // SPAM is deliberately absent: it is no longer a ticket status, so a status
    // selection persisted from before is dropped here rather than re-sent.
    const closedStatus = [
      WaMessageAssignStatus.CLOSED,
      WaMessageAssignStatus.RESOLVED,
      WaMessageAssignStatus.UNRESOLVED,
    ];

    if (tab === "open") {
      const currentOpen =
        filter.status?.filter((s) => openStatus.includes(s as WaMessageAssignStatus)) || [];
      if (currentOpen.length !== (filter.status?.length ?? 0)) {
        setFilter({
          ...filter,
          status: currentOpen,
        });
      }
    } else if (tab === "closed") {
      const currentClosed =
        filter.status?.filter((s) => closedStatus.includes(s as WaMessageAssignStatus)) || [];
      if (currentClosed.length !== (filter.status?.length ?? 0)) {
        setFilter({
          ...filter,
          status: currentClosed,
        });
      }
    }
  }, [tab]);

  const onUnknownContactAddSuccess = useCallback(
    (contact: ContactsData) => {
      // A just-created contact has no ticket row yet; it is selected as a bare
      // conversation shell until the first message lands and the store fills it in.
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
      } as ContactWithUpdatedAt);
    },
    [setSelectedContact],
  );
  useEffect(() => {
    if (!tab) return;
    // `favorite`/`mentions`/`spam` are sticky in the filter store; clear them for
    // every tab that is not their own, or they leak across tabs.
    const base: ChatFilter = {
      ...filter,
      favorite: undefined,
      mentions: undefined,
      spam: undefined,
    };
    if (tab === "blocked") {
      prepareFilters({
        ...base,
        messageType: "all",
        waMessageAssignStatus: undefined,
        blockedUsers: true,
      });
      return;
    }
    if (tab === "all") {
      // All conversations — no status restriction
      prepareFilters({
        ...base,
        messageType: "all",
        waMessageAssignStatus: null,
        blockedUsers: false,
      });
    } else if (tab === "open") {
      const openStatuses = ["ASSIGNED", "UNASSIGNED"];
      const selectedOpenStatuses = filter.status?.filter((s) => openStatuses.includes(s));
      prepareFilters({
        ...base,
        messageType: "usermessages",
        waMessageAssignStatus: undefined,
        status: selectedOpenStatuses?.length ? selectedOpenStatuses : openStatuses,
        blockedUsers: false,
      });
    } else if (tab === "closed") {
      // Closed = Addressed
      prepareFilters({
        ...base,
        messageType: "all",
        waMessageAssignStatus: "Addressed",
        blockedUsers: false,
      });
    } else if (tab === "new") {
      // New = unassigned and active within the last 24h (the API's "New" tab).
      prepareFilters({
        ...base,
        messageType: "usermessages",
        waMessageAssignStatus: "New",
        blockedUsers: false,
      });
    } else if (tab === "mine") {
      // Assigned to me. The API resolves "mine" against the session user.
      prepareFilters({
        ...base,
        messageType: "usermessages",
        waMessageAssignStatus: "mine",
        blockedUsers: false,
      });
    } else if (tab === "spam") {
      // Spam is a flag on the *contact*, so this tab is contact-grained: the API
      // returns one row per spam contact rather than one per ticket, and no status
      // filter applies — a spam contact is listed whatever state its tickets are in.
      prepareFilters({
        ...base,
        messageType: "all",
        waMessageAssignStatus: null,
        status: [],
        spam: true,
        blockedUsers: false,
      });
    } else if (tab === "favourites" || tab === "mentions") {
      // These two are orthogonal booleans, not tab values — they AND with whatever
      // status filter is active, so the status side stays unrestricted here.
      prepareFilters({
        ...base,
        messageType: "all",
        waMessageAssignStatus: null,
        blockedUsers: false,
        favorite: tab === "favourites" ? true : undefined,
        mentions: tab === "mentions" ? true : undefined,
      });
    } else {
      // Fallback for any legacy/custom tab values
      prepareFilters({
        ...base,
        messageType: "usermessages",
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
          refetchFilteredContacts();
        },
      },
    );
  };

  return (
    // Column with a scrolling body: the list used to be sized as
    // `100dvh - 120px`, which only held while the header was exactly that tall
    // and the panel started at the top of the viewport — neither is true once
    // the header wraps a tab strip or a phone's URL bar moves.
    <div className="flex h-full min-h-0 flex-col bg-background">
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
      <div className="flex min-h-0 flex-1 flex-col">
        {isStoreLoading || (!contactIds.length && filteredContactsStatus === "pending") ? (
          <p className="px-4 py-2 text-sm text-muted-foreground">Loading...</p>
        ) : !contactIds.length && filteredContactsStatus === "error" ? (
          <p className="px-4 py-2 text-sm text-destructive">
            Error: {filteredContactsError?.message}
          </p>
        ) : (
          <div ref={parentRef} className="List min-h-0 w-full flex-1 overflow-auto">
            <div className="border-t border-border" />
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
                  {/* Not on Spam: assigning or closing a spam contact's ticket is a
                      dead end — no tab but Spam can show it either way. */}
                  {tab !== "Assigned" && tab !== "mine" && tab !== "spam" && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => setShowBulkAssignDialog(true)}
                            />
                          }
                        >
                          <UserCheck className="w-4 h-4" />
                        </TooltipTrigger>

                        <TooltipContent>
                          <p>{translations("Assign selected chats")}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

                  {tab !== "closed" && tab !== "spam" && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                              onClick={() => setOpenConfirmHandleClose(true)}
                            />
                          }
                        >
                          <CheckCircle className="w-4 h-4" />
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
                    // Key on the ticket id, not the virtual index: the list
                    // reorders as messages arrive, and an index key would recycle
                    // one ticket's row state onto another.
                    key={contactIds[virtualRow.index] ?? `loader-${virtualRow.index}`}
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
                        <Loader className="h-5 w-5 animate-spin text-primary" />
                      </div>
                    ) : (
                      <WaInboxChatSelectCard
                        contact={contact}
                        waSettings={waSettings}
                        lifeCycleLabels={lifeCycleLabels}
                        isSelectionMode={isSelectionMode}
                        selectedChats={selectedChats}
                        setSelectedChats={setSelectedChats}
                      />
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
                  <div className="flex flex-col items-center justify-center p-6 rounded-lg bg-card text-card-foreground shadow-xs">
                    <p className="text-sm text-muted-foreground text-center">
                      {translations("No chats found")} <br />
                      {translations("search for a valid phone number or contact name")}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
      {/* confirm close */}
      <Dialog open={openConfirmHandleClose} onOpenChange={setOpenConfirmHandleClose}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{translations("Close selected chats")}?</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            {translations("Are you sure you want to close the selected chats")}.
          </p>

          <DialogFooter className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpenConfirmHandleClose(false)}>
              {translations("Cancel")}
            </Button>

            <Button
              disabled={isBulkAssignStatusPending}
              onClick={() => {
                handleBulkClose();
              }}
            >
              {isBulkAssignStatusPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {translations("Confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* bulk assign*/}
      <Dialog open={showBulkAssignDialog} onOpenChange={setShowBulkAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Assign {selectedChats.length} Chat
              {selectedChats.length > 1 ? "s" : ""}
            </DialogTitle>

            <DialogDescription>
              {translations("Select a team member to assign the selected conversations")}
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

export default React.memo(WaInboxChatSelect);
