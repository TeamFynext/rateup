import { Link } from "@tanstack/react-router";

import { TOOLS, TOOL_CATEGORIES, toolPath } from "@/config/tools.ts";

import { ToolContainer, ToolCta } from "../shared/ToolSections.tsx";

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
              <h2 className="m-0 font-nunito text-[22px] font-extrabold tracking-[-0.02em] text-[#0A0B0A]">
                {category}
              </h2>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <Link
                      key={tool.slug}
                      to={toolPath(tool.slug)}
                      className="flex flex-col rounded-xl border border-[#ECECEA] bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-[#CBD9EA] hover:shadow-[0_8px_24px_rgba(11,31,72,.08)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="flex size-11 items-center justify-center rounded-[10px] bg-[#EEF4FB]">
                          <Icon className="size-5 text-[#1C518E]" />
                        </span>
                        <span className="rounded-full bg-[#F3F7FC] px-2 py-1 text-[11px] font-bold text-[#4A4C49]">
                          {tool.badge}
                        </span>
                      </div>

                      <div className="mt-4 font-nunito text-[17px] font-extrabold text-[#0A0B0A]">
                        {tool.name}
                      </div>
                      <p className="mt-2 flex-1 text-[13.5px] leading-[1.55] text-[#4A4C49]">
                        {tool.description}
                      </p>
                      <div className="mt-4 text-[12.5px] font-bold text-[#1C518E]">Open tool →</div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </ToolContainer>

      <ToolContainer className="pt-16">
        <h2 className="m-0 font-nunito text-[26px] font-extrabold tracking-[-0.02em] text-[#0A0B0A] sm:text-[32px]">
          Why we built these
        </h2>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {PROMISES.map((promise) => (
            <div key={promise.n} className="rounded-xl border border-[#ECECEA] bg-white p-6">
              <div className="bg-[linear-gradient(135deg,#FFD54C,#F8951D)] bg-clip-text font-nunito text-[32px] leading-none font-black text-transparent">
                {promise.n}
              </div>
              <div className="mt-2.5 mb-1.5 font-nunito text-[16px] font-extrabold text-[#0A0B0A]">
                {promise.title}
              </div>
              <p className="m-0 text-[13.5px] leading-[1.55] text-[#4A4C49]">{promise.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 max-w-[700px] text-[14px] leading-[1.6] text-[#666864]">
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
