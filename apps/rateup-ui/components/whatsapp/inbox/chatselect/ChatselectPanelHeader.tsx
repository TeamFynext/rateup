import React, { useEffect, useState } from "react";

import { IconBrandWhatsapp } from "@tabler/icons-react";
import {
  CheckSquare,
  Clock,
  Download,
  Filter,
  RefreshCcw,
  Search,
  UserPlus,
  X,
} from "lucide-react";
import { useExtracted } from "next-intl";

import { Button } from "@/components/ui/button";
import CustomTooltip from "@/components/ui/custom/CustomTooltip";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "@/components/ui/select";

import { AddUnknownContactForm } from "./addUnknownContactModal";
import WaInboxChatExport from "./chatExport";
import WaInboxChatFilter, { useChatFilterStore } from "./chatFilter";

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
  const translations = useExtracted();
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

  return (
    <div className="p-3 border-b space-y-3 shrink-0 relative">
      {showSearchBar && (
        <div className="absolute inset-0 bg-card z-50 flex items-center px-3 animate-in fade-in duration-200">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search contact..."
              className="pl-8 pr-8 h-8 text-xs w-full placeholder:text-sm"
              value={filter?.searchTerm}
              onChange={(e) =>
                setFilter({ ...filter, searchTerm: e.currentTarget.value })
              }
              autoFocus
            />
            <Button
              size="sm"
              variant="ghost"
              className="absolute right-0.5 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
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
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Dialog>
            <CustomTooltip
              trigger={
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                    <UserPlus className="w-3.5 h-3.5" />
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
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => setShowSearchBar(true)}
              >
                <Search className="w-3.5 h-3.5" />
              </Button>
            }
            content={<p>Search</p>}
            side="bottom"
          />

          <Popover>
            <CustomTooltip
              trigger={
                <PopoverTrigger asChild>
                  <Button
                    size="sm"
                    variant={isSelectionMode ? "default" : "outline"}
                    className="h-8 w-8 p-0"
                    onClick={() => {
                      setIsSelectionMode(!isSelectionMode);
                      setSelectedChats([]);
                    }}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                  </Button>
                </PopoverTrigger>
              }
              content={<p>Select Chats</p>}
              side="bottom"
            />
          </Popover>

          <Popover>
            <CustomTooltip
              trigger={
                <PopoverTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 relative"
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <div className="absolute -top-2 -right-1 bg-blue-500 rounded-xl w-4 h-4 text-xs text-white">
                      {filterCount}
                    </div>
                  </Button>
                </PopoverTrigger>
              }
              content={<p>Advanced Filters</p>}
              side="bottom"
            />
            <PopoverContent className="w-full">
              <WaInboxChatFilter setFilterCount={setFilterCount} />
            </PopoverContent>
          </Popover>
          <Popover>
            <CustomTooltip
              trigger={
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                    <Download className="w-3.5 h-3.5" />
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
                variant="outline"
                size="sm"
                onClick={() => refetchFilteredContacts()}
              >
                <RefreshCcw
                  className={`w-3 h-3 ${isRefetchingFilteredContacts ? "animate-spin" : ""}`}
                />
              </Button>
            }
            content={<span>{translations("Refresh")}</span>}
          />
        </div>
        <div className="flex items-center text-xs">
          <CustomTooltip
            trigger={
              <SortMenu
                data={sortData}
                value={filter?.sortBy}
                onChange={(value) => setFilter({ ...filter, sortBy: value })}
                defaultValue="newest"
              />
            }
            content={<span>{translations("Sort")}</span>}
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
}: {
  data: { items: { label: string; value: string }[]; groupName: string }[];
  value: string;
  onChange: (value) => void;
  defaultValue: string;
  customSelectTrigger?: React.ReactNode;
}) => {
  return (
    <Select onValueChange={onChange} value={value} defaultValue={defaultValue}>
      <SelectTrigger>
        {customSelectTrigger ?? <Clock className="w-3 h-3 mr-1" />}
      </SelectTrigger>
      <SelectContent>
        {data.map((g, index) => (
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
