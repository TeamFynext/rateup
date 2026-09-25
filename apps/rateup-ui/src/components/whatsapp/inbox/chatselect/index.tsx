import { IconCircleCheck, IconLoader, IconTrash, IconUserCheck } from "@tabler/icons-react";
import { useSearch } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import { chunk } from "lodash";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useBulkAssignStatusMutation } from "@/backend/campaign/contacts/contacts.query";
import { getRowKey } from "@/backend/whatsapp/inbox/message/wamessage.api";
import type { WaGetMessagesBody } from "@/backend/whatsapp/inbox/message/wamessage.api";
import type { ContactsWithLastMessage } from "@/backend/whatsapp/inbox/message/wamessage.api";
import {
  useDeleteConversations,
  useFilteredContacts,
} from "@/backend/whatsapp/inbox/message/wamessage.query";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Progress, ProgressLabel } from "@/components/ui/progress.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { useLifecycleContext } from "@/context/LifecycleContext.ts";
import { useUser } from "@/context/UserContext.tsx";
import { usePermissions } from "@/hooks/usePermission.ts";
import type { ChatFilterStore } from "@/store/chat-filter.store.ts";
import type { ChatFilter } from "@/store/chat-filter.store.ts";
import { useChatFilterStore } from "@/store/chat-filter.store.ts";
import { useInboxViewStore } from "@/store/inbox-view.store.ts";
import useContactStore, {
  makeFilterKey,
  useContactsStore,
  useMessagesStore,
} from "@/store/inbox.store.ts";
import type { ContactWithUpdatedAt } from "@/store/inbox.store.ts";
import { MessagePlatform, WaMessageAssignStatus } from "@/types/enums.ts";
import type { WaInboxMessage } from "@/types/global";
import { INBOX_BULK_CHUNK_SIZE, INBOX_BULK_SELECTION_LIMIT } from "@/utils/constants.ts";

import WhatsAppInboxLoader from "../loader/index.tsx";
import AddUnknownContactModal from "./addUnknownContactModal/index.tsx";
import BulkAssignUser from "./AssignUser.tsx";
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
      if (processedFilter) await loadContactsFromDB(processedFilter, user);
      if (cancelled) return;
    })();

    return () => {
      cancelled = true;
    };
  }, [processedFilter]);

  const { t: translations } = useTranslation();
  const checkIfAnyFilterisActive = useCallback((filters: ChatFilterStore["filter"]) => {
    // The original condition OR-ed `messageType !== "all"` with `messageType !== "usermessages"`,
    // which is true for every value — so this has always reported the filter as active. Kept
    // as-is; making it `&&` would change behaviour.
    const messageTypeIsActive = true;
    return (
      (filters.searchTerm?.length ?? 0) > 0 ||
      messageTypeIsActive ||
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

  const { mutateAsync: bulkAssignStatusMutation } = useBulkAssignStatusMutation("");
  const bulkDeleteMutation = useDeleteConversations();
  // The bulk action in flight, if any. Close and delete go out in chunks, and
  // this is what the toolbar's progress bar reads between chunks.
  const [bulkProgress, setBulkProgress] = useState<{
    action: "close" | "delete";
    done: number;
    total: number;
  } | null>(null);
  const confirm = useConfirm();
  // Matches the endpoint's own gate and the per-row action.
  const canBulkDelete = usePermissions().can("inbox.delete");

  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const [selectedChats, setSelectedChats] = useState<string[]>([]);
  const [showBulkAssignDialog, setShowBulkAssignDialog] = useState(false);
  const [openConfirmHandleClose, setOpenConfirmHandleClose] = useState(false);

  const parentRef = useRef<HTMLDivElement | null>(null);

  const prepareFilters = useCallback(
    (filters: ChatFilterStore["filter"]) => {
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

    // Rows a fetch returns are *not* filtered against what the store already
    // holds. A ticket the store knows about is exactly the one whose last
    // message, unread count and status go stale, and the cached copy outlives
    // the tab (IndexedDB), so dropping it here meant a reload re-read the old
    // row and threw the fresh one away — the list only ever corrected itself on
    // logout, which is what clears that cache. `addContactsForFilter` already
    // merges by `updatedAt`, so handing it every row is safe and idempotent.
    const stampContacts = (page: { rows: ContactsWithLastMessage[] }) =>
      page.rows.map((c) => {
        // The API sends the ticket's own `updatedAt`; that is what decides
        // whether this row supersedes the cached one, so it must survive. Only
        // a row without one falls back to the client clock, and then only if
        // the store has nothing to keep — stamping "now" over a real server
        // timestamp would make the cached row outrank every later response.
        const existing = useContactsStore.getState().contactsById.get(getRowKey(c));
        return {
          ...c,
          updatedAt: c.updatedAt ?? existing?.updatedAt ?? new Date().toISOString(),
        };
      });

    const syncContacts = async () => {
      if (!filteredContacts || !isActive) return;
      const allContacts = filteredContacts.pages.flatMap((p) => p.rows) ?? [];
      if (!allContacts?.length) {
        if (processedFilter) clearContactsForFilter(processedFilter);
        return;
      }

      for (const page of filteredContacts.pages) {
        if (!isActive || !page.rows?.length) continue;

        const rows = stampContacts(page);

        if (rows.length) {
          await useContactsStore.getState().addContactsForFilter(filterKey, rows);
          updateInitialMessagesToStore(rows);
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
    () => contactsByFilter[currentFilterKey ?? ""] || [],
    [contactsById, currentFilterKey, contactsByFilter],
  );

  /**
   * The selection holds row keys (ticket ids). Assigning and closing are
   * contact-grained endpoints, so they get the contacts behind those rows —
   * deduped, since one contact can own several selected tickets. Bulk delete is
   * ticket-grained and uses the row keys as they are.
   */
  const selectedContactIds = useMemo(
    () => [
      ...new Set(
        selectedChats
          .map((rowKey) => contactsById.get(rowKey)?.id)
          .filter((id): id is string => Boolean(id)),
      ),
    ],
    [selectedChats, contactsById],
  );

  const rowCount = contactIds.length + (hasNextPageFilteredContacts ? 1 : 0);
  const compactList = useInboxViewStore((s) => s.compact);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    // Rows are measured once drawn; this only sizes the ones not yet rendered.
    estimateSize: () => (compactList ? 66 : 90),
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
      } as unknown as ContactWithUpdatedAt);
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

  // "Select all" stops at the cap; the header checkbox reads as checked once the
  // selection holds everything it is allowed to.
  const selectAllCount = Math.min(contactIds.length, INBOX_BULK_SELECTION_LIMIT);
  const hasSelection = selectedChats.length > 0;
  const toggleSelectAll = () => {
    if (selectedChats.length >= selectAllCount) {
      setSelectedChats([]);
      return;
    }
    setSelectedChats(contactIds.slice(0, INBOX_BULK_SELECTION_LIMIT));
    if (contactIds.length > INBOX_BULK_SELECTION_LIMIT) {
      toast.info(
        `Selected the first ${INBOX_BULK_SELECTION_LIMIT} chats — that is the most at a time`,
        {
          id: "bulk-selection-limit",
        },
      );
    }
  };

  /**
   * Delete every selected ticket. Unlike the bulk close below it takes the rows'
   * own ids: a ticket is what is being deleted, not the customer.
   *
   * Sent in chunks so the list empties as the server confirms each one. A chunk
   * that fails stops the run; the mutation already toasts the error, and the
   * rows it did not reach stay selected so the action can be retried on them.
   */
  const handleBulkDelete = async () => {
    const count = selectedChats.length;
    const confirmed = await confirm({
      title: count === 1 ? "Delete conversation" : `Delete ${count} conversations`,
      description:
        count === 1
          ? "The selected conversation will be deleted."
          : `The ${count} selected conversations will be deleted.`,
      warning:
        "Every message in them is permanently deleted for everyone, and the contacts keep their other conversations. This cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
    });
    if (!confirmed) return;

    const rowKeys = selectedChats;
    let done = 0;
    setBulkProgress({ action: "delete", done, total: rowKeys.length });
    try {
      for (const ids of chunk(rowKeys, INBOX_BULK_CHUNK_SIZE)) {
        // The mutation's own onSuccess drops the rows from the store.
        await bulkDeleteMutation.mutateAsync(ids);
        done += ids.length;
        setBulkProgress({ action: "delete", done, total: rowKeys.length });
      }
      setSelectedChats([]);
      setIsSelectionMode(false);
    } catch {
      setSelectedChats(rowKeys.slice(done));
    } finally {
      setBulkProgress(null);
    }
  };

  /**
   * Close every selected ticket. The endpoint is contact-grained, so the rows
   * are grouped by contact and each chunk is a set of contacts; once a chunk
   * lands, every selected row of those contacts is marked closed locally.
   *
   * The optimistic row sets `conversationStatus` as well as the contact-level
   * status: the store judges list membership by the *ticket's* status
   * (`rowStatus`), so a row whose `conversationStatus` stayed open never left
   * the Open tab — and the refetch afterwards only merges rows in, it never
   * removes them, so the stale row lived on in IndexedDB as well.
   */
  const handleBulkClose = async () => {
    setOpenConfirmHandleClose(false);
    const rowsByContact = new Map<string, string[]>();
    for (const rowKey of selectedChats) {
      const contactId = contactsById.get(rowKey)?.id;
      if (contactId)
        rowsByContact.set(contactId, [...(rowsByContact.get(contactId) ?? []), rowKey]);
    }
    const contactIdList = [...rowsByContact.keys()];
    const closedAt = new Date().toISOString();
    let done = 0;
    setBulkProgress({ action: "close", done, total: contactIdList.length });
    try {
      for (const ids of chunk(contactIdList, INBOX_BULK_CHUNK_SIZE)) {
        await bulkAssignStatusMutation({
          contactIds: ids,
          waMessageAssignStatus: WaMessageAssignStatus.CLOSED,
        });
        for (const rowKey of ids.flatMap((id) => rowsByContact.get(id) ?? [])) {
          updateContactById(rowKey, (existing) => ({
            ...existing,
            waMessageAssignStatus: WaMessageAssignStatus.CLOSED,
            conversationStatus: WaMessageAssignStatus.CLOSED,
            closedAt,
            closedUser: {
              name: user?.userName ?? "",
              id: user?.userId ?? "",
            },
            assignedUsers: [],
          }));
        }
        done += ids.length;
        setBulkProgress({ action: "close", done, total: contactIdList.length });
      }
      setSelectedChats([]);
      setIsSelectionMode(false);
    } catch {
      const remaining = new Set(
        contactIdList.slice(done).flatMap((id) => rowsByContact.get(id) ?? []),
      );
      setSelectedChats(selectedChats.filter((rowKey) => remaining.has(rowKey)));
    } finally {
      setBulkProgress(null);
      refetchFilteredContacts();
    }
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
            {isSelectionMode && bulkProgress && (
              <div className="h-12 px-3 border-b flex items-center">
                <Progress
                  value={bulkProgress.total ? (bulkProgress.done / bulkProgress.total) * 100 : 0}
                  className="w-full gap-x-3 gap-y-1.5"
                >
                  <ProgressLabel className="text-xs">
                    {bulkProgress.action === "close"
                      ? translations("Closing chats")
                      : translations("Deleting chats")}
                    …
                  </ProgressLabel>
                  <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                    {bulkProgress.done} / {bulkProgress.total}
                  </span>
                </Progress>
              </div>
            )}
            {/* Shown from the moment selection mode is on, so "select all" is reachable
                before any row is ticked; the actions wait for a selection. */}
            {isSelectionMode && !bulkProgress && (
              <div className="h-12 px-3 border-b flex items-center justify-between transition-all">
                <div className="flex items-center gap-3">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectAllCount > 0 && selectedChats.length >= selectAllCount}
                      disabled={selectAllCount === 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded text-foreground focus:ring-primary"
                    />

                    <span className="text-sm font-medium text-foreground">
                      {hasSelection
                        ? translations("{count} selected", { count: selectedChats.length })
                        : translations("Select all")}
                    </span>
                  </label>

                  {hasSelection && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setSelectedChats([])}
                    >
                      {translations("Clear")}
                    </Button>
                  )}
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
                              disabled={!hasSelection}
                              onClick={() => setShowBulkAssignDialog(true)}
                            />
                          }
                        >
                          <IconUserCheck className="w-4 h-4" />
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
                              disabled={!hasSelection}
                              onClick={() => setOpenConfirmHandleClose(true)}
                            />
                          }
                        >
                          <IconCircleCheck className="w-4 h-4" />
                        </TooltipTrigger>

                        <TooltipContent>
                          <p>{translations("Close selected chats")}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

                  {/* Delete is offered on every tab, spam included: unlike closing
                      or assigning, removing a thread is never a dead end. */}
                  {canBulkDelete && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              size="sm"
                              variant="outline"
                              loading={bulkDeleteMutation.isPending}
                              disabled={!hasSelection}
                              className="h-8 w-8 p-0 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => {
                                handleBulkDelete();
                              }}
                            />
                          }
                        >
                          <IconTrash className="w-4 h-4" />
                        </TooltipTrigger>

                        <TooltipContent>
                          <p>{translations("Delete selected chats")}</p>
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
                let contact = null;
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
                    {isBottomLoader || !contact ? (
                      <div className="flex items-center justify-center py-2">
                        <IconLoader className="h-5 w-5 animate-spin text-primary" />
                      </div>
                    ) : (
                      <WaInboxChatSelectCard
                        contact={contact}
                        waSettings={waSettings!}
                        lifeCycleLabels={lifeCycleLabels ?? []}
                        isSelectionMode={isSelectionMode}
                        selectedChats={selectedChats}
                        setSelectedChats={setSelectedChats}
                      />
                    )}
                  </div>
                );
              })}
              {rowVirtualizer.getVirtualItems()?.length === 0 &&
                (validateSearchStringAsMobileNumber(filter.searchTerm ?? "") ? (
                  <AddUnknownContactModal
                    phone={filter.searchTerm ?? ""}
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
              onClick={() => {
                handleBulkClose();
              }}
            >
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
            filterData={filterData ?? ""}
            contactIds={selectedContactIds}
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
