import {
  IconBrandWhatsapp,
  IconCalculator,
  IconMessage2Star,
  IconQrcode,
  IconTruckReturn,
  type Icon,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

import { TOOLS, TOOL_CATEGORIES, toolPath } from "@/config/tools.ts";

import { ToolContainer, ToolCta } from "../shared/ToolSections.tsx";

// Kept out of `config/tools.ts`, which the tool routes' `head` reads from the client entry.
const TOOL_ICONS: Record<string, Icon> = {
  "whatsapp-link-generator": IconBrandWhatsapp,
  "whatsapp-qr-code-generator": IconQrcode,
  "rto-loss-calculator": IconTruckReturn,
  "nps-survey-templates": IconMessage2Star,
};

const PROMISES = [
  {
    n: "01",
    title: "No signup, ever",
    body: "No email wall, no trial, no account. Use the tool, take the result, leave.",
  },
  {
    n: "02",
    title: "Runs in your browser",
    body: "Nothing you type is sent to a server or stored. The maths happens on your device.",
  },
  {
    n: "03",
    title: "Built for Indian businesses",
    body: "Rupee-first calculators and WhatsApp-first workflows, because that is where our customers are.",
  },
];

export default function ToolsIndex() {
  return (
    <>
      <ToolContainer className="pt-7">
        {TOOL_CATEGORIES.map((category, categoryIndex) => {
          const tools = TOOLS.filter((tool) => tool.category === category);
          if (tools.length === 0) return null;

          return (
            <section key={category} className={categoryIndex === 0 ? "" : "mt-11"}>
              <h2 className="m-0 font-display text-[22px] font-extrabold tracking-[-0.02em] text-foreground">
                {category}
              </h2>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tools.map((tool) => {
                  const Icon = TOOL_ICONS[tool.slug] ?? IconCalculator;
                  return (
                    <Link
                      key={tool.slug}
                      to={toolPath(tool.slug)}
                      className="flex flex-col rounded-xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-border hover:shadow-[0_8px_24px_rgba(11,31,72,.08)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="flex size-11 items-center justify-center rounded-[10px] bg-accent">
                          <Icon className="size-5 text-primary" />
                        </span>
                        <span className="rounded-full bg-accent px-2 py-1 text-[11px] font-bold text-muted-foreground">
                          {tool.badge}
                        </span>
                      </div>

                      <div className="mt-4 font-display text-[17px] font-extrabold text-foreground">
                        {tool.name}
                      </div>
                      <p className="mt-2 flex-1 text-[13.5px] leading-[1.55] text-muted-foreground">
                        {tool.description}
                      </p>
                      <div className="mt-4 text-[12.5px] font-bold text-primary">Open tool →</div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </ToolContainer>

      <ToolContainer className="pt-16">
        <h2 className="m-0 font-display text-[26px] font-extrabold tracking-[-0.02em] text-foreground sm:text-[32px]">
          Why we built these
        </h2>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {PROMISES.map((promise) => (
            <div key={promise.n} className="rounded-xl border border-border bg-card p-6">
              <div className="bg-ru-star bg-clip-text font-display text-[32px] leading-none font-black text-transparent">
                {promise.n}
              </div>
              <div className="mt-2.5 mb-1.5 font-display text-[16px] font-extrabold text-foreground">
                {promise.title}
              </div>
              <p className="m-0 text-[13.5px] leading-[1.55] text-muted-foreground">
                {promise.body}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-5 max-w-[700px] text-[14px] leading-[1.6] text-muted-foreground">
          We build customer engagement software for WhatsApp. These tools solve the small problems
          around that work — generating a link, pricing a campaign, costing your returns. If they
          are useful, you will know where to find us when the bigger problem shows up.
        </p>
      </ToolContainer>

      <ToolCta
        title="When a tool stops being enough"
        description="A link needs an inbox behind it. A survey needs somewhere to send it. A QR code you have already printed needs to stay changeable. RateUp is the platform these tools point at — WhatsApp messaging, automation, feedback and loyalty in one place."
      />
    </>
  );
}
