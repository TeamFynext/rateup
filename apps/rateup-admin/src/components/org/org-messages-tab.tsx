import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useState } from "react";

import { orgMessageStatsQueryOptions } from "@/api/orgs.query";
import { FilterChips, type FilterChip } from "@/components/ds/filter-chips";
import { Panel } from "@/components/ds/panel";
import { ErrorState } from "@/components/ds/query-states";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatNumber } from "@/lib/format";

type Preset = "7" | "30" | "90" | "365" | "custom";

const PRESETS: FilterChip<Preset>[] = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last year" },
  { value: "custom", label: "Custom" },
];

const DAY = "YYYY-MM-DD";

export function presetRange(days: number) {
  return {
    from: dayjs()
      .subtract(days - 1, "day")
      .format(DAY),
    to: dayjs().format(DAY),
  };
}

const dateInput =
  "h-11 w-full rounded-xl border bg-background px-3.5 text-sm tabular outline-none focus:border-foreground/40";

/** Template messages the org sent over a period: what Meta bills them for. */
export function OrgMessagesTab({ orgId }: { orgId: string }) {
  const [preset, setPreset] = useState<Preset>("30");
  const [custom, setCustom] = useState(presetRange(30));
  const range = preset === "custom" ? custom : presetRange(Number(preset));
  const valid = range.from <= range.to && dayjs(range.to).diff(range.from, "day") <= 366;
  const query = useQuery({ ...orgMessageStatsQueryOptions(orgId, range), enabled: valid });

  return (
    <div className="flex flex-col gap-6">
      <FilterChips chips={PRESETS} value={preset} onChange={setPreset} />
      {preset === "custom" && (
        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
            From
            <input
              type="date"
              value={custom.from}
              max={custom.to}
              onChange={(event) => setCustom((prev) => ({ ...prev, from: event.target.value }))}
              className={dateInput}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
            To
            <input
              type="date"
              value={custom.to}
              min={custom.from}
              max={dayjs().format(DAY)}
              onChange={(event) => setCustom((prev) => ({ ...prev, to: event.target.value }))}
              className={dateInput}
            />
          </label>
        </div>
      )}

      {!valid ? (
        <p className="text-sm text-negative">Pick a start before the end, a year apart at most.</p>
      ) : query.isPending ? (
        <Skeleton className="h-44 w-full rounded-3xl" />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <Panel className="flex flex-col gap-3">
          <p className="text-[13px] font-semibold">Template messages sent</p>
          <p className="text-[44px] leading-none font-medium tracking-tight tabular">
            {formatNumber(query.data.templateMessages)}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDate(range.from)} – {formatDate(range.to)}
            {query.isPlaceholderData && " · Updating…"}
          </p>
        </Panel>
      )}
    </div>
  );
}
