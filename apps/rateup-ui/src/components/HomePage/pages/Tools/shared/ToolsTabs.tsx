import { Link } from "@tanstack/react-router";

import { TOOLS, TOOLS_BASE_PATH, toolPath } from "@/config/tools.ts";
import { cn } from "@/lib/utils.ts";

/** Short labels — the pill row has to stay on one line at 1240px. */
const TAB_LABELS: Record<string, string> = {
  "whatsapp-link-generator": "Link generator",
  "whatsapp-qr-code-generator": "QR code",
  "whatsapp-pricing-calculator": "API pricing",
  "rto-loss-calculator": "RTO loss",
  "nps-survey-templates": "NPS templates",
};

/**
 * The navy pill bar above the navbar on every tools page. It is the cluster's internal
 * navigation — every tool links to every other one, which is what makes the set rank
 * together rather than as orphan pages.
 *
 * `Layout` pins this through its `subheader` slot. It must not be sticky itself: two sticky
 * bars both anchored to `top: 0` pin on the same line, and this one covered the navbar.
 */
export default function ToolsTabs({ activeSlug }: Readonly<{ activeSlug?: string }>) {
  return (
    <div className="bg-ru-blue-900">
      <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-center gap-2 px-6 py-2.5 lg:px-8">
        <Link
          to={TOOLS_BASE_PATH}
          className="mr-1.5 text-[10px] font-extrabold tracking-[0.14em] text-ru-blue-300 uppercase transition-opacity hover:opacity-80"
        >
          Tools
        </Link>

        {TOOLS.map((tool) => {
          const isActive = tool.slug === activeSlug;
          return (
            <Link
              key={tool.slug}
              to={toolPath(tool.slug)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "rounded-full px-3 py-1.5 text-[12.5px] font-bold transition-colors",
                isActive
                  ? "bg-ru-blue-300 text-[#04203D]"
                  : "bg-white/[0.09] text-white/80 hover:bg-white/[0.16] hover:text-white",
              )}
            >
              {TAB_LABELS[tool.slug] ?? tool.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
