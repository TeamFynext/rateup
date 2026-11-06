import { IconChartBar, IconRefresh } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import type { LinktreeData } from "@/backend/linktree/linktree.api.ts";
import { useGetLinktreeWithShortId } from "@/backend/linktree/linktree.query";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";

export function StatsPanel({ page }: Readonly<{ page: LinktreeData }>) {
  const { t } = useTranslation();
  const { refetch, isFetching } = useGetLinktreeWithShortId(page.shortUrlId);
  const links = [...(page.links ?? [])].sort((a, b) => (b.noOfClicks ?? 0) - (a.noOfClicks ?? 0));
  const clicks = links.reduce((sum, link) => sum + (link.noOfClicks ?? 0), 0);
  const visits = page.visitorsCount ?? 0;

  const stats = [
    { label: t("Visits"), value: visits },
    { label: t("Link clicks"), value: clicks },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {t("A visitor is counted once an hour, and so is each link they click.")}
        </p>
        <Button variant="outline" size="sm" loading={isFetching} onClick={() => void refetch()}>
          <IconRefresh data-icon="inline-start" />
          {t("Refresh")}
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {stats.map(({ label, value }) => (
          <Card key={label} size="sm">
            <CardContent className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className="font-display text-2xl font-bold tabular-nums">{value}</span>
            </CardContent>
          </Card>
        ))}
      </div>
      {links.length === 0 ? (
        <Empty className="rounded-lg border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconChartBar />
            </EmptyMedia>
            <EmptyTitle>{t("No links to count yet")}</EmptyTitle>
            <EmptyDescription>{t("Clicks show up here once the page has links.")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card size="sm" className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Link")}</TableHead>
                <TableHead className="text-right">{t("Clicks")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((link) => (
                <TableRow key={link.id}>
                  <TableCell className="max-w-0">
                    <p className="truncate font-medium">{link.linkDisplayName}</p>
                    <p className="truncate text-xs text-muted-foreground">{link.linkUrl}</p>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{link.noOfClicks ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
