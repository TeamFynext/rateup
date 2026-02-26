"use client";

import { MouseEvent } from "react";

import { IconDots } from "@tabler/icons-react";
import { Calendar, Trash2 } from "lucide-react";

import { Rule } from "@/types/rule";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
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

  return (
    <Card className="cursor-pointer hover:border-primary">
      <CardContent className="flex flex-col justify-between h-full gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-lg  truncate" title={item.name}>
                {item.name}
              </h3>
              <p className="text-xs text-muted-foreground">
                {item.triggerEvent}
              </p>
            </div>
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
          </div>

          <div className="flex justify-between">
            <p className="font-semibold text-sm text-muted-foreground mt-2">
              {conditionCount} conditions, {actionCount} actions
            </p>
            <Switch
              checked={item.isActive}
              // onCheckedChange={(checked) => {
              //   onToggleActive(checked);
              // }}
              onClick={(event: MouseEvent<HTMLButtonElement>) => {
                event.preventDefault();
                event.stopPropagation();
                onToggleActive(!item.isActive);
              }}
            />
          </div>
        </div>

        <div>
          <Separator className="mb-3" />
          <div className="flex justify-between items-center">
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

            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar size={18} />
              <span className="text-sm">
                {new Date(item.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
