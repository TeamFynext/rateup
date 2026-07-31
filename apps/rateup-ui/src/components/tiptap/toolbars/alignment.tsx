"use client";

import {
  IconAlignCenter,
  IconAlignJustified,
  IconAlignLeft,
  IconAlignRight,
  IconCheck,
  IconChevronDown,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useMediaQuery } from "@/hooks/use-media-querry";

import { MobileToolbarGroup, MobileToolbarItem } from "./mobile-toolbar-group";
import { useToolbar } from "./toolbar-provider";

export const AlignmentTooolbar = () => {
  const { editor } = useToolbar();
  const isMobile = useMediaQuery("(max-width: 640px)");
  const handleAlign = (value: string) => {
    editor?.chain().focus().setTextAlign(value).run();
  };

  const isDisabled = !editor || editor.isActive("image") || editor.isActive("video");

  const currentTextAlign = () => {
    if (editor?.isActive({ textAlign: "left" })) {
      return "left";
    }
    if (editor?.isActive({ textAlign: "center" })) {
      return "center";
    }
    if (editor?.isActive({ textAlign: "right" })) {
      return "right";
    }
    if (editor?.isActive({ textAlign: "justify" })) {
      return "justify";
    }

    return "left";
  };

  const alignmentOptions = [
    {
      name: "Left Align",
      value: "left",
      icon: <IconAlignLeft className="h-4 w-4" />,
    },
    {
      name: "Center Align",
      value: "center",
      icon: <IconAlignCenter className="h-4 w-4" />,
    },
    {
      name: "Right Align",
      value: "right",
      icon: <IconAlignRight className="h-4 w-4" />,
    },
    {
      name: "Justify Align",
      value: "justify",
      icon: <IconAlignJustified className="h-4 w-4" />,
    },
  ];

  const findIndex = (value: string) => {
    return alignmentOptions.findIndex((option) => option.value === value);
  };

  if (isMobile) {
    return (
      <MobileToolbarGroup
        label={alignmentOptions[findIndex(currentTextAlign())]?.name ?? "Left Align"}
      >
        {alignmentOptions.map((option, index) => (
          <MobileToolbarItem
            key={index}
            onClick={() => handleAlign(option.value)}
            active={currentTextAlign() === option.value}
          >
            <span className="mr-2">{option.icon}</span>
            {option.name}
          </MobileToolbarItem>
        ))}
      </MobileToolbarGroup>
    );
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              disabled={isDisabled}
              render={<Button variant="ghost" size="sm" className="h-8 w-max font-normal" />}
            />
          }
        >
          <span className="mr-2">{alignmentOptions[findIndex(currentTextAlign())]?.icon}</span>
          {alignmentOptions[findIndex(currentTextAlign())]?.name}
          <IconChevronDown className="ml-2 h-4 w-4" />
        </TooltipTrigger>
        <TooltipContent>Text Alignment</TooltipContent>
      </Tooltip>
      <DropdownMenuContent>
        <DropdownMenuGroup className=" w-40">
          {alignmentOptions.map((option, index) => (
            <DropdownMenuItem
              onSelect={() => {
                handleAlign(option.value);
              }}
              key={index}
            >
              <span className="mr-2">{option.icon}</span>
              {option.name}

              {option.value === currentTextAlign() && <IconCheck className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
