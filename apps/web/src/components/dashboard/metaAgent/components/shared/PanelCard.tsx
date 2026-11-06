import { IconRefresh } from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { formatSyncedAt } from "../../utils/formatSyncedAt";

type PanelCardProps = Readonly<{
  title: string;
  description?: string;
  /** Rendered as a chip beside the title — usually a row count. */
  count?: number;
  /** ISO timestamp of the last Meta read, shown under the description. */
  syncedAt?: string | null;
  onSync?: () => void;
  isSyncing?: boolean;
  /** Extra buttons for the header, placed left of the sync button. */
  actions?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
}>;

/**
 * The frame every configuration panel shares: a title with an optional count, a
 * "pull from Meta" action, and the freshness of what is on screen. Having one
 * component own it keeps every panel honest about where its data came from.
 */
export function PanelCard({
  title,
  description,
  count,
  syncedAt,
  onSync,
  isSyncing,
  actions,
  className,
  contentClassName,
  children,
}: PanelCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {title}
          {count !== undefined && (
            <Badge variant="secondary" className="tabular-nums">
              {count}
            </Badge>
          )}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {syncedAt !== undefined && (
          <p className="text-xs text-muted-foreground">{formatSyncedAt(syncedAt)}</p>
        )}
        {(actions || onSync) && (
          <CardAction className="flex flex-wrap items-center gap-2">
            {actions}
            {onSync && (
              <Button variant="outline" size="sm" disabled={isSyncing} onClick={onSync}>
                <IconRefresh data-icon="inline-start" className={cn(isSyncing && "animate-spin")} />
                Sync
              </Button>
            )}
          </CardAction>
        )}
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}
