import {
  IconArrowBackUp,
  IconBold,
  IconCode,
  IconItalic,
  IconMoodSmile,
  IconPlus,
  IconStrikethrough,
} from "@tabler/icons-react";
import type { EmojiClickData } from "emoji-picker-react";
import React, { lazy, Suspense, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import CustomTooltip from "@/components/ui/custom/CustomTooltip.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { Separator } from "@/components/ui/separator.tsx";

const EmojiPicker = lazy(() => import("emoji-picker-react"));

export const TextFormateToolBar = ({
  insertValue,
  applyFormatting,
  undo,
  dynamicVariables,
}: {
  insertValue: (value: string) => void;
  applyFormatting: (value: string) => void;
  undo: () => void;
  dynamicVariables: unknown[];
}) => {
  const [variableCount, setVariableCount] = useState(1);
  const { t: translations } = useTranslation();
  useEffect(() => {
    if (dynamicVariables?.length) {
      setVariableCount(dynamicVariables?.length + 1);
    }
  }, [dynamicVariables]);
  const formatButtons = [
    {
      label: translations("Bold"),
      icon: <IconBold size={14} />,
      onClick: () => applyFormatting("*"),
    },
    {
      label: translations("Italic"),
      icon: <IconItalic size={14} />,
      onClick: () => applyFormatting("_"),
    },
    {
      label: translations("StikeThough"),
      icon: <IconStrikethrough size={14} />,
      onClick: () => applyFormatting("~"),
    },
    {
      label: translations("Monospace"),
      icon: <IconCode size={14} />,
      onClick: () => applyFormatting("```"),
    },
    {
      label: translations("Add Variable"),
      icon: <IconPlus size={14} />,
      onClick: () => {
        applyFormatting(`{{${variableCount}}}`);
        setVariableCount((count) => count + 1);
      },
    },
    {
      label: translations("Undo the last text formating"),
      icon: <IconArrowBackUp size={14} />,
      onClick: undo,
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-t-xl border border-b-0 border-border p-2">
      <PopoverEmojiPicker onEmojiClick={insertValue} />
      <Separator orientation="vertical" className="h-5" />
      {formatButtons.map((btn) => (
        <CustomTooltip
          key={btn.label}
          trigger={
            <Button
              aria-label={btn.label}
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground"
              onClick={btn.onClick}
            >
              {btn.icon}
            </Button>
          }
          content={<span>{btn.label}</span>}
        />
      ))}
    </div>
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
            {showIcon ?? <IconMoodSmile className="w-4 h-4" />}
          </PopoverTrigger>
        }
        content={<span>{translations("Insert an emoji")}</span>}
      />
      <PopoverContent className="w-full">
        <Suspense
          fallback={
            <div className="flex size-50 items-center justify-center text-sm text-muted-foreground">
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
