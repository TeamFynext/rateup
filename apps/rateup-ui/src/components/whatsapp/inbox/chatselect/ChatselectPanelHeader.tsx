import { IconBrandWhatsapp } from "@tabler/icons-react";
import { CheckCircle, Clock, Download, Filter, RefreshCcw, Search, Users, X } from "lucide-react";
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
  useEffect(() => {
    if (filter.searchTerm.length && !showSearchBar) setShowSearchBar(true);
    function getFilterActiveCount() {
      let count = 0;
      if (filter.contactGroups.length > 0) {
        count += filter.contactGroups.length;
      }
      if (filter.campaigns.length > 0) {
        count += filter.campaigns.length;
      }
      if (filter.tags.length > 0) {
        count += filter.tags.length;
      }
      if (filter.messageType !== "usermessages") {
        count += 1;
      }
      if (filter.strictFilter !== false) {
        count += 1;
      }
      if ((tab === "All" || tab === "Addressed") && filter.status?.length) {
        count += filter.status.length;
      }
      if (["Assigned", "AssignedToMe"]?.includes(tab) && filter.assignedTeams) {
        count += filter.assignedTeams.length;
      }
      return count;
    }
    setFilterCount(getFilterActiveCount());
  }, [filter, tab]);

  const actionButtonClass =
    "h-7 w-7 p-0 border-0 bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 rounded transition-all";

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

      <header className="flex items-center gap-2 p-2.5">
        <div className="flex items-center gap-1 rounded-lg bg-slate-100/50 p-1 dark:bg-slate-900">
          <Dialog>
            <CustomTooltip
              trigger={
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost" className={actionButtonClass}>
                    <Users className="h-3.5 w-3.5" />
                  </Button>
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
              <Button
                size="sm"
                variant="ghost"
                className={actionButtonClass}
                onClick={() => setShowSearchBar(true)}
              >
                <Search className="h-3.5 w-3.5" />
              </Button>
            }
            content={<p>Search</p>}
            side="bottom"
          />

          <CustomTooltip
            trigger={
              <Button
                size="sm"
                variant="ghost"
                className={cn(
                  actionButtonClass,
                  isSelectionMode && "bg-white text-primary dark:bg-slate-800 dark:text-primary",
                )}
                onClick={() => {
                  setIsSelectionMode(!isSelectionMode);
                  setSelectedChats([]);
                }}
              >
                <CheckCircle className="h-3.5 w-3.5" />
              </Button>
            }
            content={<p>Select Chats</p>}
            side="bottom"
          />

          <Popover>
            <CustomTooltip
              trigger={
                <PopoverTrigger asChild>
                  <Button size="sm" variant="ghost" className={cn(actionButtonClass, "relative")}>
                    <Filter className="h-3.5 w-3.5" />
                    <div className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[8px] text-white">
                      {filterCount}
                    </div>
                  </Button>
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
                <PopoverTrigger asChild>
                  <Button size="sm" variant="ghost" className={actionButtonClass}>
                    <Download className="h-3.5 w-3.5" />
                  </Button>
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
              <Button
                variant="ghost"
                size="sm"
                className={actionButtonClass}
                onClick={() => refetchFilteredContacts()}
              >
                <RefreshCcw
                  className={`h-3.5 w-3.5 ${isRefetchingFilteredContacts ? "animate-spin" : ""}`}
                />
              </Button>
            }
            content={<span>{translations("Refresh")}</span>}
          />
        </div>

        <div className="ml-auto flex items-center text-xs">
          {/* <CustomTooltip
            trigger={ */}
          <SortMenu
            data={sortData}
            value={filter?.sortBy}
            onChange={(value) => setFilter({ ...filter, sortBy: value })}
            defaultValue="newest"
            selectTriggerClassName="h-7 gap-1 border-0 bg-transparent px-1 text-xs font-medium text-slate-400 shadow-none hover:bg-transparent hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            customSelectTrigger={<Clock className="h-3 w-3" />}
          />
          {/* }
            content={<span>{translations("Sort")}</span>}
          /> */}
        </div>
      </header>
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
    <Select onValueChange={onChange} value={value} defaultValue={defaultValue}>
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
