import { IconChevronLeft, IconChevronRight, IconHistory, IconLock } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useMemberActivity } from "@/backend/org/org.query";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { usePermissions } from "@/hooks/usePermission.ts";

import { describeActivity } from "./activityLabel.ts";

/**
 * What a person did, newest first, from the audit trail the API keeps for every change a
 * signed-in user makes. Reads are not recorded, so an empty page means nothing was changed,
 * not that nothing was looked at.
 */
export function MemberActivity({ memberId }: Readonly<{ memberId: string }>) {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const allowed = can("org.audit.read");
  const [page, setPage] = useState(1);
  const { data, isPending, isFetching } = useMemberActivity(memberId, page, allowed);

  if (!allowed) {
    return (
      <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <IconLock className="size-4" aria-hidden="true" />
        {t("Seeing a person's activity needs the View audit log permission.")}
      </p>
    );
  }

  if (isPending) {
    return (
      <div className="flex flex-col gap-2 py-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    );
  }

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / (data?.limit ?? 25)));

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <IconHistory className="size-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium">{t("Nothing changed yet")}</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {t("Changes this person makes will show up here. Reading and browsing are not recorded.")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 py-2">
      <ol className="flex flex-col divide-y divide-border">
        {items.map((item) => {
          const description = describeActivity(item.method, item.route);
          return (
            <li
              key={item.id}
              className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:gap-4"
            >
              <span
                className="w-40 shrink-0 text-xs text-muted-foreground"
                title={dayjs(item.createdAt).format("MMM D, YYYY HH:mm:ss")}
              >
                {dayjs(item.createdAt).format("MMM D, YYYY · HH:mm")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm">{description.title}</span>
                <span className="block truncate font-mono text-[11px] text-muted-foreground">
                  {description.detail}
                </span>
              </span>
              <Badge variant="outline" className="w-fit">
                {description.module}
              </Badge>
            </li>
          );
        })}
      </ol>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{t("{count} changes", { count: total })}</span>
        <span className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("Previous page")}
            disabled={page <= 1 || isFetching}
            onClick={() => setPage((p) => p - 1)}
          >
            <IconChevronLeft className="size-4" />
          </Button>
          <span>{t("Page {page} of {pages}", { page, pages })}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("Next page")}
            disabled={page >= pages || isFetching}
            onClick={() => setPage((p) => p + 1)}
          >
            <IconChevronRight className="size-4" />
          </Button>
        </span>
      </div>
    </div>
  );
}
