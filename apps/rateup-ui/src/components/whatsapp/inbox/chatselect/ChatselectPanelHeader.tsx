import {
  IconArrowsSort,
  IconBrandWhatsapp,
  IconCircleCheck,
  IconDownload,
  IconFold,
  IconRefresh,
  IconSearch,
  IconSelector,
  IconUserPlus,
  IconX,
} from "@tabler/icons-react";
import { Fragment, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import CustomTooltip from "@/components/ui/custom/CustomTooltip.tsx";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { SidebarTrigger } from "@/components/ui/sidebar.tsx";
import { useClickOutside } from "@/hooks/use-click-outside.ts";
import { cn } from "@/lib/utils.ts";
import type { ChatFilter } from "@/store/chat-filter.store.ts";
import { useChatFilterStore } from "@/store/chat-filter.store.ts";
import { useInboxViewStore } from "@/store/inbox-view.store.ts";

import { AddUnknownContactForm } from "./addUnknownContactModal/index.tsx";
import ChannelFilter from "./ChannelFilter.tsx";
import WaInboxChatExport from "./chatExport/index.tsx";
import InboxTabStrip from "./InboxTabStrip.tsx";

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
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const { filter, setFilter } = useChatFilterStore();
  const { t: translations } = useTranslation();
  const compactList = useInboxViewStore((s) => s.compact);
  const toggleCompactList = useInboxViewStore((s) => s.toggleCompact);

  useEffect(() => {
    if (filter.searchTerm?.length && !showSearchBar) setShowSearchBar(true);
  }, [filter.searchTerm, showSearchBar]);

  // Only an empty search closes on an outside click: opening a result is itself a click
  // outside, and the effect above would reopen the bar for any term that is left.
  const searchBarRef = useClickOutside<HTMLDivElement>(() => {
    const term = filter.searchTerm ?? "";
    if (term.trim()) return;
    if (term) setFilter({ ...filter, searchTerm: "" });
    setShowSearchBar(false);
  });

  return (
    <div className="relative shrink-0">
      {showSearchBar && (
        <div
          ref={searchBarRef}
          className="absolute inset-0 z-50 flex items-center px-3 animate-in fade-in duration-200 bg-background"
        >
          <div className="relative flex-1">
            <IconSearch className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 transform text-muted-foreground" />
            <Input
              placeholder="Search contact..."
              className="h-8 w-full pl-8 pr-8 text-xs placeholder:text-sm"
              value={filter?.searchTerm}
              onChange={(e) => setFilter({ ...filter, searchTerm: e.currentTarget.value })}
              autoFocus
            />
            {/* Centred with margins: Button's `active:translate-y-px` would override a
                `-translate-y-1/2` on press and move it out from under the cursor. */}
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label={translations("Clear search")}
              className="absolute inset-y-0 right-1 my-auto"
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

            <SortMenu
              value={filter?.sortBy}
              onChange={(value) => setFilter({ ...filter, sortBy: value })}
            />

            <CustomTooltip
              trigger={
                <button
                  className={cn(
                    "flex size-6 items-center justify-center rounded-md border-0 bg-transparent p-0 outline-none",
                    compactList && "bg-primary/10 text-primary",
                  )}
                  onClick={toggleCompactList}
                  aria-pressed={compactList}
                >
                  {compactList ? (
                    <IconSelector className="size-4 cursor-pointer" />
                  ) : (
                    <IconFold className="size-4 cursor-pointer" />
                  )}
                </button>
              }
              content={
                <p>
                  {compactList
                    ? translations("Switch to detailed list")
                    : translations("Switch to compact list")}
                </p>
              }
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

            <CustomTooltip
              trigger={
                <button
                  aria-label={translations("Refresh")}
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
              side="bottom"
            />

            <Popover>
              <CustomTooltip
                trigger={
                  <PopoverTrigger
                    render={
                      <button
                        aria-label={translations("Download chats")}
                        className="flex items-center justify-center border-0 bg-transparent p-0 outline-none"
                      />
                    }
                  >
                    <IconDownload className="size-4 cursor-pointer" />
                  </PopoverTrigger>
                }
                content={<p>{translations("Download chats")}</p>}
                side="bottom"
              />
              <PopoverContent className="w-full">
                <WaInboxChatExport />
              </PopoverContent>
            </Popover>

            <Dialog open={isAddContactOpen} onOpenChange={setIsAddContactOpen}>
              <CustomTooltip
                trigger={
                  <DialogTrigger
                    render={
                      <button
                        aria-label="New Contact"
                        className="flex items-center justify-center border-0 bg-transparent p-0 outline-none"
                      />
                    }
                  >
                    <IconUserPlus className="size-4 cursor-pointer" />
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
                    <p className="text-xs text-muted-foreground">
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
                  successCallback={(contact) => {
                    onUnknownContactAddSuccess?.(contact);
                    setIsAddContactOpen(false);
                  }}
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
      </div>
    </div>
  );
};

const SORT_OPTIONS: {
  groupName: string;
  items: { label: string; value: ChatFilter["sortBy"] }[];
}[] = [
  {
    groupName: "Last activity",
    items: [
      { label: "Newest first", value: "newest" },
      { label: "Oldest first", value: "oldest" },
    ],
  },
  {
    groupName: "Customer's last message",
    items: [
      { label: "Newest first", value: "newest_wa_created" },
      { label: "Oldest first", value: "oldest_wa_created" },
    ],
  },
];

/**
 * The list's sort order, as an icon in the header row. Tinted when it is not the default.
 * Labels name what `filterChats` in rateup-api orders by: `newest`/`oldest` is the ticket's
 * last message either way, `*_wa_created` the customer's last message.
 */
const SortMenu = ({
  value,
  onChange,
}: {
  value: ChatFilter["sortBy"];
  onChange: (value: ChatFilter["sortBy"]) => void;
}) => {
  const { t } = useTranslation();
  const isDefault = !value || value === "newest";
  return (
    <DropdownMenu>
      <CustomTooltip
        trigger={
          <DropdownMenuTrigger
            render={
              <button
                aria-label={t("Sort conversations")}
                className={cn(
                  "flex size-6 items-center justify-center rounded-md border-0 bg-transparent p-0 outline-none",
                  !isDefault && "bg-primary/10 text-primary",
                )}
              />
            }
          >
            <IconArrowsSort className="size-4 cursor-pointer" />
          </DropdownMenuTrigger>
        }
        content={<p>{t("Sort")}</p>}
        side="bottom"
      />
      <DropdownMenuContent align="end" className="w-auto min-w-44">
        {SORT_OPTIONS.map((group, index) => (
          <Fragment key={group.groupName}>
            {index > 0 && <DropdownMenuSeparator />}
            <DropdownMenuRadioGroup
              value={value ?? "newest"}
              onValueChange={(next: string) => onChange(next as ChatFilter["sortBy"])}
            >
              <DropdownMenuLabel>{t(group.groupName)}</DropdownMenuLabel>
              {group.items.map((item) => (
                <DropdownMenuRadioItem key={item.value} value={item.value}>
                  {t(item.label)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ChatselectPanelHeader;
