import { Group, Popover, ActionIcon, Divider, Tooltip } from "@mantine/core";
import {
  IconMoodHappy,
  IconBold,
  IconItalic,
  IconStrikethrough,
  IconCode,
  IconArrowBackUp,
} from "@tabler/icons-react";
import EmojiPicker from "emoji-picker-react";

export const TextFormateToolBar = ({
  insertValue,
  applyFormatting,
  undo,
}: {
  insertValue: (value) => void;
  applyFormatting: (value: string) => void;
  undo: () => void;
}) => {
  return (
    <Group
      p={"xs"}
      mb={-11}
      style={{
        border: "1px solid var(--mantine-color-gray-4)",
        borderRadius: "12px 12px 0px 0px",
      }}
      gap={4}
    >
      <Popover withArrow shadow="md">
        <Popover.Target>
          <Tooltip label="Insert an emoji">
            <ActionIcon variant={"transparent"} size={"xs"}>
              <IconMoodHappy color="var(--grey-color)" size={10} />
            </ActionIcon>
          </Tooltip>
        </Popover.Target>
        <Popover.Dropdown p={0}>
          <EmojiPicker onEmojiClick={(emoji) => insertValue(emoji.emoji)} />
        </Popover.Dropdown>
      </Popover>
      <Divider size="sm" orientation="vertical" />
      <Tooltip label="Bold">
        <ActionIcon
          variant={"transparent"}
          size={"xs"}
          onClick={() => applyFormatting("*")}
        >
          <IconBold color="var(--grey-color)" size={10} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="Italic">
        <ActionIcon
          variant={"transparent"}
          size={"xs"}
          onClick={() => applyFormatting("_")}
        >
          <IconItalic color="var(--grey-color)" size={10} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="StikeThough">
        <ActionIcon
          variant={"transparent"}
          size={"xs"}
          onClick={() => applyFormatting("~")}
        >
          <IconStrikethrough color="var(--grey-color)" size={10} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="Monospace">
        <ActionIcon
          variant={"transparent"}
          size={"xs"}
          onClick={() => applyFormatting("```")}
        >
          <IconCode color="var(--grey-color)" size={10} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="Undo the last text formating">
        <ActionIcon variant={"transparent"} size={"xs"} onClick={undo}>
          <IconArrowBackUp color="var(--grey-color)" size={10} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
};
