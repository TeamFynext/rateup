import { ActionIcon, Box, Divider, Group, Tooltip } from "@mantine/core";
import {
  IconArrowBackUp,
  IconBold,
  IconCode,
  IconItalic,
  IconPlus,
  IconStrikethrough,
} from "@tabler/icons-react";
import type { EmojiClickData } from "emoji-picker-react";
import { Smile } from "lucide-react";
import React, { lazy, Suspense, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import CustomTooltip from "@/components/ui/custom/CustomTooltip.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";

const EmojiPicker = lazy(() => import("emoji-picker-react"));

export const TextFormateToolBar = ({
  insertValue,
  applyFormatting,
  undo,
  dynamicVariables,
}: {
  insertValue: (value) => void;
  applyFormatting: (value: string) => void;
  undo: () => void;
  dynamicVariables: any[];
}) => {
  const [variableCount, setVariableCount] = useState(1);
  const { t: translations } = useTranslation();
  useEffect(() => {
    if (dynamicVariables?.length) {
      setVariableCount(dynamicVariables?.length + 1);
    }
  }, [dynamicVariables]);
  return (
    <Box>
      <Group
        p={"xs"}
        mb={-11}
        style={{
          border: "1px solid var(--mantine-color-gray-4)",
          borderRadius: "12px 12px 0px 0px",
        }}
        gap={4}
      >
        <PopoverEmojiPicker onEmojiClick={insertValue} />
        <Divider size="sm" orientation="vertical" />
        <Tooltip label={translations("Bold")}>
          <ActionIcon variant={"transparent"} size={"xs"} onClick={() => applyFormatting("*")}>
            <IconBold color="var(--grey-color)" size={14} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={translations("Italic")}>
          <ActionIcon variant={"transparent"} size={"xs"} onClick={() => applyFormatting("_")}>
            <IconItalic color="var(--grey-color)" size={14} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={translations("StikeThough")}>
          <ActionIcon variant={"transparent"} size={"xs"} onClick={() => applyFormatting("~")}>
            <IconStrikethrough color="var(--grey-color)" size={14} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={translations("Monospace")}>
          <ActionIcon variant={"transparent"} size={"xs"} onClick={() => applyFormatting("```")}>
            <IconCode color="var(--grey-color)" size={14} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={translations("Add Variable")}>
          <ActionIcon
            variant={"transparent"}
            size={"xs"}
            onClick={() => {
              applyFormatting(`{{${variableCount}}}`);
              setVariableCount((count) => count + 1);
            }}
          >
            <IconPlus color="var(--grey-color)" size={14} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={translations("Undo the last text formating")}>
          <ActionIcon variant={"transparent"} size={"xs"} onClick={undo}>
            <IconArrowBackUp color="var(--grey-color)" size={14} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Box>
  );
};

export const PopoverEmojiPicker = ({
  onEmojiClick,
  showIcon,
}: {
  onEmojiClick: (emoji: string, emojiData?: EmojiClickData) => void;
  showIcon?: React.ReactNode;
}) => {
  const { t: translations } = useTranslation();
  return (
    <Popover>
      <CustomTooltip
        trigger={
          <PopoverTrigger
            nativeButton={false}
            render={
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted cursor-pointer" />
            }
          >
            {showIcon ?? <Smile className="w-5 h-5" />}
          </PopoverTrigger>
        }
        content={<span>{translations("Insert an emoji")}</span>}
      />
      <PopoverContent className="w-full">
        <Suspense
          fallback={
            <div
              style={{
                width: "200px",
                height: "200px",
              }}
            >
              Loading...
            </div>
          }
        >
          <EmojiPicker onEmojiClick={(emoji) => onEmojiClick(emoji.emoji, emoji)} />
        </Suspense>
      </PopoverContent>
    </Popover>
  );
};
