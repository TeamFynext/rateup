import type { ReactNode } from "react";

import { useReveal } from "@/components/RateupHomePage/shared/home-ui";
import { Inset } from "@/components/RateupHomePage/shared/mockups/kit";

/** The rise each row of a feature mini-mock makes when its card scrolls into view. */
export const rowReveal = (shown: boolean) =>
  `transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none ${
    shown ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0"
  }`;

export const rowDelay = (i: number) => ({ transitionDelay: `${i * 160}ms` });

/** A list of label/value rows — the commonest shape of sample UI on a feature card. */
export function RowsMini({
  items,
}: Readonly<{ items: readonly { key: string; left: ReactNode; right: ReactNode }[] }>) {
  const [ref, shown] = useReveal<HTMLDivElement>();

  return (
    <Inset className="p-2.5">
      <div ref={ref} className="flex flex-col gap-1.5">
        {items.map((item, i) => (
          <div
            key={item.key}
            style={rowDelay(i)}
            className={`flex items-center justify-between gap-3 rounded-lg border border-ru-n-200 bg-white px-2.75 py-2 ${rowReveal(shown)}`}
          >
            <span className="min-w-0 truncate text-[12.5px] font-medium text-ru-n-700">
              {item.left}
            </span>
            <span className="flex-none text-[11.5px] text-ru-n-400">{item.right}</span>
          </div>
        ))}
      </div>
    </Inset>
  );
}
