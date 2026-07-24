import { useSearch } from "@tanstack/react-router";
import { CheckCircle, Filter, RotateCcw } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { useTeamsByUser } from "@/backend/team/team.query";
import { AccountSelector } from "@/components/input/AccountSelector.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { WaMessageAssignStatus, WaMessageAssignStatusTab } from "@/types/enums.ts";

import { MultiSelect } from "../../../../ui/multi-select.tsx";

export interface ChatFilter {
  messageType: "all" | "replied" | "unread" | "usermessages";
  strictFilter: boolean;
  searchTerm?: string;
  waMessageAssignStatus?: string;
  blockedUsers: boolean;
  status: string[];
  assignedTeams: string[];
  phone?: string;
  labels: string[];
  sortBy: "newest" | "oldest" | "newest_wa_created" | "oldest_wa_created";
  lifecycle?: string;
  assignedUserIds: string[];
  /**
   * Inbox Tickets v2 — orthogonal booleans, not tab values. They AND with
   * whatever status filter is active. Spelled "favorite" here to match the API
   * param and the DB column; the *count* key is British ("favourite").
   */
  favorite?: boolean;
  mentions?: boolean;
  /**
   * Spam tab. Contact-grained, unlike everything else here: it lists one row per
   * spam contact and ANDs with nothing — the status filters are ticket-level.
   */
  spam?: boolean;
}

export default function WaInboxChatFilter() {
  const uid = useId();
  const { filter, setFilter, clearFilter, setPreviousFilterForTab, previousFilterForTab } =
    useChatFilterStore();

  const { t: translations } = useTranslation();
  const searchParams = useSearch({ strict: false });
  const tab = (searchParams.tab as string) ?? "all";
  const { data: teamRes, isLoading: teamsLoading } = useTeamsByUser();

  const teamOptions = teamRes
    ? teamRes.data?.map((team) => ({
        value: team?.id,
        label: team?.name,
      }))
    : [];

  let statusData: { id: string; label: string }[] = [];
  if (tab === "open") {
    statusData = [
      {
        id: WaMessageAssignStatus.ASSIGNED,
        label: WaMessageAssignStatusTab[WaMessageAssignStatus.ASSIGNED],
      },
      {
        id: WaMessageAssignStatus.UNASSIGNED,
        label: WaMessageAssignStatusTab[WaMessageAssignStatus.UNASSIGNED],
      },
    ];
  } else if (tab === "closed") {
    statusData = [
      {
        id: WaMessageAssignStatus.CLOSED,
        label: WaMessageAssignStatusTab[WaMessageAssignStatus.CLOSED],
      },
      {
        id: WaMessageAssignStatus.RESOLVED,
        label: WaMessageAssignStatusTab[WaMessageAssignStatus.RESOLVED],
      },
      {
        id: WaMessageAssignStatus.UNRESOLVED,
        label: WaMessageAssignStatusTab[WaMessageAssignStatus.UNRESOLVED],
      },
      // No SPAM entry: spam is a contact flag with its own tab, not a ticket status.
    ];
  } else {
    // tab === "all"
    statusData = [
      {
        id: WaMessageAssignStatus.ASSIGNED,
        label: WaMessageAssignStatusTab[WaMessageAssignStatus.ASSIGNED],
      },
      {
        id: WaMessageAssignStatus.UNASSIGNED,
        label: WaMessageAssignStatusTab[WaMessageAssignStatus.UNASSIGNED],
      },
      {
        id: WaMessageAssignStatus.CLOSED,
        label: WaMessageAssignStatusTab[WaMessageAssignStatus.CLOSED],
      },
      {
        id: WaMessageAssignStatus.RESOLVED,
        label: WaMessageAssignStatusTab[WaMessageAssignStatus.RESOLVED],
      },
      {
        id: WaMessageAssignStatus.UNRESOLVED,
        label: WaMessageAssignStatusTab[WaMessageAssignStatus.UNRESOLVED],
      },
      // No SPAM entry: spam is a contact flag with its own tab, not a ticket status.
    ];
  }

  if (teamsLoading) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* header */}
      <div className="flex items-center justify-between bg-primary p-3 rounded-md gap-10">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 rounded-full p-2 flex items-center justify-center">
            <Filter className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-white text-sm">{translations("Filters")}</span>
        </div>

        <Button
          onClick={() => clearFilter()}
          variant="outline"
          className="ml-auto !text-[11px] text-muted-foreground h-6 px-2 hover:text-blue-500 flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          <span>{translations("Reset")}</span>
        </Button>
      </div>
      <div className="flex flex-col gap-3">
        {/* Channel / Phone */}
        <div>
          <FieldLabel
            htmlFor="accountselector"
            className="flex items-center gap-2 text-sm font-medium text-gray-700"
          >
            <div className="leading-tight">{translations("Channel")}</div>
          </FieldLabel>

          <div className="mt-2">
            <AccountSelector
              onChange={(phone) => {
                setFilter({
                  ...filter,
                  phone,
                });
              }}
              value={filter?.phone}
              usePhoneNumber
              withAllOption
              optional
              showClearButton={false}
              platform="all"
              className={"w-full border-0 bg-gray-100"}
            />
          </div>
        </div>

        {/* Status (on all/closed/open tabs) */}
        {(tab === "all" || tab === "closed" || tab === "open") && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="bg-gray-100 text-gray-700 p-2 rounded-md">
                <CheckCircle className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {translations("Status")}
              </span>
            </div>

            <Field className="mt-1">
              {statusData.map((status) => {
                const isChecked = filter.status?.includes(status.id);

                return (
                  <Field key={status.id} orientation="horizontal" className="gap-2">
                    <Checkbox
                      id={status.id}
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        const newStatusList = checked
                          ? Array.from(new Set([...(filter.status || []), status.id]))
                          : filter.status?.filter((s) => s !== status.id) || [];

                        const newFilter = {
                          ...filter,
                          status: newStatusList,
                        };
                        setFilter({
                          ...newFilter,
                        });
                        const index = previousFilterForTab.findIndex((p) => p.tab === tab);

                        let updated;

                        if (index !== -1) {
                          updated = previousFilterForTab.map((p, i) =>
                            i === index ? { ...p, filter: newFilter } : p,
                          );
                        } else {
                          updated = [...previousFilterForTab, { tab, filter: newFilter }];
                        }

                        setPreviousFilterForTab(updated);
                      }}
                    />
                    <FieldLabel
                      htmlFor={status.id}
                      className="text-xs font-light text-muted-foreground cursor-pointer select-none"
                    >
                      {status.label}
                    </FieldLabel>
                  </Field>
                );
              })}
            </Field>
          </div>
        )}

        {/* Assigned Teams (open tab only) */}
        {tab === "open" && (
          <div>
            <FieldLabel
              htmlFor={`${uid}-field`}
              className="flex items-center gap-2 text-sm font-medium text-gray-700"
            >
              <div className="leading-tight">{translations("Assigned Teams")}</div>
            </FieldLabel>

            <div className="mt-2">
              <MultiSelect
                id={`${uid}-field`}
                value={filter.assignedTeams || []}
                onValueChange={(values) =>
                  setFilter({
                    ...filter,
                    assignedTeams: values,
                  })
                }
                placeholder={translations("Select teams (type in to search)")}
                options={teamOptions}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ChatFilterStore {
  filter: ChatFilter;
  setFilter: (value: ChatFilter) => void;
  clearFilter: () => void;
  previousFilterForTab: {
    tab: string;
    filter: ChatFilter;
  }[];
  setPreviousFilterForTab: (value) => void;
}

const intialValues: ChatFilter = {
  messageType: "usermessages",
  strictFilter: false,
  searchTerm: "",
  waMessageAssignStatus: null,
  blockedUsers: false,
  status: [],
  assignedTeams: [],
  phone: "",
  labels: [],
  lifecycle: "",
  sortBy: "newest",
  assignedUserIds: [],
};
export const useChatFilterStore = create<ChatFilterStore>()(
  persist(
    (set) => ({
      filter: intialValues,
      setFilter: (value) => set({ filter: value }),
      previousFilterForTab: [],
      setPreviousFilterForTab: (value) => set({ previousFilterForTab: value }),
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
