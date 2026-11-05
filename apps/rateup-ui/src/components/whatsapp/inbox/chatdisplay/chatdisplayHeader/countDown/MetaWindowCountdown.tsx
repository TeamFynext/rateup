import { IconClock } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import CustomTooltip from "@/components/ui/custom/CustomTooltip.tsx";
import { cn } from "@/lib/utils.ts";
import type { MessagingWindow } from "@/utils/whatsapp/messagingWindow.ts";
import { timeLeft } from "@/utils/whatsapp/messagingWindow.ts";

export function formatWindowTime(at: Date) {
  return dayjs(at).format("D MMM, HH:mm");
}

/** Re-renders once a minute, so a window's countdown and state stay current. */
export function useMinuteClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/**
 * The Instagram/Messenger counterpart of the WhatsApp session timer: how long a person can
 * still reply (up to 7 days with the Human Agent tag), and whether that is the free window.
 */
export default function MetaWindowCountdown({
  win,
  now,
}: Readonly<{ win: MessagingWindow; now: Date }>) {
  const { t } = useTranslation();

  if (win.state === "closed" || !win.closesAt) {
    return (
      <CustomTooltip
        trigger={<IconClock className="size-4 text-muted-foreground" />}
        content={<span>{t("Reply window closed")}</span>}
        side="bottom"
      />
    );
  }

  const { days, hours } = timeLeft(win.closesAt, now);
  const label =
    days > 0
      ? t("{days}d {hours}h", { days, hours })
      : t("{hours}h", { hours: Math.max(hours, 0) });

  return (
    <CustomTooltip
      side="bottom"
      trigger={
        <div
          className={cn(
            "flex items-center gap-1 text-sm font-medium",
            win.state === "open" ? "text-primary" : "text-amber-700 dark:text-amber-500",
          )}
        >
          <IconClock className="size-4" />
          <span>{label}</span>
        </div>
      }
      content={
        <span>
          {win.state === "open" && win.openUntil
            ? t("Reply freely until {time}", { time: formatWindowTime(win.openUntil) })
            : t("Past 24 hours: only a person can reply, until {time}", {
                time: formatWindowTime(win.closesAt),
              })}
        </span>
      }
    />
  );
}
