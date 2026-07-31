// Extracted verbatim from `LifecyclePage.tsx`. Behaviour is unchanged.

import { Minus, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { getProgressToneStyle, getStageToneStyle } from "./shared.tsx";
import type { UILifecycleStage } from "./shared.tsx";

export function LifecycleStageCard({
  stage,
  pct,
  onAdjustCount,
  isLost,
}: Readonly<{
  stage: UILifecycleStage;
  pct: number;
  onAdjustCount: () => void;
  isLost: boolean;
}>) {
  const { t } = useTranslation("contacts.lifecycle");
  return (
    <Card className="group relative flex flex-col justify-between p-3.5 shadow-sm transition-all hover:border-border gap-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className="flex size-6 shrink-0 items-center justify-center rounded text-xs font-bold text-white shadow-sm"
            style={getStageToneStyle(stage.color)}
          >
            <span>{stage.emoji || (isLost ? "🛑" : "🔹")}</span>
          </div>
          <h3 className="max-w-30 truncate text-[12px] font-bold tracking-tight text-foreground">
            {stage.name}
          </h3>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Badge
            variant="outline"
            className={cn(
              "rounded border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider",
              isLost
                ? "border-destructive/20 bg-destructive/10 text-destructive"
                : stage.statusBadgeType === "won"
                  ? "border-primary/20 bg-primary/10 text-primary"
                  : "border-secondary bg-secondary text-secondary-foreground",
            )}
          >
            {isLost ? "🛑 " : stage.statusBadgeType === "won" ? "🏆 " : ""}
            {stage.statusBadge}
          </Badge>
          {stage.isDefault ? (
            <Badge
              variant="secondary"
              className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider"
            >
              Default
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-2xl font-black leading-none tracking-tight text-foreground">
          {stage.count}
        </div>

        <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted/40 p-0.5 opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onAdjustCount}
            className="size-5 rounded p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            title="Decrease"
          >
            <Minus className="size-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onAdjustCount}
            className="size-5 rounded p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            title="Increase"
          >
            <Plus className="size-3" />
          </Button>
        </div>
      </div>

      <div className="mt-3 space-y-1">
        <div className="flex items-center justify-between text-[10px] font-extrabold text-muted-foreground">
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80">
            {isLost ? t("Lost Lead") : t("Share")}
          </span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              ...getProgressToneStyle(stage.color, isLost),
              width: `${pct}%`,
            }}
          />
        </div>
      </div>
    </Card>
  );
}
