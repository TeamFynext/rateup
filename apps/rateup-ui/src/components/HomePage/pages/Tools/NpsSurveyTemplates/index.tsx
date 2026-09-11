import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { NPS_SECTORS, NPS_TEMPLATES, calculateNps, npsVerdict } from "@/config/npsTemplates.ts";
import { getToolBySlug } from "@/config/tools.ts";
import { cn } from "@/lib/utils.ts";

import {
  FaqSection,
  Field,
  HowItWorks,
  RelatedTools,
  TextControl,
  ToolCard,
  ToolContainer,
  ToolCta,
} from "../shared/ToolSections.tsx";

const SLUG = "nps-survey-templates";

export default function NpsSurveyTemplates() {
  const tool = getToolBySlug(SLUG);
  const [sector, setSector] = useState<string>("All");

  const templates = useMemo(
    () =>
      sector === "All"
        ? NPS_TEMPLATES
        : NPS_TEMPLATES.filter((template) => template.sector === sector),
    [sector],
  );

  return (
    <>
      <ToolContainer className="pt-7">
        <NpsCalculator />

        <div className="mt-11 flex flex-wrap items-center justify-between gap-4">
          <h2 className="m-0 font-nunito text-[26px] font-extrabold tracking-[-0.02em] text-foreground sm:text-[32px]">
            {NPS_TEMPLATES.length} templates by industry
          </h2>
          <div className="flex flex-wrap gap-2">
            {["All", ...NPS_SECTORS].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSector(option)}
                aria-pressed={sector === option}
                className={cn(
                  "cursor-pointer rounded-full border border-border px-3 py-1.5 text-[12.5px] font-bold transition-colors",
                  sector === option
                    ? "border-primary bg-primary text-white"
                    : "bg-card text-muted-foreground hover:border-border",
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Link
              key={template.slug}
              to="/tools/nps-survey-templates/$slug"
              params={{ slug: template.slug }}
              className="block rounded-xl border border-border bg-card p-[22px] transition-colors hover:border-border"
            >
              <div className="flex items-center justify-between gap-2.5">
                <span className="rounded-full bg-accent px-2 py-1 text-[11px] font-extrabold tracking-[0.1em] text-primary uppercase">
                  {template.sector}
                </span>
                <span className="text-right text-[11.5px] text-muted-foreground">
                  {template.timing}
                </span>
              </div>
              <div className="mt-3.5 mb-2 font-nunito text-[16px] leading-[1.3] font-extrabold text-foreground">
                {template.industry}
              </div>
              <p className="m-0 text-[13px] leading-[1.5] text-muted-foreground">
                {template.ratingQuestion}
              </p>
              <div className="mt-3.5 text-[12.5px] font-bold text-primary">Use this template →</div>
            </Link>
          ))}
        </div>
      </ToolContainer>

      {tool ? <HowItWorks steps={tool.steps} /> : null}
      {tool ? <FaqSection faqs={tool.faqs} /> : null}
      <RelatedTools slug={SLUG} />
      {tool ? (
        <ToolCta
          title={tool.cta}
          description="A template is only half the job — the response rate comes from the channel. RateUp sends these as native WhatsApp flows, flags detractors for your team to follow up, and pushes promoters straight to a review request."
        />
      ) : null}
    </>
  );
}

/** Inline NPS score calculator that sits above the template library. */
function NpsCalculator() {
  const [promoters, setPromoters] = useState(120);
  const [passives, setPassives] = useState(60);
  const [detractors, setDetractors] = useState(20);

  const result = calculateNps(promoters, passives, detractors);
  const verdict = result ? npsVerdict(result.score) : null;

  const parse = (raw: string) => {
    const parsed = Number(raw.replace(/[^\d]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  return (
    <ToolCard>
      <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <div className="font-nunito text-[19px] font-extrabold text-foreground">
            Score your responses
          </div>
          <p className="mt-1.5 mb-4.5 text-[13px] text-muted-foreground">
            Promoters 9–10 · Passives 7–8 · Detractors 0–6
          </p>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Promoters" htmlFor="nps-p">
              <TextControl
                id="nps-p"
                inputMode="numeric"
                value={promoters}
                onChange={(event) => setPromoters(parse(event.target.value))}
              />
            </Field>
            <Field label="Passives" htmlFor="nps-pa">
              <TextControl
                id="nps-pa"
                inputMode="numeric"
                value={passives}
                onChange={(event) => setPassives(parse(event.target.value))}
              />
            </Field>
            <Field label="Detractors" htmlFor="nps-d">
              <TextControl
                id="nps-d"
                inputMode="numeric"
                value={detractors}
                onChange={(event) => setDetractors(parse(event.target.value))}
              />
            </Field>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 rounded-[14px] bg-accent px-6 py-5">
          {result && verdict ? (
            <>
              <div>
                <div className="text-[11px] font-extrabold tracking-[0.12em] text-primary uppercase">
                  Your NPS
                </div>
                <div className="font-nunito text-[48px] leading-none font-black tracking-[-0.02em] text-primary sm:text-[60px]">
                  {result.score}
                </div>
              </div>
              <div className="border-l border-border pl-6">
                <div className="text-[14px] font-extrabold text-foreground">{verdict.label}</div>
                <p className="mt-1 text-[12.5px] leading-[1.5] text-muted-foreground">
                  {result.promoterShare}% promoters − {result.detractorShare}% detractors
                </p>
                <div className="mt-2 text-[12px] text-muted-foreground">
                  {result.total.toLocaleString("en-IN")} responses
                </div>
              </div>
            </>
          ) : (
            <p className="text-[13px] text-muted-foreground">Enter at least one response.</p>
          )}
        </div>
      </div>
    </ToolCard>
  );
}
