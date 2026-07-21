import { IconBrandWhatsapp } from "@tabler/icons-react";
import {
  ChevronDown,
  CheckCircle,
  Clock,
  Download,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useContactsStore } from "@/components/dashboard/inbox/store.ts";
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
import { cn } from "@/lib/utils.ts";

import { AddUnknownContactForm } from "./addUnknownContactModal/index.tsx";
import WaInboxChatExport from "./chatExport/index.tsx";
import WaInboxChatFilter, { useChatFilterStore } from "./chatFilter/index.tsx";

const ChatselectPanelHeader = ({
  isRefetchingFilteredContacts,
  refetchFilteredContacts,
  onUnknownContactAddSuccess,
  tab,
  isSelectionMode,
  setIsSelectionMode,
  setSelectedChats,
}) => {
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [filterCount, setFilterCount] = useState(0);
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

  // Rows are conversation-grained (one per ticket), so the count comes from the
  // store's row list for the active filter rather than a contact count.
  const rowCount = useContactsStore((s) => s.contactsByFilter[s.currentFilterKey]?.length ?? 0);
  const rowCountLabel = `${rowCount} ${rowCount === 1 ? translations("conversation") : translations("conversations")}`;

  useEffect(() => {
    if (filter.searchTerm.length && !showSearchBar) setShowSearchBar(true);
    function getFilterActiveCount() {
      let count = 0;
      if (filter.messageType !== "usermessages") {
        count += 1;
      }
      if (filter.strictFilter !== false) {
        count += 1;
      }
      if ((tab === "all" || tab === "closed") && filter.status?.length) {
        count += filter.status.length;
      }
      if (tab === "open" && filter.assignedTeams) {
        count += filter.assignedTeams.length;
      }
      return count;
    }
    setFilterCount(getFilterActiveCount());
  }, [filter, tab]);

  return (
    <div className="relative shrink-0">
      {showSearchBar && (
        <div className="absolute inset-0 z-50 flex items-center px-3 animate-in fade-in duration-200 bg-background">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 transform text-muted-foreground" />
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
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
      <div className="flex flex-col">
        {/* Row 1: Title and Actions */}
        <div className="flex h-14 shrink-0 items-center justify-between gap-2.5 border-b border-border bg-background px-4 py-1">
          <span className="text-[15px] font-extrabold whitespace-nowrap capitalize text-foreground">
            {tab}
          </span>
          <div className="flex items-center gap-3 text-muted-foreground">
            <CustomTooltip
              trigger={
                <button
                  className="flex items-center justify-center border-0 bg-transparent p-0 outline-none"
                  onClick={() => setShowSearchBar(true)}
                >
                  <Search className="size-4 cursor-pointer" />
                </button>
              }
              content={<p>Search</p>}
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
                    <div className="relative">
                      <SlidersHorizontal className="size-4 cursor-pointer" />
                      {filterCount > 0 && (
                        <div className="absolute -right-1.5 -top-1.5 flex size-3.5 items-center justify-center rounded-full text-[8px] text-white bg-primary">
                          {filterCount}
                        </div>
                      )}
                    </div>
                  </PopoverTrigger>
                }
                content={<p>Advanced Filters</p>}
                side="bottom"
              />
              <PopoverContent className="w-full">
                <WaInboxChatFilter />
              </PopoverContent>
            </Popover>

            <CustomTooltip
              trigger={
                <button
                  className="flex items-center justify-center border-0 bg-transparent p-0 outline-none"
                  onClick={() => {
                    setIsSelectionMode(!isSelectionMode);
                    setSelectedChats([]);
                  }}
                >
                  <CheckCircle
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
                    <Download className="size-4 cursor-pointer" />
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
                  <RefreshCw
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
                    <Plus className="size-3.5" />
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

        {/* Row 2: Row count + Everyone/Mine + sort */}
        <div className="flex items-center justify-between px-3 border-b">
          <span className="whitespace-nowrap text-xs text-muted-foreground">{rowCountLabel}</span>

          <SortMenu
            data={sortData}
            value={filter?.sortBy}
            onChange={(value) => setFilter({ ...filter, sortBy: value })}
            defaultValue="newest"
            selectTriggerClassName="h-auto w-auto gap-1 border-0 bg-transparent px-0 text-xs! shadow-none hover:bg-transparent text-muted-foreground focus:ring-0 focus:ring-offset-0"
            customSelectTrigger={
              <div className="flex items-center gap-1">
                {translations("Newest")} <ChevronDown className="size-3.25" />
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
  onChange: (value) => void;
  defaultValue: string;
  customSelectTrigger?: React.ReactNode;
  selectTriggerClassName?: string;
}) => {
  return (
    <Select onValueChange={onChange} value={value} defaultValue={defaultValue} items={data}>
      <SelectTrigger className={selectTriggerClassName}>
        <SelectValue placeholder={customSelectTrigger ?? <Clock className="w-3 h-3 mr-1" />} />
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
