import { Link } from "@tanstack/react-router";

import { NPS_TEMPLATES, type NpsTemplate } from "@/config/npsTemplates.ts";
import { toolPath } from "@/config/tools.ts";

import { CopyButton, ToolCard, ToolContainer, ToolCta } from "../shared/ToolSections.tsx";

const SLUG = "nps-survey-templates";

const FOLLOW_UPS = [
  {
    key: "promoter" as const,
    band: "9–10 · Promoters",
    tone: "border-[#BFE9CF] bg-[#E7F9EE]",
    intent: "Capture the enthusiasm while it is fresh — this answer becomes your next review.",
  },
  {
    key: "passive" as const,
    band: "7–8 · Passives",
    tone: "border-[#F5DFB0] bg-[#FFF6E6]",
    intent: "Find the one missing thing. Passive answers are the most actionable feedback you get.",
  },
  {
    key: "detractor" as const,
    band: "0–6 · Detractors",
    tone: "border-[#F1C9C7] bg-[#FDECEB]",
    intent: "Diagnose and recover. Route this to a person today, not to a report.",
  },
];

export default function NpsTemplateDetail({ template }: Readonly<{ template: NpsTemplate }>) {
  const fullText = [
    template.ratingQuestion,
    "",
    `If 9–10: ${template.followUps.promoter}`,
    `If 7–8: ${template.followUps.passive}`,
    `If 0–6: ${template.followUps.detractor}`,
  ].join("\n");

  const siblings = NPS_TEMPLATES.filter(
    (item) => item.sector === template.sector && item.slug !== template.slug,
  ).slice(0, 4);

  return (
    <>
      <ToolContainer className="pt-7">
        <div className="grid items-start gap-5 lg:grid-cols-[1.15fr_1fr]">
          <ToolCard>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-accent px-2 py-1 text-[11px] font-extrabold tracking-[0.1em] text-primary uppercase">
                {template.sector}
              </span>
              <span className="rounded-full border border-border px-2 py-1 text-[11px] font-bold text-muted-foreground">
                {template.benchmark}
              </span>
            </div>

            <div className="mt-5 text-[11px] font-extrabold tracking-[0.12em] text-muted-foreground uppercase">
              The rating question
            </div>
            <blockquote className="mt-3 rounded-[14px] border border-border bg-accent p-5 text-[16px] leading-[1.55] font-medium text-foreground">
              {template.ratingQuestion}
            </blockquote>
            <p className="mt-2 text-[11.5px] text-muted-foreground">
              Replace <span className="font-mono">{"{brand}"}</span> with your business name.
            </p>

            <div className="mt-7 text-[11px] font-extrabold tracking-[0.12em] text-muted-foreground uppercase">
              Follow-ups by score
            </div>
            <div className="mt-3 grid gap-3.5">
              {FOLLOW_UPS.map((group) => (
                <div key={group.key} className={`rounded-[14px] border p-5 ${group.tone}`}>
                  <div className="text-[11px] font-extrabold tracking-[0.08em] text-muted-foreground uppercase">
                    {group.band}
                  </div>
                  <p className="mt-2 text-[14px] leading-[1.55] font-medium text-foreground">
                    {template.followUps[group.key]}
                  </p>
                  <p className="mt-2 text-[12px] leading-[1.5] text-muted-foreground">
                    {group.intent}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <CopyButton value={fullText} label="Copy full template" variant="outline" />
            </div>
          </ToolCard>

          <div className="flex flex-col gap-3.5">
            <ToolCard title="When to send it">
              <p className="-mt-2 text-[14px] leading-[1.6] text-muted-foreground">
                {template.timing}
              </p>
            </ToolCard>

            <ToolCard title="Why this wording">
              <p className="-mt-2 text-[14px] leading-[1.6] text-muted-foreground">
                {template.note}
              </p>
            </ToolCard>

            {siblings.length > 0 ? (
              <ToolCard title={`More ${template.sector.toLowerCase()} templates`}>
                <div className="-mt-1 grid gap-2">
                  {siblings.map((sibling) => (
                    <Link
                      key={sibling.slug}
                      to="/tools/nps-survey-templates/$slug"
                      params={{ slug: sibling.slug }}
                      className="rounded-lg border border-border px-4 py-3 text-[13.5px] font-bold text-foreground transition-colors hover:border-border hover:bg-accent"
                    >
                      {sibling.industry}
                    </Link>
                  ))}
                </div>
                <Link
                  to={toolPath(SLUG)}
                  className="mt-3.5 inline-block text-[12.5px] font-bold text-primary"
                >
                  Browse all {NPS_TEMPLATES.length} templates →
                </Link>
              </ToolCard>
            ) : null}
          </div>
        </div>
      </ToolContainer>

      <ToolCta
        title={`Send this ${template.industry.toLowerCase()} survey on WhatsApp`}
        description="Copying the wording is the easy part. RateUp delivers it as a native WhatsApp flow, branches the follow-up automatically by score, and routes detractors to your team before they leave a public review."
      />
    </>
  );
}
