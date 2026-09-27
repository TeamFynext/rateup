import type { ReactNode } from "react";

import { SectionHead } from "./section";

/** The band straight after a `NavyHero`: a rounded sheet riding up over the navy. */
export default function ShowcaseSheet({
  eyebrow,
  icon,
  title,
  lead,
  caption = "Illustrative conversation.",
  children,
}: Readonly<{
  eyebrow: string;
  icon: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  caption?: ReactNode;
  children: ReactNode;
}>) {
  return (
    <section className="relative -mt-8 overflow-x-clip rounded-t-4xl bg-ru-n-25 px-5 pt-12 pb-14 sm:-mt-10 sm:rounded-t-[2.5rem] sm:pt-20 sm:pb-24">
      <div className="mx-auto max-w-300">
        <SectionHead eyebrow={eyebrow} icon={icon} title={title}>
          {lead}
        </SectionHead>
        {children}
        {caption && <p className="mt-4 text-center text-[13px] text-ru-n-400">{caption}</p>}
      </div>
    </section>
  );
}
