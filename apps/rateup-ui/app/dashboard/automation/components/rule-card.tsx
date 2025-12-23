"use client";

import {
  Clock,
  GitBranch,
  Play,
  Settings,
  Tag,
  Trash2,
  Zap,
} from "lucide-react";

import { Rule } from "@/types/rule";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

interface RuleCardProps {
  item: Rule;
  viewMode: "grid" | "list";
  onToggleActive: (e) => void;
  onDelete: (e) => void;
}

export function RuleCard({
  item,
  viewMode,
  onToggleActive,
  onDelete,
}: Readonly<RuleCardProps>) {
  const conditionCount = item.groups[0]?.conditions?.length || 0;
  const actionCount = item.actions?.length || 0;

  if (viewMode === "list") {
    return (
      <Card className="hover:shadow-md transition-all overflow-hidden gap-1">
        <CardContent className="flex items-center gap-2">
          <Badge
            variant={item.isActive ? "default" : "secondary"}
            className={"h-10 w-1 rounded-full p-0"}
          />

          <div className="flex items-center gap-1 flex-shrink-0">
            <Play className="w-3.5 h-3.5" />
            <h3 className="font-semibold text-sm text-foreground truncate">
              {item.name}
            </h3>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0 ml-2">
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-muted-foreground" />
              <p className="text-sm font-bold">{conditionCount}</p>
            </div>
            <div className="flex items-center gap-1">
              <Settings className="w-3 h-3 text-muted-foreground" />
              <p className="text-sm font-bold">{actionCount}</p>
            </div>
            <div className="flex items-center gap-1">
              <GitBranch className="w-3 h-3 text-muted-foreground" />
              <Badge variant="outline" className="text-xs py-0.5 px-2">
                {item.operator}
              </Badge>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{new Date(item.createdAt).toLocaleDateString()}</span>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={item.isActive} onCheckedChange={onToggleActive} />
            <Button
              onClick={onDelete}
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className={"hover:shadow-md transition-all overflow-hidden gap-1"}>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <Badge
            variant={item.isActive ? "default" : "secondary"}
            className={"h-10 w-1 rounded-full p-0"}
          />
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <Play className="w-3.5 h-3.5 flex-shrink-0" />
            <h3 className="font-semibold text-sm text-foreground truncate">
              {item.name}
            </h3>
          </div>
          <Button
            onClick={onDelete}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
          >
            <Trash2 className="w-3 h-3.5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <Zap className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">Trigger</p>
              <Badge variant="secondary" className="mt-1 text-xs py-0.5 px-2">
                {item.triggerEvent}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <GitBranch className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-muted-foreground text-xs">Operator</p>
              <Badge variant="outline" className="mt-1 text-xs py-0.5 px-2">
                {item.operator}
              </Badge>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2">
            <Settings className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Conditions</p>
              <p className="text-sm font-bold">{conditionCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Tag className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Actions</p>
              <p className="text-sm font-bold">{actionCount}</p>
            </div>
          </div>
        </div>
      </CardContent>
      <Separator className="my-1" />

      <CardFooter className="flex justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
        </div>

        <Switch checked={item.isActive} onCheckedChange={onToggleActive} />
      </CardFooter>
    </Card>
  );
}
