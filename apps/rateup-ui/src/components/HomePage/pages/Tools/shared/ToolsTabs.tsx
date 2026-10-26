import { Link } from "@tanstack/react-router";

import { TOOLS, TOOLS_BASE_PATH, toolPath } from "@/config/tools.ts";
import { cn } from "@/lib/utils.ts";

/** Short labels — the pill row is a single line that scrolls sideways when it overflows. */
const TAB_LABELS: Record<string, string> = {
  "whatsapp-link-generator": "Link generator",
  "whatsapp-qr-code-generator": "QR code",
  "whatsapp-pricing-calculator": "API pricing",
  "rto-loss-calculator": "RTO loss",
  "nps-survey-templates": "NPS templates",
  "shopify-bulk-discount-code-generator": "Bulk discounts",
  "clv-calculator": "CLV",
  "shopify-fee-calculator": "Shopify fees",
  "profit-margin-calculator": "Profit margin",
  "shopify-conversion-rate-calculator": "Conversion rate",
  "shopify-shipping-cost-calculator": "Shipping cost",
  "shopify-profit-calculator": "Monthly profit",
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
      <div className="mx-auto flex w-full max-w-[1240px] items-center gap-2 overflow-x-auto px-6 py-2.5 [scrollbar-width:none] lg:px-8 [&::-webkit-scrollbar]:hidden">
        <Link
          to={TOOLS_BASE_PATH}
          className="mr-1.5 shrink-0 text-[10px] font-extrabold tracking-[0.14em] text-ru-blue-300 uppercase transition-opacity hover:opacity-80"
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
                "shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-bold whitespace-nowrap transition-colors",
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
