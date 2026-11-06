import {
  IconBrandInstagram,
  IconEye,
  IconHeart,
  IconPlugConnectedX,
  IconUsers,
  IconUsersGroup,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useMetaChannels } from "@/backend/meta/metaChannels.query";
import type {
  InstagramInsightsRange,
  InstagramPostReport,
} from "@/backend/whatsapp/instagram-insights/instagramInsights.api";
import {
  isInsightsPermissionError,
  useInstagramAccountInsights,
  useInstagramPostsInsights,
} from "@/backend/whatsapp/instagram-insights/instagramInsights.query";
import { StatTile } from "@/components/common/StatTile.tsx";
import type { DataTableFeatures } from "@/components/Table/data-table-features.ts";
import { createSortableHeader, DataTable } from "@/components/Table/data-table.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";

import { AnalyticsCard } from "../kit/AnalyticsCard.tsx";
import { TrendArea } from "../kit/charts.tsx";
import { formatBucket, formatCount } from "../kit/format.ts";
import { TileGroup } from "../kit/TileGroup.tsx";

const ICON = "size-4 text-muted-foreground";

/** What the Instagram view is looking at; held by the page so the filter bar can set it. */
export interface InstagramSelection {
  /** Instagram account id; unset means the first connected account. */
  ibaId?: string;
  range: InstagramInsightsRange;
}

function useInstagramChannels() {
  return useMetaChannels(true, "INSTAGRAM");
}

function channelLabel(channel: {
  username: string | null;
  name: string | null;
  accountId: string;
}) {
  return channel.username ? `@${channel.username}` : (channel.name ?? channel.accountId);
}

/** The view's own controls, shown in the section's filter bar: account (when several) and range. */
export function InstagramFilters({
  value,
  onChange,
}: Readonly<{ value: InstagramSelection; onChange: (value: InstagramSelection) => void }>) {
  const { t } = useTranslation();
  const { data: channels = [] } = useInstagramChannels();
  const ranges: { value: InstagramInsightsRange; label: string }[] = [
    { value: "7d", label: t("Last 7 days") },
    { value: "30d", label: t("Last 30 days") },
    { value: "90d", label: t("Last 90 days") },
  ];
  const accounts = channels.map((channel) => ({
    value: channel.accountId,
    label: channelLabel(channel),
  }));
  const ibaId = value.ibaId ?? accounts[0]?.value;

  return (
    <>
      <Select
        value={value.range}
        onValueChange={(next) => {
          const range = ranges.find((option) => option.value === next)?.value;
          if (range) onChange({ ...value, range });
        }}
        items={ranges}
      >
        <SelectTrigger className="w-full sm:w-44" aria-label={t("Date range")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ranges.map((range) => (
            <SelectItem key={range.value} value={range.value}>
              {range.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {accounts.length > 1 && (
        <Select
          value={ibaId}
          onValueChange={(next) => next && onChange({ ...value, ibaId: next })}
          items={accounts}
        >
          <SelectTrigger className="w-full sm:w-56" aria-label={t("Instagram account")}>
            <IconBrandInstagram className={ICON} />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((account) => (
              <SelectItem key={account.value} value={account.value}>
                {account.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </>
  );
}

function ReconnectAlert() {
  const { t } = useTranslation();
  return (
    <Alert>
      <IconPlugConnectedX />
      <AlertTitle>{t("Reconnect Instagram to allow insights")}</AlertTitle>
      <AlertDescription>
        <p>
          {t(
            "Instagram did not let RateUp read this account's insights. Reconnect it and allow insights access when Facebook asks.",
          )}{" "}
          <Link to="/dashboard/settings/channels">{t("Open channels")}</Link>
        </p>
      </AlertDescription>
    </Alert>
  );
}

function AccountTiles({
  ibaId,
  range,
}: Readonly<{ ibaId: string; range: InstagramInsightsRange }>) {
  const { t } = useTranslation();
  const query = useInstagramAccountInsights(ibaId, range);
  const data = query.data;
  const count = (value: number | null | undefined) =>
    value === null || value === undefined ? null : formatCount(value);
  const gained = data?.followers.gained;
  const lost = data?.followers.lost;

  return (
    <TileGroup title={t("Account")} query={query} count={4}>
      <StatTile
        label={t("Views")}
        value={count(data?.totals.views)}
        emptyValue={t("Not available")}
        note={t("Times your content was shown")}
        icon={<IconEye className={ICON} />}
      />
      <StatTile
        label={t("Reach")}
        value={count(data?.totals.reach)}
        emptyValue={t("Not available")}
        note={
          range === "90d" ? t("Summed over 30-day windows") : t("Accounts that saw your content")
        }
        icon={<IconUsersGroup className={ICON} />}
      />
      <StatTile
        label={t("Interactions")}
        value={count(data?.totals.totalInteractions)}
        emptyValue={t("Not available")}
        note={t("Likes, comments, saves, shares and replies")}
        icon={<IconHeart className={ICON} />}
      />
      <StatTile
        label={t("Followers")}
        value={count(data?.followers.count)}
        emptyValue={t("Not available")}
        note={
          gained === null || gained === undefined
            ? undefined
            : t("{gained} followed, {lost} unfollowed in this range", {
                gained: formatCount(gained),
                lost: formatCount(lost ?? 0),
              })
        }
        icon={<IconUsers className={ICON} />}
      />
    </TileGroup>
  );
}

function ReachTrend({ ibaId, range }: Readonly<{ ibaId: string; range: InstagramInsightsRange }>) {
  const { t } = useTranslation();
  const query = useInstagramAccountInsights(ibaId, range);
  const data = query.data?.daily ?? [];

  return (
    <AnalyticsCard
      title={t("Reach per day")}
      description={t("Accounts that saw your posts, stories or reels each day")}
      query={query}
      isEmpty={data.every((day) => !day.reach)}
      emptyTitle={t("No reach in this range")}
      emptyDescription={t("Instagram can take up to two days to report new numbers.")}
    >
      <TrendArea
        data={data}
        xKey="date"
        yKey="reach"
        label={t("Reach")}
        formatX={(value) => formatBucket(value, "day")}
      />
    </AnalyticsCard>
  );
}

interface PostRow {
  id: string;
  post: InstagramPostReport;
  comments: number;
  dms: number;
  leads: number;
  orders: number;
  views?: number;
  saved?: number;
  shares?: number;
}

const orUndefined = (value: number | null) => value ?? undefined;
const numberCell = (value: number | undefined) => (
  <span className="tabular-nums">{value === undefined ? "—" : formatCount(value)}</span>
);

function TopPosts({ ibaId, range }: Readonly<{ ibaId: string; range: InstagramInsightsRange }>) {
  const { t } = useTranslation();
  const query = useInstagramPostsInsights(ibaId, range);
  const rows = useMemo<PostRow[]>(
    () =>
      (query.data?.posts ?? []).map((post) => ({
        id: post.id,
        post,
        comments: post.attribution.comments,
        dms: post.attribution.dmsStarted,
        leads: post.attribution.leads,
        orders: post.attribution.orders,
        views: orUndefined(post.insights.views),
        saved: orUndefined(post.insights.saved),
        shares: orUndefined(post.insights.shares),
      })),
    [query.data],
  );

  const columns = useMemo<ColumnDef<DataTableFeatures, PostRow>[]>(
    () => [
      {
        id: "post",
        header: t("Post"),
        cell: ({ row }) => {
          const { post } = row.original;
          const caption = post.caption?.trim() || t("No caption");
          const body = (
            <>
              {post.thumbnailUrl ? (
                <img
                  src={post.thumbnailUrl}
                  alt=""
                  loading="lazy"
                  className="size-10 shrink-0 rounded-md bg-muted object-cover"
                />
              ) : (
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
                  <IconBrandInstagram className={ICON} />
                </span>
              )}
              <span className="line-clamp-2 min-w-0 text-sm">{caption}</span>
            </>
          );
          return post.permalink ? (
            <a
              href={post.permalink}
              target="_blank"
              rel="noreferrer"
              className="flex w-64 items-center gap-3 hover:underline"
            >
              {body}
            </a>
          ) : (
            <div className="flex w-64 items-center gap-3">{body}</div>
          );
        },
      },
      {
        accessorKey: "comments",
        header: createSortableHeader(t("Comments")),
        cell: ({ row }) => (
          <div className="flex flex-col">
            {numberCell(row.original.comments)}
            {row.original.post.attribution.commentsAnswered > 0 && (
              <span className="text-xs text-muted-foreground">
                {t("{count} answered", {
                  count: formatCount(row.original.post.attribution.commentsAnswered),
                })}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "dms",
        header: createSortableHeader(t("DMs started")),
        cell: ({ row }) => numberCell(row.original.dms),
      },
      {
        accessorKey: "leads",
        header: createSortableHeader(t("Leads")),
        cell: ({ row }) => numberCell(row.original.leads),
      },
      {
        accessorKey: "orders",
        header: createSortableHeader(t("Orders")),
        cell: ({ row }) => numberCell(row.original.orders),
      },
      {
        accessorKey: "views",
        header: createSortableHeader(t("Views")),
        sortUndefined: "last",
        cell: ({ row }) => numberCell(row.original.views),
      },
      {
        accessorKey: "saved",
        header: createSortableHeader(t("Saves")),
        sortUndefined: "last",
        cell: ({ row }) => numberCell(row.original.saved),
      },
      {
        accessorKey: "shares",
        header: createSortableHeader(t("Shares")),
        sortUndefined: "last",
        cell: ({ row }) => numberCell(row.original.shares),
      },
    ],
    [t],
  );

  return (
    <AnalyticsCard
      title={t("Top posts")}
      description={t(
        "Your latest posts, ranked by the DMs and orders they started in this range. Views, saves and shares are for the post's lifetime.",
      )}
      query={query}
      isEmpty={rows.length === 0}
      emptyTitle={t("No posts yet")}
      emptyDescription={t("Posts on this Instagram account will show here.")}
      skeleton={<Skeleton className="h-96 w-full" />}
      contentClassName="flex flex-col gap-4"
    >
      {query.data?.needsReconnect && <ReconnectAlert />}
      <div className="overflow-x-auto">
        <DataTable columns={columns} data={rows} />
      </div>
    </AnalyticsCard>
  );
}

function NoInstagram() {
  const { t } = useTranslation();
  return (
    <Card>
      <Empty className="py-10">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconBrandInstagram />
          </EmptyMedia>
          <EmptyTitle>{t("No Instagram account connected")}</EmptyTitle>
          <EmptyDescription>
            {t(
              "Connect an Instagram business account to see its reach and which posts bring in DMs, leads and orders.",
            )}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button render={<Link to="/dashboard/settings/channels" />}>
            {t("Connect Instagram")}
          </Button>
        </EmptyContent>
      </Empty>
    </Card>
  );
}

export function InstagramView({ selection }: Readonly<{ selection: InstagramSelection }>) {
  const channelsQuery = useInstagramChannels();
  const channels = channelsQuery.data ?? [];
  const ibaId =
    channels.find((channel) => channel.accountId === selection.ibaId)?.accountId ??
    channels[0]?.accountId;
  const accountQuery = useInstagramAccountInsights(ibaId, selection.range);

  if (channelsQuery.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-[104px] w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }
  if (!ibaId) return <NoInstagram />;
  if (accountQuery.isError && isInsightsPermissionError(accountQuery.error)) {
    return <ReconnectAlert />;
  }

  return (
    <div className="flex flex-col gap-6">
      <AccountTiles ibaId={ibaId} range={selection.range} />
      <ReachTrend ibaId={ibaId} range={selection.range} />
      <TopPosts ibaId={ibaId} range={selection.range} />
    </div>
  );
}
