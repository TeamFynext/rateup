/**
 * Colours for "bad → good" answer scales (ratings, smileys, NPS, yes/no).
 *
 * The positive end is the brand navy, not green: green is kept for success states only.
 * Like `chartTheme.ts`'s outcome colours, the hue carries a judgement, failure is
 * `destructive`, and every place that uses these also prints the label, so colour is never
 * the only carrier. CSS vars, so the scale follows dark mode.
 */
export const SENTIMENT = {
  best: "var(--chart-1)",
  good: "var(--chart-3)",
  neutral: "var(--muted-foreground)",
  poor: "var(--chart-5)",
  worst: "var(--destructive)",
} as const;

/** Index 0 is the worst answer. */
export const SCALE_5 = [
  SENTIMENT.worst,
  SENTIMENT.poor,
  SENTIMENT.neutral,
  SENTIMENT.good,
  SENTIMENT.best,
] as const;

export const SCALE_10 = [
  SENTIMENT.worst,
  SENTIMENT.worst,
  SENTIMENT.poor,
  SENTIMENT.poor,
  SENTIMENT.neutral,
  SENTIMENT.neutral,
  SENTIMENT.good,
  SENTIMENT.good,
  SENTIMENT.best,
  SENTIMENT.best,
] as const;

export const NPS_COLORS = {
  promoter: SENTIMENT.best,
  passive: SENTIMENT.poor,
  detractor: SENTIMENT.worst,
} as const;

export const BINARY_COLORS = { positive: SENTIMENT.best, negative: SENTIMENT.worst } as const;

/** A translucent wash of a scale colour, for chips that print the label in that colour. */
export const tint = (color: string, percent = 12) =>
  `color-mix(in oklch, ${color} ${percent}%, transparent)`;
