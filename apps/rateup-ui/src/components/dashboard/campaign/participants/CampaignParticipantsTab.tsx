import {
  IconChevronLeft,
  IconChevronRight,
  IconInbox,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconUserX,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useSendCampaign } from "@/backend/campaign/campaign.query";
import {
  useCampaignParticipants,
  useRemoveMulitpleGroupParticipants,
} from "@/backend/campaign/campaignParticipants/campaignParticipants.query";
import useDebounce from "@/components/menu/hook/useDebounce.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils";
import { CampaignParticipantStatus, CampaignStatus, SentCampaignChoice } from "@/types/enums.ts";
import type { Campaign } from "@/types/global";

import type { ParticipantAttempt } from "./ParticipantAttemptChips.tsx";
import { ParticipantAttemptChips } from "./ParticipantAttemptChips.tsx";

const COLUMNS = "grid-cols-[32px_minmax(170px,1fr)_118px_112px_128px_minmax(120px,1fr)_72px_150px]";

const PAGE_SIZE = 25;

/** One filter pill per status, plus "All". Dot colour matches the status badge. */
const FILTERS = [
  { value: "ALL", label: "All", dot: "bg-muted-foreground/50" },
  { value: CampaignParticipantStatus.DELIVERED, label: "Delivered", dot: "bg-green-600" },
  { value: CampaignParticipantStatus.READ, label: "Read", dot: "bg-emerald-500" },
  { value: CampaignParticipantStatus.SENT, label: "Sent", dot: "bg-primary" },
  { value: CampaignParticipantStatus.PENDING, label: "Pending", dot: "bg-muted-foreground/50" },
  { value: CampaignParticipantStatus.FAILED, label: "Failed", dot: "bg-destructive" },
] as const;

const STATUS_TONE: Record<string, string> = {
  DELIVERED: "bg-green-600/10 text-green-700 dark:text-green-500",
  READ: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  SENT: "bg-primary/10 text-primary",
  PENDING: "bg-muted text-muted-foreground",
  FAILED: "bg-destructive/10 text-destructive",
  COMPLETED: "bg-green-600/10 text-green-700 dark:text-green-500",
};

interface ParticipantRow {
  id: string;
  status: string;
  contact?: { id?: string; name?: string | null; phone?: string | null };
  attempts?: ParticipantAttempt[];
  lastAttemptAt?: string | null;
  failureCode?: number | null;
  failureMessage?: string | null;
  readAt?: string | null;
  errorMessage?: string | null;
}

/** Two initials from a name or number, for the avatar circles. */
function initialsOf(value: string | null | undefined): string {
  if (!value) return "?";
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Who this campaign went to, and what happened to each of them.
 *
 * Purpose-built rather than the shared `DataTable`, because the interesting
 * columns here are not values but histories: a row's attempt chips, and the
 * reason its most recent attempt failed. Selecting rows offers the two actions
 * that make sense on a set of recipients — retry them, or take them out.
 */
export function CampaignParticipantsTab({
  campaign,
  onAddParticipants,
}: Readonly<{ campaign: Campaign; onAddParticipants: () => void }>) {
  const { t } = useTranslation("campaign.details");
  const campaignId = campaign.id;

  const [status, setStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);

  const debouncedSearch = useDebounce(search, 200);
  const columnFilters = useMemo(
    () => (status === "ALL" ? [] : [{ id: "status", value: status }]),
    [status],
  );

  const query = useCampaignParticipants(
    campaignId,
    { pageIndex: page, pageSize: PAGE_SIZE },
    debouncedSearch,
    [],
    columnFilters,
  );
  const removeParticipants = useRemoveMulitpleGroupParticipants(campaignId, () => setSelected([]));
  const sendCampaign = useSendCampaign(campaignId, campaign.teamId);

  const rows = (query.data?.participants ?? []) as ParticipantRow[];
  const total = query.data?.searchCount ?? query.data?.totalCount ?? 0;
  const allChecked = rows.length > 0 && rows.every((row) => selected.includes(row.id));

  const toggleAll = (checked: boolean) =>
    setSelected(checked ? [...new Set([...selected, ...rows.map((r) => r.id)])] : []);

  const toggleOne = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min(from + rows.length - 1, total);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => {
                setStatus(filter.value);
                setPage(0);
              }}
              className={cn(
                "inline-flex h-7.5 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap",
                filter.value === status
                  ? "bg-foreground text-background"
                  : "text-secondary-foreground ring-foreground/10 hover:bg-muted ring-1",
              )}
            >
              <span className={cn("size-2 rounded-full", filter.dot)} aria-hidden />
              {t(filter.label)}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={onAddParticipants}>
          <IconPlus className="size-4" aria-hidden />
          {t("Add participants")}
        </Button>
      </div>

      <div className="bg-card ring-foreground/10 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl shadow-xs ring-1">
        <div className="border-border flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3">
          <span className="font-display text-sm font-semibold">
            {status === "ALL" ? t("All recipients") : t("{status} recipients", { status })}{" "}
            <span className="text-muted-foreground/70 font-medium tabular-nums">
              · {total.toLocaleString()}
            </span>
          </span>
          <div className="relative w-60">
            <IconSearch
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
              aria-hidden
            />
            <Input
              type="search"
              placeholder={t("Search name or phone")}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
              className="h-8 pl-8 text-[13px]"
            />
          </div>
        </div>

        {selected.length > 0 ? (
          <div className="border-primary/20 bg-accent flex shrink-0 items-center gap-2.5 border-b px-4 py-2.5">
            <span className="text-primary text-[13px] font-semibold">
              {t("{count} selected", { count: selected.length })}
            </span>
            <span className="bg-primary/20 h-4 w-px" aria-hidden />
            <Button
              variant="outline"
              size="sm"
              disabled={sendCampaign.isPending}
              onClick={() =>
                sendCampaign.mutate({
                  statuses: [CampaignParticipantStatus.FAILED],
                  sentCampaignChoice: SentCampaignChoice.NOW,
                  status: CampaignStatus.ACTIVE,
                  type: campaign.type,
                })
              }
            >
              <IconRefresh className="size-4" aria-hidden />
              {t("Retry failed now")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={removeParticipants.isPending}
              onClick={() => removeParticipants.mutate({ data: selected, campaignId })}
            >
              <IconUserX className="size-4" aria-hidden />
              {t("Remove from campaign")}
            </Button>
            <Button
              variant="link"
              size="sm"
              className="ml-auto h-auto p-0"
              onClick={() => setSelected([])}
            >
              {t("Clear selection")}
            </Button>
          </div>
        ) : null}

        <div
          className={cn(
            "border-border text-muted-foreground/70 grid shrink-0 items-center gap-2.5 border-b px-4 py-2.5 text-[11.5px] font-semibold tracking-wider uppercase",
            COLUMNS,
          )}
        >
          <Checkbox
            checked={allChecked}
            onCheckedChange={toggleAll}
            aria-label={t("Select all on this page")}
          />
          <span>{t("Contact")}</span>
          <span>{t("Status")}</span>
          <span>{t("Attempts")}</span>
          <span>{t("Last attempt")}</span>
          <span>{t("Reason")}</span>
          <span>{t("Read")}</span>
          <span />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {query.isPending ? (
            <div className="flex flex-col gap-2 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground p-10 text-center text-[13px]">
              {t("No recipients match this filter.")}
            </p>
          ) : (
            rows.map((row) => (
              <div
                key={row.id}
                className={cn(
                  "border-border/60 hover:bg-muted/60 grid items-center gap-2.5 border-b px-4 py-2 text-[13px]",
                  selected.includes(row.id) && "bg-accent/60",
                  COLUMNS,
                )}
              >
                <Checkbox
                  checked={selected.includes(row.id)}
                  onCheckedChange={() => toggleOne(row.id)}
                  aria-label={row.contact?.name ?? row.contact?.phone ?? row.id}
                />

                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="bg-accent text-primary font-display flex size-8 shrink-0 items-center justify-center rounded-full text-[11.5px] font-semibold">
                    {initialsOf(row.contact?.name || row.contact?.phone)}
                  </span>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">
                      {row.contact?.name || t("Unnamed contact")}
                    </span>
                    <span className="text-muted-foreground truncate text-xs tabular-nums">
                      {row.contact?.phone}
                    </span>
                  </div>
                </div>

                <div>
                  <Badge
                    variant="secondary"
                    className={STATUS_TONE[row.status] ?? STATUS_TONE.PENDING}
                  >
                    {row.status}
                  </Badge>
                </div>

                <ParticipantAttemptChips attempts={row.attempts} />

                <span className="text-secondary-foreground tabular-nums whitespace-nowrap">
                  {row.lastAttemptAt
                    ? new Date(row.lastAttemptAt).toLocaleString(undefined, {
                        day: "numeric",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "—"}
                </span>

                <div className="flex min-w-0 flex-col">
                  <span className="text-secondary-foreground truncate">
                    {row.failureMessage || row.errorMessage || "—"}
                  </span>
                  {row.failureCode === null || row.failureCode === undefined ? null : (
                    <span className="text-muted-foreground/70 font-mono text-[11px]">
                      {row.failureCode}
                    </span>
                  )}
                </div>

                <span className="text-secondary-foreground tabular-nums whitespace-nowrap">
                  {row.readAt
                    ? new Date(row.readAt).toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "—"}
                </span>

                <div className="flex justify-end">
                  {row.contact?.id ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      render={
                        <Link
                          to="/dashboard/inbox"
                          search={{ tab: "open", contactId: row.contact.id }}
                        />
                      }
                    >
                      <IconInbox className="size-4" aria-hidden />
                      {t("Open")}
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-border text-muted-foreground flex shrink-0 items-center justify-between border-t px-4 py-2.5 text-[12.5px]">
          <span className="tabular-nums">
            {t("{from}–{to} of {total}", { from, to: Math.max(to, 0), total })}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(p - 1, 0))}
            >
              <IconChevronLeft className="size-4" aria-hidden />
              {t("Prev")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={to >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              {t("Next")}
              <IconChevronRight className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
