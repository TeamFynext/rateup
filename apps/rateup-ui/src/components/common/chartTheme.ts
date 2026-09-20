import type { ChartConfig } from "@/components/ui/chart.tsx";

/**
 * Chart colors, taken from the theme's own `--chart-*` tokens rather than hex.
 *
 * The tokens are a **sequential** ramp — five steps of one blue (OKLCH hues 251–265) — not
 * a categorical palette. Run through the data-viz validator as a categorical set they
 * fail outright: `--chart-3` and `--chart-4` sit ΔE 5.9 apart in normal vision against a
 * floor of 15, and `--chart-1` is 1.77:1 against the surface. No pair of them clears every
 * check, so **nothing here plots two series against each other in one frame**. The one
 * place that needed a comparison — organisations against users — is drawn as small
 * multiples instead, each its own single-series chart.
 *
 * `--chart-2` is the single-series default: it clears the lightness band, the chroma floor
 * and 3:1 contrast on both surfaces.
 */

/** A single-series chart: one hue, and the title names it, so no legend. */
export const singleSeriesConfig = (label: string): ChartConfig => ({
  value: { label, color: "var(--chart-2)" },
});

/**
 * Checkout outcomes carry meaning rather than identity, so a failure takes the theme's
 * `destructive` token. The axis labels every bar, so color never carries the meaning
 * alone — which is the mitigation for a status hue that is not distinguishable by hue.
 */
export const outcomeConfig: ChartConfig = {
  value: { label: "Orders", color: "var(--chart-2)" },
};

export function outcomeColor(status: string) {
  return status === "FAILED" ? "var(--destructive)" : "var(--chart-2)";
}

/**
 * Delivered against failed. Failure takes `destructive`, not a second ramp step, so the
 * pair stays distinguishable and the red reads as the outcome it is.
 */
export const deliveryConfig = (labels: { delivered: string; failed: string }): ChartConfig => ({
  deliveredMessages: { label: labels.delivered, color: "var(--chart-2)" },
  failedMessages: { label: labels.failed, color: "var(--destructive)" },
});
