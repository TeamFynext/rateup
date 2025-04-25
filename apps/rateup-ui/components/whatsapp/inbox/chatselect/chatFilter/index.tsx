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
};
interface Props {
  filter: ChatFilter;
  setFilter: (filter: ChatFilter) => void;
  tag: string;
}

export default function WaInboxChatFilter(props: Props) {
  const { data, isLoading, error } = useChatFilterData();
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
    ...props?.filter?.contactGroups,
    ...props?.filter?.campaigns,
    ...props?.filter?.tags,
  ];

  function setFilters(
    type:
      | "messageType"
      | "strictFilter"
      | "contactGroups"
      | "campaigns"
      | "tags",
    value: any,
  ) {
    props.setFilter({ ...props.filter, [type]: value });
  }
  function multiSelectOnChange(cf: ChatFilter, value: Array<MultiGV>) {
    const current_filter = { contactGroups: [], campaigns: [], tags: [] };
    if (value.length === 0) {
      props.setFilter({ ...cf, contactGroups: [], campaigns: [], tags: [] });
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
      props.setFilter({
        ...cf,
        contactGroups: current_filter.contactGroups,
        campaigns: current_filter.campaigns,
        tags: current_filter.tags,
      });
    }
  }
  function getFilterActiveCount() {
    let count = 0;
    if (props.filter.contactGroups.length > 0) {
      count += props.filter.contactGroups.length;
    }
    if (props.filter.campaigns.length > 0) {
      count += props.filter.campaigns.length;
    }
    if (props.filter.tags.length > 0) {
      count += props.filter.tags.length;
    }
    if (props.filter.messageType !== "usermessages") {
      count += 1;
    }
    if (props.filter.strictFilter !== false) {
      count += 1;
    }
    return count;
  }
  function clearFilters() {
    props.setFilter({
      contactGroups: [],
      campaigns: [],
      tags: [],
      messageType: props?.tag === "All" ? "all" : "usermessages",
      strictFilter: false,
      searchTerm: "",
      blockedUsers: false,
    });
  }

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
                props.filter,
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
        </Stack>
      </HoverCardDropdown>
    </HoverCard>
  );
}
