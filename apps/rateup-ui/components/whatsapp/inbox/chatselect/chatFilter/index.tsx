import {
  HoverCard,
  HoverCardDropdown,
  HoverCardTarget,
  Loader,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { IconFilter } from "@tabler/icons-react";
import classes from "./styles.module.css";
import { useContactGroup } from "../../../../../backend/campaign/contactGroup/contactGroup.query";
import { useGetContactTags } from "../../../../../backend/whatsapp/settings/waSettings.query";
import { ContainedMultiSelect } from "../../../../input/ContainedInput/ContainedInput";
import { ContactsWithLastMessage } from "../../../../../backend/whatsapp/inbox/message/wamessage.api";

export type ChatFilter = {
  strict: boolean;
  general: "all" | "replied" | "unread" | "usermessages";
  multiselect: { group: string; value: string }[];
};
interface Props {
  filter: ChatFilter;
  setFilter: (filter: ChatFilter) => void;
  contacts: ContactsWithLastMessage[];
}

export default function WaInboxChatFilter(props: Props) {
  const {
    data: Ctags,
    isLoading: CtagsLoading,
    error: CtagError,
  } = useGetContactTags();
  const {
    data: Cgroups,
    isLoading: CgroupsLoading,
    error: CgroupsError,
  } = useContactGroup();

  if (CgroupsLoading || CtagsLoading) {
    return <Loader size={"xs"} />;
  }
  if (CgroupsError || CtagError) {
    return (
      <Text size="xs" c={"red"}>
        Failed to fetch filter data
      </Text>
    );
  }
  function generateTagsDataBasedOnContacts(
    contacts: ContactsWithLastMessage[],
  ): {
    group: string;
    items: { label: string; value: string }[];
  }[] {
    let CtagsNames = Ctags?.contactTags?.map((tag) => tag);
    return CtagsNames?.map((tag) => {
      let items = Array.from(
        new Set(
          contacts
            .filter((contact) => contact?.tags && contact.tags[tag])
            .map((contact) => contact.tags[tag]),
        ),
      );
      return {
        group: tag,
        items: items.map((item) => ({ label: item, value: `${tag}|-${item}` })),
      };
    });
  }

  function setFilters(type: "general" | "multiselect" | "strict", value: any) {
    props.setFilter({ ...props.filter, [type]: value });
  }
  return (
    <HoverCard position="right-start">
      <HoverCardTarget>
        <ThemeIcon className={classes.theme_icon} variant="light">
          <IconFilter />
        </ThemeIcon>
      </HoverCardTarget>
      <HoverCardDropdown>
        <Stack>
          <SegmentedControl
            value={props.filter.general}
            onChange={(value) => setFilters("general", value)}
            data={[
              { value: "all", label: "All" },
              { value: "usermessages", label: "User Messages" },
            ]}
            color={"var(--mantine-primary-color-6)"}
            radius={"md"}
          />
          <ContainedMultiSelect
            maw={250}
            label={
              <Switch
                w={"100%"}
                size="xs"
                label={`${props?.filter?.strict ? "Disable" : "Enable"} Strict filter`}
                checked={props.filter.strict}
                onChange={(e) => setFilters("strict", e.currentTarget.checked)}
              />
            }
            placeholder="Tags, Groups"
            data={[
              ...[
                {
                  group: "Groups",
                  items: Cgroups?.map((group) => ({
                    label: group.name,
                    value: `groups|-${group.name}`,
                  })),
                },
              ],
              ...generateTagsDataBasedOnContacts(props.contacts),
            ]}
            defaultValue={props.filter.multiselect.map(
              (val) => `${val.group}|-${val.value}`,
            )}
            onChange={(value) => {
              setFilters(
                "multiselect",
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
