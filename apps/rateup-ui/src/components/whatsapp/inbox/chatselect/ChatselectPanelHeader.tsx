import {
  IconBrandWhatsapp,
  IconChevronDown,
  IconCircleCheck,
  IconClock,
  IconDownload,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import React, { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import CustomTooltip from "@/components/ui/custom/CustomTooltip.tsx";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { SidebarTrigger } from "@/components/ui/sidebar.tsx";
import { cn } from "@/lib/utils.ts";
import type { ChatFilter } from "@/store/chat-filter.store.ts";
import { useChatFilterStore } from "@/store/chat-filter.store.ts";
import { useChatContactCountStore, useContactsStore } from "@/store/inbox.store.ts";

import { AddUnknownContactForm } from "./addUnknownContactModal/index.tsx";
import ChannelFilter from "./ChannelFilter.tsx";
import WaInboxChatExport from "./chatExport/index.tsx";
import InboxTabStrip from "./InboxTabStrip.tsx";

// Inbox tab → the sidebar rail's count for that tab. Blocked is absent on
// purpose: the API returns no total for it.
const TAB_SECTION_COUNT_KEY = {
  open: "openCount",
  new: "newCount",
  closed: "closedCount",
  all: "allCount",
  mentions: "mentionsCount",
  favourites: "favouriteCount",
  mine: "mineCount",
  spam: "spamCount",
} as const;

const ChatselectPanelHeader = ({
  isRefetchingFilteredContacts,
  refetchFilteredContacts,
  onUnknownContactAddSuccess,
  tab,
  isSelectionMode,
  setIsSelectionMode,
  setSelectedChats,
}: {
  isRefetchingFilteredContacts: boolean;
  refetchFilteredContacts: () => void;
  onUnknownContactAddSuccess?: (contact: ContactsData) => void;
  tab: string;
  isSelectionMode: boolean;
  setIsSelectionMode: (mode: boolean) => void;
  setSelectedChats: Dispatch<SetStateAction<string[]>>;
}) => {
  const [showSearchBar, setShowSearchBar] = useState(false);
  const sortData = [
    {
      groupName: "Message received",
      items: [
        { label: "Newest First", value: "newest" },
        { label: "Oldest First", value: "oldest" },
      ],
    },
    {
      groupName: "Message Created",
      items: [
        { label: "Newest First", value: "newest_wa_created" },
        { label: "Oldest First", value: "oldest_wa_created" },
      ],
    },
  ];
  const { filter, setFilter } = useChatFilterStore();
  const { t: translations } = useTranslation();

  // The header count has to agree with the sidebar rail's count for the same tab,
  // so it reads the same backend totals. The store's row list only holds the pages
  // fetched so far, which undercounts everything past the first page.
  const sectionCounts = useChatContactCountStore((s) => s.sectionCounts);
  const loadedRowCount = useContactsStore((s) =>
    s.currentFilterKey ? (s.contactsByFilter[s.currentFilterKey]?.length ?? 0) : 0,
  );
  const countKey = TAB_SECTION_COUNT_KEY[tab as keyof typeof TAB_SECTION_COUNT_KEY];
  // Blocked has no backend total, and a search narrows the list below the tab
  // total — both fall back to what is actually loaded.
  const rowCount =
    countKey && !filter?.searchTerm?.length ? sectionCounts[countKey] : loadedRowCount;
  // The Spam tab is contact-grained — one row per contact — so it counts contacts.
  const rowNoun =
    tab === "spam"
      ? rowCount === 1
        ? translations("contact")
        : translations("contacts")
      : rowCount === 1
        ? translations("conversation")
        : translations("conversations");
  const rowCountLabel = `${rowCount} ${rowNoun}`;

  useEffect(() => {
    if (filter.searchTerm?.length && !showSearchBar) setShowSearchBar(true);
  }, [filter.searchTerm, showSearchBar]);

  return (
    <div className="relative shrink-0">
      {showSearchBar && (
        <div className="absolute inset-0 z-50 flex items-center px-3 animate-in fade-in duration-200 bg-background">
          <div className="relative flex-1">
            <IconSearch className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 transform text-muted-foreground" />
            <Input
              placeholder="Search contact..."
              className="h-8 w-full pl-8 pr-8 text-xs placeholder:text-sm"
              value={filter?.searchTerm}
              onChange={(e) => setFilter({ ...filter, searchTerm: e.currentTarget.value })}
              autoFocus
            />
            <Button
              size="sm"
              variant="ghost"
              className="absolute right-0.5 top-1/2 h-6 w-6 -translate-y-1/2 transform p-0"
              onClick={() => {
                setShowSearchBar(false);
                setFilter({ ...filter, searchTerm: "" });
              }}
            >
              <IconX className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
      <div className="flex flex-col">
        {/* Row 1: Title and Actions */}
        <div className="flex h-14 shrink-0 items-center justify-between gap-2.5 border-b border-border bg-background px-3 py-1 lg:px-4">
          <div className="flex min-w-0 items-center gap-1.5">
            {/* The nav rail collapses into a sheet below md and its own trigger
                goes with it, so the inbox — a full-screen page there — carries the
                only way back out. */}
            <SidebarTrigger className="-ml-1 size-8 md:hidden" />
            <span className="truncate text-[15px] font-extrabold whitespace-nowrap capitalize text-foreground">
              {tab}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-muted-foreground">
            <CustomTooltip
              trigger={
                <button
                  className="flex items-center justify-center border-0 bg-transparent p-0 outline-none"
                  onClick={() => setShowSearchBar(true)}
                >
                  <IconSearch className="size-4 cursor-pointer" />
                </button>
              }
              content={<p>Search</p>}
              side="bottom"
            />

            <CustomTooltip
              trigger={
                <button
                  className="flex items-center justify-center border-0 bg-transparent p-0 outline-none"
                  onClick={() => {
                    setIsSelectionMode(!isSelectionMode);
                    setSelectedChats([]);
                  }}
                >
                  <IconCircleCheck
                    className={cn("size-4 cursor-pointer", isSelectionMode && "text-primary")}
                  />
                </button>
              }
              content={<p>Select Chats</p>}
              side="bottom"
            />

            <Popover>
              <CustomTooltip
                trigger={
                  <PopoverTrigger
                    render={
                      <button className="flex items-center justify-center border-0 bg-transparent p-0 outline-none" />
                    }
                  >
                    <IconDownload className="size-4 cursor-pointer" />
                  </PopoverTrigger>
                }
                content={<p>Download Chats</p>}
                side="bottom"
              />
              <PopoverContent className="w-full">
                <WaInboxChatExport />
              </PopoverContent>
            </Popover>

            <CustomTooltip
              trigger={
                <button
                  className="flex items-center justify-center border-0 bg-transparent p-0 outline-none"
                  onClick={() => refetchFilteredContacts()}
                >
                  <IconRefresh
                    className={cn(
                      "size-4 cursor-pointer",
                      isRefetchingFilteredContacts && "animate-spin",
                    )}
                  />
                </button>
              }
              content={<span>{translations("Refresh")}</span>}
            />

            <Dialog>
              <CustomTooltip
                trigger={
                  <DialogTrigger
                    render={
                      <button className="flex h-7.5 cursor-pointer items-center gap-1.25 rounded-lg border-0 px-2.75 text-xs font-bold text-white outline-none bg-primary" />
                    }
                  >
                    <IconPlus className="size-3.5" />
                    {translations("New")}
                  </DialogTrigger>
                }
                content={<p>New Contact</p>}
                side="bottom"
              />
              <DialogContent>
                <DialogTitle>
                  <div className="flex flex-col items-start justify-center">
                    <div className="flex items-center justify-center gap-1">
                      <div className="bg-green-500 w-10 h-10 rounded-full flex items-center justify-center">
                        <IconBrandWhatsapp color="white" size={26} />
                      </div>
                      <h1 className="font-semibold text-lg">
                        {translations("Add New WhatsApp contact")}
                      </h1>
                    </div>
                    <p className="text-xs text-gray-500">
                      {translations(
                        "Add a contact to start WhatsApp conversation Enter their details below to begin messaging",
                      )}
                      .
                    </p>
                  </div>
                </DialogTitle>
                <AddUnknownContactForm
                  phone=""
                  triggerType="action_button"
                  successCallback={onUnknownContactAddSuccess}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Row 2 (small screens only): the tab rail the sidebar cannot show here */}
        <InboxTabStrip tab={tab} />

        {/* Row 2b (small screens only): same reason — the sidebar's Channel filter
            is off-screen below md, so the list panel carries it. */}
        <div className="shrink-0 border-b border-border px-3 py-2 md:hidden">
          <ChannelFilter />
        </div>

        {/* Row 3: Row count + Everyone/Mine + sort */}
        <div className="flex h-9 shrink-0 items-center justify-between border-b px-3">
          <span className="whitespace-nowrap text-xs text-muted-foreground">{rowCountLabel}</span>

          <SortMenu
            data={sortData}
            value={filter?.sortBy}
            onChange={(value) => setFilter({ ...filter, sortBy: value as ChatFilter["sortBy"] })}
            defaultValue="newest"
            selectTriggerClassName="h-auto w-auto gap-1 border-0 bg-transparent px-0 text-xs! shadow-none hover:bg-transparent text-muted-foreground focus:ring-0 focus:ring-offset-0"
            customSelectTrigger={
              <div className="flex items-center gap-1">
                {translations("Newest")} <IconChevronDown className="size-3.25" />
              </div>
            }
          />
        </div>
      </div>
    </div>
  );
};

const SortMenu = ({
  data,
  onChange,
  value,
  defaultValue,
  customSelectTrigger,
  selectTriggerClassName,
}: {
  data: { items: { label: string; value: string }[]; groupName: string }[];
  value: string;
  onChange: (value: string) => void;
  defaultValue: string;
  customSelectTrigger?: React.ReactNode;
  selectTriggerClassName?: string;
}) => {
  return (
    <Select
      onValueChange={(value) => onChange(value ?? "")}
      value={value}
      defaultValue={defaultValue}
      items={data}
    >
      <SelectTrigger className={selectTriggerClassName}>
        <SelectValue placeholder={customSelectTrigger ?? <IconClock className="w-3 h-3 mr-1" />} />
      </SelectTrigger>
      <SelectContent>
        {data.map((g, _index) => (
          <SelectGroup key={g?.groupName}>
            <SelectLabel>{g?.groupName}</SelectLabel>
            {g?.items?.map((item) => (
              <SelectItem key={item?.value} value={item?.value}>
                {item?.label}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
};

export default ChatselectPanelHeader;
