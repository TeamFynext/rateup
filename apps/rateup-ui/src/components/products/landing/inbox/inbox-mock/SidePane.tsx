import type { ReactNode } from "react";

import { Avatar } from "@/components/RateupHomePage/shared/mockups/kit";

function Block({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <div className="border-b border-ru-n-100 px-3.5 py-3">
      <div className="mb-2 text-[10.5px] font-semibold tracking-[0.08em] text-ru-n-400 uppercase">
        {title}
      </div>
      {children}
    </div>
  );
}

const chip = "rounded-full border px-2 py-0.5 text-[11px] font-medium";

export default function SidePane() {
  return (
    <div className="hidden min-w-0 flex-col border-l border-ru-n-200 bg-white xl:flex">
      <div className="border-b border-ru-n-100 px-3.5 py-2.5 font-display text-[14px] font-bold text-ru-n-700">
        Ticket #2041
      </div>

      <Block title="Assignment">
        <div className="flex items-center gap-2">
          <Avatar initials="RK" size="size-7 text-[10.5px]" />
          <div className="min-w-0">
            <div className="truncate text-[12.5px] font-semibold text-ru-n-700">Rohan K.</div>
            <div className="text-[11px] text-ru-n-400">Orders team</div>
          </div>
        </div>
      </Block>

      <Block title="Lifecycle stage">
        <span className={`${chip} border-ru-amber-200 bg-ru-amber-50 text-ru-amber-700`}>
          Hot lead
        </span>
      </Block>

      <Block title="Conversation tags">
        <div className="flex flex-wrap gap-1.5">
          <span className={`${chip} border-ru-n-200 bg-ru-n-50 text-ru-n-600`}>#order</span>
          <span className={`${chip} border-ru-n-200 bg-ru-n-50 text-ru-n-600`}>#delivery</span>
        </div>
      </Block>

      <Block title="Contact labels">
        <span className={`${chip} border-ru-blue-200 bg-ru-blue-50 text-ru-blue-600`}>VIP</span>
      </Block>

      <Block title="Earlier tickets">
        <div className="text-[11.5px]/[1.5] text-ru-n-500">
          #1884 · Resolved
          <br />
          #1602 · Answered
        </div>
      </Block>
    </div>
  );
}
