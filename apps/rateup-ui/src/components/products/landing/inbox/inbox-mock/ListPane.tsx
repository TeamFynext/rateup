import { Avatar, ChannelDot } from "@/components/RateupHomePage/shared/mockups/kit";

import type { Row } from "./script";

const STATUS_TONE: Record<Row["status"], string> = {
  New: "border-ru-blue-200 bg-ru-blue-50 text-ru-blue-600",
  Open: "border-ru-green-100 bg-ru-green-50 text-ru-green-700",
  Closed: "border-ru-n-200 bg-ru-n-50 text-ru-n-500",
};

export default function ListPane({
  rows,
  newCount,
}: Readonly<{ rows: readonly Row[]; newCount: number }>) {
  return (
    <div className="hidden min-w-0 flex-col border-r border-ru-n-200 bg-white sm:flex">
      <div className="flex items-center justify-between border-b border-ru-n-100 px-3.5 py-2.5">
        <span className="font-display text-[14px] font-bold text-ru-n-700">New</span>
        <span className="text-[11.5px] text-ru-n-400 tabular-nums">{newCount} conversations</span>
      </div>

      <div className="flex-1 overflow-hidden">
        {rows.slice(0, 5).map((row) => (
          <div
            key={row.id}
            className={`flex animate-ru-msg-in gap-2.5 border-b border-l-3 border-b-ru-n-100 px-3 py-2.5 motion-reduce:animate-none ${
              row.selected ? "border-l-ru-blue-600 bg-ru-blue-50" : "border-l-transparent"
            }`}
          >
            <span className="relative flex-none self-start">
              <Avatar initials={row.initials} className={row.tone} size="size-8 text-[11.5px]" />
              <ChannelDot channel={row.channel} className="absolute -right-0.5 -bottom-0.5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[12.5px] font-semibold text-ru-n-700">
                  {row.name}
                </span>
                <span className="flex-none text-[10.5px] text-ru-n-400">{row.at}</span>
              </div>
              <div className="truncate text-[11.5px] text-ru-n-600">
                <span className="font-mono text-[10.5px] text-ru-n-400">#{row.number}</span>{" "}
                {row.subject}
              </div>
              <div className="truncate text-[11.5px] text-ru-n-400">{row.preview}</div>
              <div className="mt-1.25 flex items-center gap-1.5">
                <span
                  className={`rounded-full border px-1.5 py-px text-[10px] font-semibold ${STATUS_TONE[row.status]}`}
                >
                  {row.status}
                </span>
                {row.unread && (
                  <span className="rounded-full bg-ru-blue-600 px-1.5 text-[10px] font-semibold text-white tabular-nums">
                    {row.unread}
                  </span>
                )}
                <span className="ml-auto">
                  {row.assignee ? (
                    <Avatar
                      initials={row.assignee}
                      size="size-4.5 text-[8px]"
                      className="bg-ru-blue-800"
                    />
                  ) : (
                    <span className="text-[10px] font-medium text-ru-amber-700">Unassigned</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
