import { Link } from "@tanstack/react-router";
import { cva } from "class-variance-authority";
import dayjs from "dayjs";
import { Megaphone } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import type { Announcement, AnnouncementKind } from "@/config/announcements";
import { cn } from "@/lib/utils.ts";

import { useAnnouncements } from "./use-announcements.ts";

/**
 * Ceiling for the scrolling list. Capped against the viewport too, so the
 * popover never outgrows a short window — the rail button sits near the bottom
 * of the screen, so the popover opens upward from there.
 */
const LIST_MAX_HEIGHT = "max-h-[min(26rem,60vh)]";

const KIND_LABEL: Record<AnnouncementKind, string> = {
  new: "New",
  improvement: "Improvement",
  fix: "Fix",
};

// Tint per kind, layered over the `secondary` badge — a variant table rather
// than a per-call className override, so the palette stays in one place.
const kindChipVariants = cva("border-transparent", {
  variants: {
    kind: {
      new: "bg-primary/10 text-primary dark:bg-primary/20",
      improvement: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-500",
      fix: "bg-green-600/10 text-green-700 dark:text-green-500",
    },
  },
});

function formatDate(publishedAt: string) {
  const date = dayjs(publishedAt);
  return date.format(date.year() === dayjs().year() ? "MMM D" : "MMM D, YYYY");
}

function KindChips({ item }: Readonly<{ item: Announcement }>) {
  const { t: translations } = useTranslation();

  return (
    <>
      {item.kinds.map((kind) => (
        <Badge
          key={kind}
          variant="secondary"
          className={cn("h-4 px-1.5 text-[10px] font-medium", kindChipVariants({ kind }))}
        >
          {translations(KIND_LABEL[kind])}
        </Badge>
      ))}
      {item.area && (
        <Badge variant="outline" className="h-4 px-1.5 text-[10px] font-medium">
          {item.area}
        </Badge>
      )}
    </>
  );
}

function AnnouncementEntry({
  item,
  unread,
  onRead,
  onClose,
}: Readonly<{
  item: Announcement;
  unread: boolean;
  onRead: (id: string) => void;
  onClose: () => void;
}>) {
  const { t: translations } = useTranslation();

  return (
    <article className="flex gap-2.5 border-b border-border px-3 py-3 last:border-b-0">
      {unread ? (
        // `relative` is load-bearing: `sr-only` is `position: absolute`, and without a positioned
        // parent its containing block is the popover positioner, so it escapes the list's
        // `overflow-y-auto` and stretches the document down to its static position.
        <span className="relative mt-1.5 size-1.5 shrink-0 rounded-full bg-primary">
          <span className="sr-only">{translations("Unread")}</span>
        </span>
      ) : (
        <span aria-hidden className="mt-1.5 size-1.5 shrink-0" />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3
            className={cn(
              "text-sm leading-snug text-foreground",
              unread ? "font-semibold" : "font-medium",
            )}
          >
            {item.title}
          </h3>
          <span className="shrink-0 pt-0.5 text-xs text-muted-foreground tabular-nums">
            {formatDate(item.publishedAt)}
          </span>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          <KindChips item={item} />
        </div>

        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.summary}</p>

        {item.link && (
          <Link
            to={item.link.to as never}
            search={(item.link.search ?? {}) as never}
            onClick={() => {
              onRead(item.id);
              onClose();
            }}
            className="mt-2 inline-flex text-xs font-medium text-primary hover:underline"
          >
            {translations(item.link.label ?? "Take a look")}
          </Link>
        )}
      </div>
    </article>
  );
}

/**
 * "What's new" — product announcements, opened from the icon rail.
 *
 * Content comes from `src/config/announcements.ts`; read state is per browser
 * (see `useAnnouncements`). Living in the rail rather than the nav panel means
 * it is reachable from every section and at every width, since the rail is
 * always on screen while the panel is `hidden md:flex` and only renders for
 * sections that have a sub-nav.
 */
export default function WhatsNewButton() {
  const { t: translations } = useTranslation();
  const { announcements, unreadCount, isUnread, markRead, markAllRead } = useAnnouncements();
  const [open, setOpen] = useState(false);

  if (announcements.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative mx-auto">
        <PopoverTrigger
          render={
            <Button
              variant="secondary"
              size="icon-sm"
              className="h-8 w-8"
              aria-label={translations("What's new")}
            />
          }
        >
          <Megaphone className="size-5" strokeWidth={1.8} />
        </PopoverTrigger>

        {unreadCount > 0 && (
          <span
            aria-hidden
            className="pointer-events-none absolute -top-2 -right-2 inline-flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-white"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </div>

      <PopoverContent side="right" align="end" sideOffset={8} className="w-80 gap-0 p-0">
        <PopoverHeader className="flex-row items-center justify-between gap-2 border-b border-border p-3">
          <div className="flex min-w-0 items-center gap-1.5">
            <Megaphone className="size-4 shrink-0 text-primary" strokeWidth={1.75} />
            <PopoverTitle className="truncate text-sm font-semibold text-foreground">
              {translations("What's new")}
            </PopoverTitle>
            {unreadCount > 0 && (
              <Badge className="h-4 px-1.5 text-[10px] tabular-nums">{unreadCount}</Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button size="xs" variant="ghost" className="shrink-0" onClick={markAllRead}>
              {translations("Mark all as read")}
            </Button>
          )}
        </PopoverHeader>

        {/* Plain scroll container rather than `ScrollArea`: base-ui puts
            `overflow: scroll` on an inner viewport that sizes itself to its
            content, so capping the outer root clips the list instead of
            scrolling it. The cap and the overflow belong on one element. */}
        <div className={cn("overflow-y-auto overscroll-contain", LIST_MAX_HEIGHT)}>
          {announcements.map((item) => (
            <AnnouncementEntry
              key={item.id}
              item={item}
              unread={isUnread(item.id)}
              onRead={markRead}
              onClose={() => setOpen(false)}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
