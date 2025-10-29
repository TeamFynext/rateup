import React, { useState } from "react";

import {
  ChevronDown,
  Clock,
  Download,
  Filter,
  MessageSquare,
  RefreshCcw,
  Search,
  UserPlus,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import CustomTooltip from "@/components/ui/custom/CustomTooltip";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { AddUnknownContactForm } from "./addUnknownContactModal";
import WaInboxChatExport from "./chatExport";
import WaInboxChatFilter, { useChatFilterStore } from "./chatFilter";

const ChatselectPanelHeader = ({
  isRefetchingFilteredContacts,
  refetchFilteredContacts,
  onUnknownContactAddSuccess,
}) => {
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [filterCount, setFilterCount] = useState(0);
  const sortData = [
    { label: "Newest First", value: "newest" },
    { label: "Oldest First", value: "oldest" },
  ];
  const { filter, setFilter } = useChatFilterStore();
  return (
    <div className="p-3 border-b space-y-3 flex-shrink-0 relative">
      {showSearchBar && (
        <div className="absolute inset-0 bg-card z-50 flex items-center px-3 animate-in fade-in duration-200">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search contact..."
              className="pl-8 pr-8 h-8 text-xs w-full"
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
        <div className="flex items-center">
          <MessageSquare className="w-4 h-4 mr-1" />
          Chats
        </div>
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger>
              <CustomTooltip
                trigger={
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                    <UserPlus className="w-3.5 h-3.5" />
                  </Button>
                }
                content={<p>New Contact</p>}
                side="bottom"
              />
            </DialogTrigger>
            <DialogContent>
              <p>Add Contact</p>
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
            <PopoverTrigger>
              <CustomTooltip
                trigger={
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                    <Filter className="w-3.5 h-3.5" />
                  </Button>
                }
                content={<p>Advanced Filters</p>}
                side="bottom"
              />
            </PopoverTrigger>
            <PopoverContent className="w-full">
              <WaInboxChatFilter setFilterCount={setFilterCount} />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger>
              <CustomTooltip
                trigger={
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                }
                content={<p>Download Chats</p>}
                side="bottom"
              />
            </PopoverTrigger>
            <PopoverContent className="w-full">
              <WaInboxChatExport />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div className="flex items-center text-xs">
        <Button
          variant="secondary"
          size="sm"
          className="text-muted-foreground"
          onClick={() => refetchFilteredContacts()}
        >
          <RefreshCcw
            className={`w-3 h-3 ${isRefetchingFilteredContacts ? "animate-spin" : ""}`}
          />
          {isRefetchingFilteredContacts ? "Loading..." : "Reload"}
        </Button>
        <div className="ml-auto">
          <SortMenu
            data={sortData}
            value={filter?.sortBy}
            onChange={(value) => setFilter({ ...filter, sortBy: value })}
            defaultValue="newest"
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
}: {
  data: { label: string; value: string }[];
  value: string;
  onChange: (value) => void;
  defaultValue: string;
}) => {
  const selected = data?.find((item) => item?.value === value);
  const defaultItem = data?.find((item) => item?.value === defaultValue);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground"
        >
          <Clock className="w-3 h-3 mr-1" />
          {selected?.label || defaultItem?.label || "Select"}
          <ChevronDown className="w-3 h-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {data?.map((item) => (
          <DropdownMenuItem
            onClick={(e) => {
              e.preventDefault();
              onChange(item?.value);
            }}
            key={item?.value}
          >
            {item?.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ChatselectPanelHeader;
