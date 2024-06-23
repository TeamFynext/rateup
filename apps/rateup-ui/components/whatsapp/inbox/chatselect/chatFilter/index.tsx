import {
  Button,
  HoverCard,
  HoverCardDropdown,
  HoverCardTarget,
  Indicator,
  Loader,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { IconFilter } from "@tabler/icons-react";
import classes from "./styles.module.css";
import { ContainedMultiSelect } from "../../../../input/ContainedInput/ContainedInput";
import { useChatFilterData } from "../../../../../backend/whatsapp/inbox/message/wamessage.query";

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
};
interface Props {
  filter: ChatFilter;
  setFilter: (filter: ChatFilter) => void;
}

export default function WaInboxChatFilter(props: Props) {
  const { data, isLoading, error } = useChatFilterData();
  if (isLoading) {
    return <Loader size={"xs"} />;
  }
  if (error) {
    return (
      <Text size="xs" c={"red"}>
        Failed to fetch filter data
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
    if (props.filter.messageType !== "all") {
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
      messageType: "all",
      strictFilter: false,
    });
  }
  return (
    <HoverCard position="right-start">
      <HoverCardTarget>
        <Indicator
          label={getFilterActiveCount()}
          size={"xl"}
          styles={{
            indicator: {
              borderRadius: "50%",
              width: 15,
              height: 15,
              fontSize: 10,
              zIndex: 0,
            },
          }}
        >
          <ThemeIcon className={classes.theme_icon} variant="light">
            <IconFilter />
          </ThemeIcon>
        </Indicator>
      </HoverCardTarget>
      <HoverCardDropdown>
        <Stack>
          <Button size="compact-xs" ml={"auto"} onClick={clearFilters}>
            clear filters
          </Button>
          <SegmentedControl
            value={props.filter.messageType}
            onChange={(value) => setFilters("messageType", value)}
            data={[
              { value: "all", label: "All" },
              { value: "usermessages", label: "User Messages" },
            ]}
            color={"var(--mantine-primary-color-6)"}
            radius={"md"}
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
