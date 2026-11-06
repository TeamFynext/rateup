/**
 * Colours for "bad → good" answer scales (ratings, smileys, NPS, yes/no).
 *
 * Mirrors rateup-ui `src/components/common/sentimentScale.ts`: the positive end is the brand
 * navy, not green — green is kept for success states only. Hexes are the web's `--chart-1`,
 * `--chart-3`, `--muted-foreground`, `--chart-5` and `--destructive` in each theme.
 */
export type Sentiment = {
  best: string;
  good: string;
  neutral: string;
  poor: string;
  worst: string;
};

const light: Sentiment = {
  best: "#1C518E",
  good: "#5A8CC6",
  neutral: "#6B7480",
  poor: "#F8951D",
  worst: "#C4342C",
};

const dark: Sentiment = {
  best: "#90B2DC",
  good: "#2E68A8",
  neutral: "#A0A6AF",
  poor: "#F0B45C",
  worst: "#F08078",
};

export const getSentiment = (isDark: boolean): Sentiment => (isDark ? dark : light);

/** Index 0 is the worst answer. */
export const scale5 = (s: Sentiment) => [s.worst, s.poor, s.neutral, s.good, s.best];

export const scale10 = (s: Sentiment) => [
  s.worst,
  s.worst,
  s.poor,
  s.poor,
  s.neutral,
  s.neutral,
  s.good,
  s.good,
  s.best,
  s.best,
];

export const npsColors = (s: Sentiment) => ({
  promoter: s.best,
  passive: s.poor,
  detractor: s.worst,
});

/** `#RRGGBB` + alpha → `#RRGGBBAA`, for a wash behind a label printed in that colour. */
export const wash = (hex: string, alpha = 0.12) =>
  `${hex}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0")}`;
