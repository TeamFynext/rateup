import { IconBrandWhatsapp } from "@tabler/icons-react";
import {
  ChevronDown,
  CheckCircle,
  Clock,
  Download,
  RefreshCw,
  Search,
  SlidersHorizontal,
  UserPlus,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
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
import { useUser } from "@/context/UserContext.tsx";
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
  const { user } = useUser();
  const { t: translations } = useTranslation();

  const isMine = filter?.assignedUserIds?.includes(user?.userId || "");
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
        <div className="absolute inset-0 z-50 flex items-center bg-card px-3 animate-in fade-in duration-200">
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
        <div className="flex h-14 py-1 shrink-0 items-center justify-between gap-2.5 border-b border-border bg-background px-4">
          <span className="text-[15px] font-extrabold whitespace-nowrap capitalize text-slate-900 dark:text-slate-100">
            {tab}
          </span>
          <div className="flex items-center gap-3.5 text-slate-400 dark:text-slate-500">
            <Dialog>
              <CustomTooltip
                trigger={
                  <DialogTrigger
                    render={
                      <button className="flex items-center justify-center border-0 bg-transparent p-0 outline-none" />
                    }
                  >
                    <UserPlus className="size-4 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 transition-colors" />
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

            <CustomTooltip
              trigger={
                <button
                  className="flex items-center justify-center border-0 bg-transparent p-0 outline-none"
                  onClick={() => setShowSearchBar(true)}
                >
                  <Search className="size-4 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 transition-colors" />
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
                  <CheckCircle
                    className={cn(
                      "size-4 cursor-pointer transition-colors",
                      isSelectionMode
                        ? "text-blue-600 dark:text-blue-500"
                        : "hover:text-slate-900 dark:hover:text-slate-200",
                    )}
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
                    <div className="relative">
                      <SlidersHorizontal className="size-4 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 transition-colors" />
                      {filterCount > 0 && (
                        <div className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[8px] text-white">
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

            <Popover>
              <CustomTooltip
                trigger={
                  <PopoverTrigger
                    render={
                      <button className="flex items-center justify-center border-0 bg-transparent p-0 outline-none" />
                    }
                  >
                    <Download className="size-4 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 transition-colors" />
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
                      "size-4 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 transition-colors",
                      isRefetchingFilteredContacts && "animate-spin",
                    )}
                  />
                </button>
              }
              content={<span>{translations("Refresh")}</span>}
            />
          </div>
        </div>

        {/* Row 2: Sort */}
        <div className="flex items-center justify-between gap-2 border-b border-border bg-background px-4 py-2.5">
          <div className="flex gap-0.5 rounded-full p-[3px] bg-slate-50 dark:bg-slate-800">
            <button
              onClick={() => setFilter({ ...filter, assignedUserIds: [] })}
              className={cn(
                "cursor-pointer rounded-full px-2.5 py-1 transition-all border-0 outline-none",
                !isMine
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                  : "bg-slate-50 text-slate-500 hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
              )}
            >
              <span className="text-xs font-bold">{translations("Everyone")}</span>
            </button>
            <button
              onClick={() =>
                setFilter({ ...filter, assignedUserIds: user?.userId ? [user.userId] : [] })
              }
              className={cn(
                "cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap transition-all border-0 outline-none",
                isMine
                  ? "bg-white text-primary shadow-sm dark:bg-slate-700 dark:text-primary"
                  : "bg-slate-50 text-slate-500 hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
              )}
            >
              <span className="text-xs font-bold">{translations("Mine")}</span>
            </button>
          </div>

          <div className="flex cursor-pointer items-center gap-1 text-xs whitespace-nowrap text-slate-500 dark:text-slate-400">
            <SortMenu
              data={sortData}
              value={filter?.sortBy}
              onChange={(value) => setFilter({ ...filter, sortBy: value })}
              defaultValue="newest"
              selectTriggerClassName="h-auto w-auto gap-1 border-0 bg-transparent px-2 text-xs text-slate-500 dark:text-slate-400 shadow-none hover:bg-transparent"
              customSelectTrigger={
                <div className="flex items-center gap-1">
                  Sort <ChevronDown className="size-3.25" />
                </div>
              }
            />
          </div>
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
