import { IconClock, IconPhoneCall, IconPhoneIncoming, IconPhoneX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { useLiveCalls } from "@/backend/whatsapp/calling/calling.query";
import { StatTile } from "@/components/common/StatTile.tsx";
import { formatCount } from "@/components/dashboard/analytics/kit/format.ts";
import { TileGroup } from "@/components/dashboard/analytics/kit/TileGroup.tsx";
import { formatCallDuration } from "@/utils/whatsapp/callFormat.ts";

import { useNow } from "./useNow.ts";

const ICON = "size-4 text-muted-foreground";
const HOUR_MS = 60 * 60 * 1000;

/** Marks a tile as a reading of right now, not of the page's date range. */
function LiveDot() {
  return (
    <span className="relative flex size-2" aria-hidden>
      <span className="absolute inset-0 animate-ping rounded-full bg-green-600/60 dark:bg-green-500/60" />
      <span className="relative size-2 rounded-full bg-green-600 dark:bg-green-500" />
    </span>
  );
}

/**
 * What is happening on the phones this minute: calls in progress, customers still
 * ringing, how long the longest of them has waited, and what was missed in the last hour.
 * Independent of the date range below it.
 */
export default function LiveCallsStrip({ phoneId }: Readonly<{ phoneId?: string }>) {
  const { t } = useTranslation();
  const query = useLiveCalls(phoneId);
  const calls = query.data ?? [];

  const onCall = calls.filter((call) => call.status === "ACCEPTED");
  const waiting = calls.filter(
    (call) => call.status === "RINGING" && call.direction === "USER_INITIATED",
  );
  const now = useNow(waiting.length > 0);
  const longestWaitMs = waiting.reduce(
    (longest, call) => Math.max(longest, now - new Date(call.createdAt).getTime()),
    0,
  );
  const missed = calls.filter(
    (call) =>
      call.status === "MISSED" &&
      call.direction === "USER_INITIATED" &&
      now - new Date(call.createdAt).getTime() <= HOUR_MS,
  );

  return (
    <TileGroup query={query} count={4}>
      <StatTile
        label={t("On call")}
        value={formatCount(onCall.length)}
        note={t("Real-time")}
        badge={<LiveDot />}
        icon={<IconPhoneCall className={ICON} />}
      />
      <StatTile
        label={t("Waiting")}
        value={formatCount(waiting.length)}
        note={t("Real-time")}
        badge={<LiveDot />}
        icon={<IconPhoneIncoming className={ICON} />}
      />
      <StatTile
        label={t("Longest wait")}
        value={waiting.length > 0 ? formatCallDuration(longestWaitMs / 1000) : null}
        emptyValue={t("Nobody waiting")}
        note={t("Real-time")}
        badge={<LiveDot />}
        icon={<IconClock className={ICON} />}
      />
      <StatTile
        label={t("Missed")}
        value={formatCount(missed.length)}
        note={t("Last hour")}
        icon={<IconPhoneX className={ICON} />}
      />
    </TileGroup>
  );
}
