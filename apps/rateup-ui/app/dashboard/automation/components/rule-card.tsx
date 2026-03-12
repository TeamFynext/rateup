"use client";

import { MouseEvent } from "react";

import { IconDots } from "@tabler/icons-react";
import { Trash2 } from "lucide-react";

import { Rule } from "@/types/rule";
import { GenericActionCard } from "@/components/common/generic-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";

interface RuleCardProps {
  item: Rule;
  onToggleActive: (e) => void;
  onDelete: (e) => void;
}

export function RuleCard({
  item,
  onToggleActive,
  onDelete,
}: Readonly<RuleCardProps>) {
  const conditionCount = item.groups[0]?.conditions?.length || 0;
  const actionCount = item.actions?.length || 0;

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
    <GenericActionCard
      title={item.name}
      titleTooltip={item.name}
      subtitle={item.triggerEvent}
      actions={menu}
      content={
        <div className="flex items-center justify-between">
          <p className="mt-2 text-sm font-semibold text-muted-foreground">
            {conditionCount} conditions, {actionCount} actions
          </p>
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
