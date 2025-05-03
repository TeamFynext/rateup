import {
  Button,
  HoverCard,
  HoverCardDropdown,
  HoverCardTarget,
  Indicator,
  Loader,
  SegmentedControl,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconFilter } from "@tabler/icons-react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { WaMessageAssignStatus, WaMessageAssignStatusTab } from "@/types/enums";
import useTranslations from "@/dictionaries/useTranslation";

import { useChatFilterData } from "../../../../../backend/whatsapp/inbox/message/wamessage.query";
import { ContainedMultiSelect } from "../../../../input/ContainedInput/ContainedInput";
import classes from "./styles.module.css";

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
  newStatuses: string[];
};
interface Props {
  tab: string;
}

export default function WaInboxChatFilter({ tab }: Props) {
  const { data, isLoading, error } = useChatFilterData();
  const { filter, setFilter } = useChatFilterStore();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { translations } = useTranslations();
  if (isLoading) {
    return <Loader size={"xs"} />;
  }
  if (error) {
    return (
      <Text size="xs" c={"red"}>
        {translations["Failed to fetch filter data"]}
      </Text>
    );
  }
  const allMultiSelectFilters = [
    ...filter?.contactGroups,
    ...filter?.campaigns,
    ...filter?.tags,
  ];

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
      newStatuses: [
        WaMessageAssignStatus.ASSIGNED,
        WaMessageAssignStatus.UNASSIGNED,
      ],
    });
  }

  const statusData = [
    WaMessageAssignStatus.ASSIGNED,
    WaMessageAssignStatus.UNASSIGNED,
    "ASSIGNEDTOME",
  ].map((status) => ({
    value: status,
    label: WaMessageAssignStatusTab[status],
  }));

  return (
    <HoverCard position={isMobile ? "bottom-end" : "right-start"}>
      <HoverCardTarget>
        <Indicator label={getFilterActiveCount()} size={16}>
          <ThemeIcon className={classes.theme_icon} variant="light">
            <IconFilter />
          </ThemeIcon>
        </Indicator>
      </HoverCardTarget>
      <HoverCardDropdown>
        <Stack>
          <Button size="compact-xs" ml={"auto"} onClick={clearFilters}>
            {translations["clear filters"]}
          </Button>
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
          <ContainedMultiSelect
            data={statusData}
            placeholder="statuses"
            w={220}
            value={filter.newStatuses}
            onChange={(values) =>
              setFilter({
                ...filter,
                newStatuses: values as WaMessageAssignStatus[],
              })
            }
          />
        </Stack>
      </HoverCardDropdown>
    </HoverCard>
  );
}

type ChatFilterStore = {
  filter: ChatFilter;
  setFilter: (value) => void;
};

export const useChatFilterStore = create<ChatFilterStore>()(
  persist(
    (set, get) => ({
      filter: {
        messageType: "usermessages",
        strictFilter: false,
        searchTerm: "",
        contactGroups: [],
        campaigns: [],
        tags: [],
        waMessageAssignStatus: "New",
        blockedUsers: false,
        newStatuses: [
          WaMessageAssignStatus.ASSIGNED,
          WaMessageAssignStatus.UNASSIGNED,
        ],
      },
      setFilter: (value) => set({ filter: value }),
    }),
    {
      name: "chat-filter-storage", // name of the item in the storage (must be unique)
    },
  ),
);
