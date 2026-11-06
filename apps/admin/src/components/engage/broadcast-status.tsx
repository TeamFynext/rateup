import type { Broadcast } from "@/api/engage.api";
import { Pill, type PillTone } from "@/components/ds/pill";
import { formatDateTime } from "@/lib/format";

const TONE: Record<Broadcast["status"], PillTone> = {
  DRAFT: "muted",
  SCHEDULED: "warning",
  SENDING: "brand",
  SENT: "positive",
};

export function BroadcastStatusPill({ broadcast }: { broadcast: Broadcast }) {
  const label =
    broadcast.status === "SCHEDULED" && broadcast.scheduledAt
      ? `Scheduled · ${formatDateTime(broadcast.scheduledAt)}`
      : broadcast.status.charAt(0) + broadcast.status.slice(1).toLowerCase();
  return <Pill tone={TONE[broadcast.status]}>{label}</Pill>;
}
