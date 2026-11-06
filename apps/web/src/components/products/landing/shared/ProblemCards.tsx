import type { ReactNode } from "react";

import { useReveal } from "@/components/RateupHomePage/shared/home-ui";

import { BAND, Glyph, SectionHead } from "./section";

export interface Problem {
  title: string;
  body: string;
  icon: ReactNode;
}

/** The "Sound familiar?" band: three amber cards naming the pain before the product answers it. */
export default function ProblemCards({
  title,
  lead,
  problems,
}: Readonly<{ title: ReactNode; lead: ReactNode; problems: readonly Problem[] }>) {
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
          title={title}
        >
          {lead}
        </SectionHead>

        <div ref={ref} className="grid gap-4 md:grid-cols-3">
          {problems.map((problem, i) => (
            <div
              key={problem.title}
              style={{ animationDelay: `${i * 110}ms` }}
              className={`flex flex-col gap-3 rounded-2xl border border-ru-n-200 bg-ru-n-50 p-6.5 motion-reduce:animate-none ${
                shown ? "animate-ru-rise" : "opacity-0"
              }`}
            >
              <span className="flex size-10 items-center justify-center rounded-[10px] border border-ru-amber-200 bg-ru-amber-50 text-ru-amber-700">
                <Glyph>{problem.icon}</Glyph>
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
