import type { ReactNode } from "react";

import { useReveal } from "@/components/RateupHomePage/shared/home-ui";

import { PROBLEMS } from "./content";
import { BAND, Glyph, SectionHead } from "./parts";

const ICONS: Record<(typeof PROBLEMS)[number]["icon"], ReactNode> = {
  owner: (
    <>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20a7 7 0 0 1 14 0" />
      <path d="m17 4 3 3M20 4l-3 3" />
    </>
  ),
  record: (
    <>
      <path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20V3.5Z" />
      <path d="M14 3.5v4h4M10 13h5M10 16.5h3" />
    </>
  ),
  numbers: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
};

export default function Problem() {
  const [ref, shown] = useReveal<HTMLDivElement>(0.2);

  return (
    <section className="bg-white">
      <div className={BAND}>
        <SectionHead
          eyebrow="Sound familiar?"
          icon={
            <>
              <path d="M12 3 2.5 20h19L12 3Z" />
              <path d="M12 10v4M12 17.2v.1" />
            </>
          }
          title="A shared login is not a support system."
        >
          Three people on one WhatsApp number, DMs nobody owns, and no way to show what got
          resolved.
        </SectionHead>

        <div ref={ref} className="grid gap-4 md:grid-cols-3">
          {PROBLEMS.map((problem, i) => (
            <div
              key={problem.title}
              style={{ animationDelay: `${i * 110}ms` }}
              className={`flex flex-col gap-3 rounded-2xl border border-ru-n-200 bg-ru-n-50 p-6.5 motion-reduce:animate-none ${
                shown ? "animate-ru-rise" : "opacity-0"
              }`}
            >
              <span className="flex size-10 items-center justify-center rounded-[10px] border border-ru-amber-200 bg-ru-amber-50 text-ru-amber-700">
                <Glyph>{ICONS[problem.icon]}</Glyph>
              </span>
              <h3 className="font-display text-[19px] font-bold tracking-[-0.018em] text-ru-n-700">
                {problem.title}
              </h3>
              <p className="text-[15.5px]/[1.55] text-ru-n-500">{problem.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
