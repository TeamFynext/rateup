// Extracted verbatim from `LifecyclePage.tsx`. Behaviour is unchanged.

import { useTranslation } from "react-i18next";

import { Card, CardContent } from "@/components/ui/card";

import { getStageToneStyle } from "./shared.tsx";
import type { UILifecycleStage } from "./shared.tsx";

export function FunnelVisualization({
  stages,
  totalContacts,
  getPercentage,
}: Readonly<{
  stages: UILifecycleStage[];
  totalContacts: number;
  getPercentage: (count: number) => number;
}>) {
  const { t } = useTranslation("contacts.lifecycle");
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-foreground">
            {t("Customer Journey Funnel")}
          </h2>
          <p className="text-[11px] font-medium text-muted-foreground">
            {t("Visualize how contacts progress through your customer journey")}
          </p>
        </div>

        <div className="hidden items-center gap-4 rounded-xl border border-border bg-card px-3 py-1 text-[10px] font-bold text-muted-foreground sm:flex">
          <div className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-primary" />
            <span>{t("Total Funnel Depth: {count}", { count: totalContacts })}</span>
          </div>
          <div className="h-3 w-px bg-border" />
          <div className="uppercase tracking-widest text-primary">{t("Live Flow Sync")}</div>
        </div>
      </div>

      <Card>
        <CardContent>
          <div className="relative space-y-6">
            <div className="absolute bottom-4 left-5 top-4 hidden w-0.5 border-l-2 border-dashed border-border md:block" />

            {stages.map((stage, index) => {
              const pct = getPercentage(stage.count);

              const width = `${Math.max(55, 100 - index * 15)}%`;

              return (
                <div
                  key={stage.id}
                  className="group relative z-10 flex flex-col gap-4 md:flex-row md:items-center"
                >
                  <div className="hidden w-10 shrink-0 items-center justify-center md:flex">
                    <div className="flex size-6 items-center justify-center rounded-full border-2 border-border bg-muted text-[10px] font-black text-muted-foreground transition-all group-hover:border-primary group-hover:text-primary">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                  </div>

                  <div className="w-28 shrink-0">
                    <span className="text-[12px] font-black tracking-tight text-foreground">
                      {stage.name}
                    </span>
                  </div>

                  <div className="relative flex min-h-12 flex-1 items-center">
                    <div
                      className="relative flex h-12 items-center justify-between overflow-hidden rounded-xl border border-border bg-muted/40 px-4 text-foreground shadow-sm transition-all duration-300 hover:translate-x-1"
                      style={{ width }}
                    >
                      <div
                        className="absolute inset-y-0 left-0 bg-background/40 backdrop-blur-[1px] transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                      <div className="relative z-10 flex items-center gap-2">
                        <div
                          className="size-2 rounded-full"
                          style={getStageToneStyle(stage.color)}
                        />
                        <span className="text-[12px] font-black tracking-tight">
                          {stage.count} contacts
                        </span>
                      </div>
                      <div className="relative z-10 flex items-center gap-3">
                        <span className="rounded-md border border-border bg-background/80 px-2 py-0.5 text-[11px] font-black text-foreground shadow-sm">
                          {pct}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex w-full shrink-0 items-center md:w-32 md:justify-end">
                    {/* {previousStage ? (
                      <div className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/40 px-3 py-1 text-[10px] font-bold text-muted-foreground md:w-auto">
                        <span
                          className={
                            dropoffPercent > 0
                              ? "text-destructive"
                              : "text-muted-foreground"
                          }
                        >
                          {dropoffPercent > 0
                            ? `↓ ${dropoffPercent}% Drop`
                            : "→ No Drop"}
                        </span>
                      </div>
                    ) : (
                      <div className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-extrabold text-primary md:w-auto">
                        <span>🎯 Source</span>
                      </div>
                    )} */}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
