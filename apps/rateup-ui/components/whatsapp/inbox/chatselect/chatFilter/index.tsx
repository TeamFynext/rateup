"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { Loader, Stack, Text } from "@mantine/core";
import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { WaMessageAssignStatus, WaMessageAssignStatusTab } from "@/types/enums";
import { useTeamsByUser } from "@/backend/team/team.query";
import { AccountSelector } from "@/components/input/AccountSelector";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

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
};
interface Props {
  setFilterCount: (value: number) => void;
}

export default function WaInboxChatFilter({ setFilterCount }: Props) {
  const { data, isLoading, error } = useChatFilterData();

  const { filter, setFilter } = useChatFilterStore();

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
  function clearFilters() {
    setFilter({
      ...filter,
      contactGroups: [],
      campaigns: [],
      tags: [],
      strictFilter: false,
      searchTerm: "",
      status: [
        WaMessageAssignStatus.UNASSIGNED,
        WaMessageAssignStatus.ASSIGNED,
        WaMessageAssignStatus.CLOSED,
      ],
      assignedTeams: [],
      labels: [],
      lifecycle: "",
      category: null,
    });
  }

  const statusData = [
    {
      id: WaMessageAssignStatus.UNASSIGNED,
      label: WaMessageAssignStatusTab[WaMessageAssignStatus.UNASSIGNED],
    },
    {
      id: WaMessageAssignStatus.ASSIGNED,
      label: WaMessageAssignStatusTab[WaMessageAssignStatus.ASSIGNED],
    },
    {
      id: WaMessageAssignStatus.CLOSED,
      label: WaMessageAssignStatusTab[WaMessageAssignStatus.CLOSED],
    },
  ];

  return (
    <Stack>
      <Button
        onClick={clearFilters}
        variant="secondary"
        className="ml-auto !text-xs text-muted-foreground h-5 p-1 hover:text-blue-500 cursor-pointer"
      >
        <RotateCcw className="w-1.5 h-1.5" />
        Reset
      </Button>
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
          },
        }}
        platform="all"
        label={translations("Account")}
      />
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
        placeholder="Tags, Groups, Campaigns"
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
          {
            value: "conversation",
            label: "Conversations",
          },
          { value: "campaign", label: "Campaigns" },
          { value: "automation", label: "Automation" },
        ]}
        searchable
      />
      {tab === "All" && (
        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground mb-2">
            {translations("Status")}
          </span>
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
              <Label
                htmlFor={status.id}
                className="text-xs font-light text-muted-foreground cursor-pointer select-none"
              >
                {status.label}
              </Label>
            </div>
          ))}
        </div>
      )}
      {["Assigned", "mine"].includes(tab) && (
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
      )}
    </Stack>
  );
}

type ChatFilterStore = {
  filter: ChatFilter;
  setFilter: (value: ChatFilter) => void;
};

export const useChatFilterStore = create<ChatFilterStore>()(
  persist(
    (set) => ({
      filter: {
        messageType: "usermessages",
        strictFilter: false,
        searchTerm: "",
        contactGroups: [],
        campaigns: [],
        tags: [],
        waMessageAssignStatus: null,
        blockedUsers: false,
        status: [
          WaMessageAssignStatus.UNASSIGNED,
          WaMessageAssignStatus.ASSIGNED,
          WaMessageAssignStatus.CLOSED,
        ],
        assignedTeams: [],
        phone: "all",
        labels: [],
        lifecycle: "",
        sortBy: "newest",
        category: null,
      },
      setFilter: (value) => set({ filter: value }),
    }),
    {
      name: "chat-filter-storage", // name of the item in the storage (must be unique)
    },
  ),
);
