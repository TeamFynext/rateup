import { IconDots } from "@tabler/icons-react";
import { Trash2 } from "lucide-react";
import type { MouseEvent } from "react";

import { ActionCard } from "@/components/common/action-card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import type { Rule } from "@/types/rule.ts";

interface RuleCardProps {
  item: Rule;
  onToggleActive: (e) => void;
  onDelete: (e) => void;
}

export function RuleCard({ item, onToggleActive, onDelete }: Readonly<RuleCardProps>) {
  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <IconDots size={20} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <DropdownMenuItem
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDelete(event);
          }}
          className="text-red-600 focus:text-red-600"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <ActionCard
      title={item.name}
      titleTooltip={item.name}
      subtitle={item.triggerEvent}
      actions={menu}
      content={
        <div className="flex items-center justify-between">
          <Badge
            variant="secondary"
            className={
              item.platform === "WHATSAPP"
                ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200"
                : item.platform === "INSTAGRAM"
                  ? "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-200"
                  : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200"
            }
          >
            {item.platform}
          </Badge>
          <Switch
            checked={item.isActive}
            onClick={(event: MouseEvent<HTMLButtonElement>) => {
              event.preventDefault();
              event.stopPropagation();
              onToggleActive(!item.isActive);
            }}
          />
        </div>
      }
      footerLeft={
        <Badge
          variant="secondary"
          className={
            item.isActive
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
          }
        >
          {item.isActive ? "Active" : "Inactive"}
        </Badge>
      }
      createdAt={item.createdAt}
    />
  );
}
