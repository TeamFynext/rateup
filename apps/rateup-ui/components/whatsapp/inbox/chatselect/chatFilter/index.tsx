"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { Loader, Stack, Text } from "@mantine/core";
import {
  CheckCircle,
  ClipboardList,
  Filter,
  Layers,
  RotateCcw,
  Tag,
  User,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { WaMessageAssignStatus, WaMessageAssignStatusTab } from "@/types/enums";
import { useTeamsByUser } from "@/backend/team/team.query";
import { AccountSelector } from "@/components/input/AccountSelector";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { WaMessageClosedStatus } from "@/utils/constants";

import { useChatFilterData } from "../../../../../backend/whatsapp/inbox/message/wamessage.query";
import {
  ContainedMultiSelect,
  ContainedSelection,
} from "../../../../input/ContainedInput/ContainedInput";

export type MultiGV = {
  group: string;
  value: string;
};
export type ChatFilter = {
  messageType: "all" | "replied" | "unread" | "usermessages";
  strictFilter: boolean;
  searchTerm?: string;
  contactGroups: Array<MultiGV>;
  campaigns: Array<MultiGV>;
  tags: Array<MultiGV>;
  waMessageAssignStatus?: string;
  blockedUsers: boolean;
  status: string[];
  assignedTeams: string[];
  phone?: string;
  labels: string[];
  sortBy: "newest" | "oldest";
  category: "conversation" | "campaign" | "automation";
  lifecycle?: string;
  assignedUserIds: string[];
};
interface Props {
  setFilterCount: (value: number) => void;
}

export default function WaInboxChatFilter({ setFilterCount }: Props) {
  const { data, isLoading, error } = useChatFilterData();

  const { filter, setFilter, clearFilter } = useChatFilterStore();

  const translations = useTranslations();
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as string) ?? "New";
  const { data: teamRes, isLoading: teamsLoading } = useTeamsByUser();

  useEffect(() => {
    setFilterCount(getFilterActiveCount());
  }, [filter]);
  if (isLoading || teamsLoading) {
    return <Loader size={"xs"} />;
  }
  if (error) {
    return (
      <Text size="xs" c={"red"}>
        {translations("Failed to fetch filter data")}
      </Text>
    );
  }
  const allMultiSelectFilters = [
    ...filter?.contactGroups,
    ...filter?.campaigns,
    ...filter?.tags,
  ];

  const teamOptions = teamRes
    ? teamRes.data?.map((team) => ({
        value: team?.id,
        label: team?.name,
      }))
    : [];

  function multiSelectOnChange(cf: ChatFilter, value: Array<MultiGV>) {
    const current_filter = { contactGroups: [], campaigns: [], tags: [] };
    if (value.length === 0) {
      setFilter({ ...cf, contactGroups: [], campaigns: [], tags: [] });
    } else {
      const fcgs = value?.filter((v) => v.group === "contactGroups");
      const fcs = value?.filter((v) => v.group === "campaigns");
      const fts = value?.filter(
        (v) => v.group !== "contactGroups" && v.group !== "campaigns",
      );
      if (fcgs.length > 0) {
        current_filter.contactGroups = fcgs;
      }
      if (fcs.length > 0) {
        current_filter.campaigns = fcs;
      }
      if (fts.length > 0) {
        current_filter.tags = fts;
      }
      setFilter({
        ...cf,
        contactGroups: current_filter.contactGroups,
        campaigns: current_filter.campaigns,
        tags: current_filter.tags,
      });
    }
  }
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
    if (tab === "All" && filter.status?.length) {
      count += filter.status.length;
    }
    if (["Assigned", "AssignedToMe"].includes(tab) && filter.assignedTeams) {
      count += filter.assignedTeams.length;
    }
    return count;
  }

  const statusData = Object.values(WaMessageAssignStatus)
    .filter(
      (status) =>
        status !== WaMessageAssignStatus.NEW &&
        (tab === "Addressed" ? WaMessageClosedStatus.includes(status) : true),
    )
    .map((status) => ({
      id: status,
      label: WaMessageAssignStatusTab[status],
    }));

  return (
    <div className="flex flex-col gap-4">
      {/* header */}
      <div className="flex items-center justify-between bg-primary p-3 rounded-md">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 rounded-full p-2 flex items-center justify-center">
            <Filter className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-white text-sm">
            {translations("Filters")}
          </span>
        </div>

        <Button
          onClick={() => clearFilter()}
          variant="outline"
          className="ml-auto !text-xs text-muted-foreground h-7 px-2 hover:text-blue-500 flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>{translations("Reset")}</span>
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {/* Account */}
        <div>
          <label
            htmlFor="accountselector"
            className="flex items-center gap-2 text-sm font-medium text-gray-700"
          >
            <div className="bg-gray-100 text-gray-700 p-2 rounded-md">
              <User className="w-4 h-4" />
            </div>
            <div className="leading-tight">{translations("Account")}</div>
          </label>

          <div className="mt-2">
            <AccountSelector
              onChange={(phone) => {
                // updatePhoneId(phoneId);
                setFilter({
                  ...filter,
                  phone,
                });
              }}
              value={filter?.phone}
              flex={1}
              usePhoneNumber
              withAllOption
              styles={{
                input: {
                  background: "var(--mantine-primary-color-filled)",
                  color: "white",
                  width: "100%",
                },
              }}
              platform="all"
            />
          </div>
        </div>

        {/* Tags, Groups, Campaigns */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <div className="bg-gray-100 text-gray-700 p-2 rounded-md">
              <Tag className="w-4 h-4" />
            </div>
            <div className="leading-tight">
              {translations("Tags, Groups, Campaigns")}
            </div>
          </label>

          <div className="mt-2">
            <ContainedMultiSelect
              maw={250}
              //TODO reimplement strict filter

              // label={
              //   <Switch
              //     w={"100%"}
              //     size="xs"
              //     label={`${props?.filter?.strictFilter ? "Disable" : "Enable"} Strict filter`}
              //     checked={props.filter.strictFilter}
              //     onChange={(e) =>
              //       setFilters("strictFilter", e.currentTarget.checked)
              //     }
              //   />
              // }
              placeholder={translations("Tags, Groups, Campaigns")}
              data={data}
              value={allMultiSelectFilters?.map(
                (val) => `${val.group}|-${val.value}`,
              )}
              onChange={(value) => {
                multiSelectOnChange(
                  filter,
                  value.map((val) => {
                    const grpname = val.split("|-")[0];
                    const grpval = val.split("|-")[1];
                    return {
                      group: grpname,
                      value: grpval,
                    };
                  }),
                );
              }}
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <div className="bg-gray-100 text-gray-700 p-2 rounded-md">
              <Layers className="w-4 h-4" />
            </div>
            <div className="leading-tight">{translations("Category")}</div>
          </label>

          <div className="mt-2">
            <ContainedSelection
              radius="md"
              maw={250}
              value={filter.category}
              onChange={(value: any) =>
                setFilter({
                  ...filter,
                  category: filter.category === value ? null : value,
                })
              }
              placeholder={translations("Select category (type in to search)")}
              data={[
                { value: "conversation", label: "Conversations" },
                { value: "campaign", label: "Campaigns" },
                { value: "automation", label: "Automation" },
              ]}
              searchable
            />
          </div>
        </div>

        {/* Status (only on All tab) */}
        {(tab === "All" || tab === "Addressed") && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="bg-gray-100 text-gray-700 p-2 rounded-md">
                <CheckCircle className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {translations("Status")}
              </span>
            </div>

            <div className="mt-1 space-y-2">
              {statusData.map((status) => (
                <div key={status.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={status.id}
                    checked={filter.status?.includes(status.id)}
                    onCheckedChange={(checked) =>
                      setFilter({
                        ...filter,
                        status: checked
                          ? Array.from(
                              new Set([...(filter.status || []), status.id]),
                            )
                          : filter.status?.filter((s) => s !== status.id),
                      })
                    }
                  />
                  <label
                    htmlFor={status.id}
                    className="text-xs font-light text-muted-foreground cursor-pointer select-none"
                  >
                    {status.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assigned / mine */}
        {["Assigned", "mine"].includes(tab) && (
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <div className="bg-gray-100 text-gray-700 p-2 rounded-md">
                <ClipboardList className="w-4 h-4" />
              </div>
              <div className="leading-tight">
                {translations("Assigned Teams")}
              </div>
            </label>

            <div className="mt-2">
              <ContainedMultiSelect
                radius="md"
                value={filter.assignedTeams || []}
                onChange={(values) =>
                  setFilter({
                    ...filter,
                    assignedTeams: values,
                  })
                }
                placeholder={translations("Select teams (type in to search)")}
                data={teamOptions}
                searchable
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type ChatFilterStore = {
  filter: ChatFilter;
  setFilter: (value: ChatFilter) => void;
  clearFilter: () => void;
};

const intialValues: ChatFilter = {
  messageType: "usermessages",
  strictFilter: false,
  searchTerm: "",
  contactGroups: [],
  campaigns: [],
  tags: [],
  waMessageAssignStatus: null,
  blockedUsers: false,
  status: Object.values(WaMessageAssignStatus).filter(
    (st) => st !== WaMessageAssignStatus.NEW,
  ),
  assignedTeams: [],
  phone: "all",
  labels: [],
  lifecycle: "",
  sortBy: "newest",
  category: null,
  assignedUserIds: [],
};
export const useChatFilterStore = create<ChatFilterStore>()(
  persist(
    (set) => ({
      filter: intialValues,
      setFilter: (value) => set({ filter: value }),
      clearFilter: () => {
        set({
          filter: intialValues,
        });
      },
    }),
    {
      name: "chat-filter-storage", // name of the item in the storage (must be unique)
    },
  ),
);
