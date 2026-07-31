import { Link } from "@tanstack/react-router";
import {
  AtSign,
  CircleCheck,
  Inbox,
  Layers,
  ShieldAlert,
  Sparkles,
  Star,
  UserCheck,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils.ts";
import { useChatContactCountStore } from "@/store/inbox.store.ts";

/**
 * The inbox tabs, for widths where the sidebar's filter rail is not on screen.
 *
 * The rail lives in the second nav sidebar, which is `hidden md:flex` — below
 * that there is no way to leave the tab you landed on, so the list panel carries
 * its own copy. Same tabs, same counts, same `?tab=` links; only the shape
 * differs, so nothing here can disagree with the rail.
 */
const TABS = [
  { value: "open", label: "Open", icon: Inbox, countKey: "openCount" },
  { value: "new", label: "New", icon: Sparkles, countKey: "newCount" },
  { value: "closed", label: "Closed", icon: CircleCheck, countKey: "closedCount" },
  { value: "all", label: "All", icon: Layers, countKey: "allCount" },
  { value: "mine", label: "Mine", icon: UserCheck, countKey: "mineCount" },
  { value: "mentions", label: "@Mentions", icon: AtSign, countKey: "mentionsCount" },
  { value: "favourites", label: "Favourites", icon: Star, countKey: "favouriteCount" },
  { value: "spam", label: "Spam", icon: ShieldAlert, countKey: "spamCount" },
] as const;

export default function InboxTabStrip({ tab }: Readonly<{ tab: string }>) {
  const { t: translations } = useTranslation();
  const sectionCounts = useChatContactCountStore((state) => state.sectionCounts);

  return (
    <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-border px-3 py-2 md:hidden">
      {TABS.map(({ value, label, icon: Icon, countKey }) => {
        const isActive = tab === value;
        const count = sectionCounts?.[countKey] ?? 0;

        return (
          <Link
            key={value}
            to="/dashboard/inbox"
            search={{ tab: value } as never}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
              isActive
                ? "border-transparent bg-primary/10 text-primary"
                : "border-border text-muted-foreground",
            )}
          >
            <Icon className="size-3.5" />
            {translations(label)}
            {count > 0 && <span className="tabular-nums opacity-70">{count}</span>}
          </Link>
        );
      })}
    </div>
  );
}
