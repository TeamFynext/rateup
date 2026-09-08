import { IconChevronRight } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils.ts";

import { LOYALTY_PATHS } from "../paths.ts";
import type { SectionKey } from "./programSummary.ts";

const SECTIONS: readonly SectionKey[] = ["basics", "earning", "tiers", "rewards", "messages"];

/**
 * One section open: a breadcrumb back to the summary, a rail to jump to any other
 * section (each saves on its own), and the step form itself.
 */
export function ProgramSectionEditor({
  section,
  children,
}: Readonly<{ section: SectionKey; children: React.ReactNode }>) {
  const { t } = useTranslation();
  const labels: Record<SectionKey, string> = {
    basics: t("Basics"),
    earning: t("Earning"),
    tiers: t("Tiers"),
    rewards: t("Rewards"),
    messages: t("Messages"),
  };

  return (
    <div className="flex flex-col gap-5">
      <nav aria-label={t("Program sections")} className="flex flex-wrap items-center gap-1 text-sm">
        <Link
          to={LOYALTY_PATHS.program}
          className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {t("All sections")}
        </Link>
        <IconChevronRight size={14} className="text-muted-foreground/60" />
        <span className="text-muted-foreground">{t("Program")}</span>
        <IconChevronRight size={14} className="text-muted-foreground/60" />
        <span className="font-medium text-foreground">{labels[section]}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[180px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-1 lg:sticky lg:top-4 lg:self-start">
          {SECTIONS.map((key) => (
            <Link
              key={key}
              to={LOYALTY_PATHS.program}
              search={{ section: key }}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm",
                key === section
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {labels[key]}
            </Link>
          ))}
          <p className="mt-2 px-3 text-xs text-muted-foreground">
            {t("Jump anywhere — each section saves on its own.")}
          </p>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
