import { IconArrowDown, IconArrowUp, IconEyeOff, IconSelector } from "@tabler/icons-react";
import type { Column } from "@tanstack/react-table";

import { cn } from "@/lib/utils.ts";

import { Button } from "../ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu.tsx";

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>;
  title: string;
  className?: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="sm" className="data-[state=open]:bg-accent -ml-3 h-8" />
          }
        >
          <span>{title}</span>
          {column.getIsSorted() === "desc" ? (
            <IconArrowDown />
          ) : column.getIsSorted() === "asc" ? (
            <IconArrowUp />
          ) : (
            <IconSelector />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
            <IconArrowUp />
            Asc
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
            <IconArrowDown />
            Desc
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
            <IconEyeOff />
            Hide
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
