import type { ReactNode } from "react";

import ProblemCards from "../shared/ProblemCards";
import { PROBLEMS } from "./content";

const ICONS: Record<(typeof PROBLEMS)[number]["icon"], ReactNode> = {
  card: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M7 10h.01M11 10h.01M15 10h.01M7 14h.01M11 14h.01" />
    </>
  ),
  app: (
    <>
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path d="M12 7v6M9.5 10.5 12 13l2.5-2.5M10 17.5h4" />
    </>
  ),
  quiet: (
    <>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20a7 7 0 0 1 14 0" />
      <path d="M17 4h4M19 2v4" />
    </>
  ),
};

export default function Problem() {
  return (
    <ProblemCards
      title="Your regulars deserve better than a stamp card."
      lead="Most loyalty schemes ask customers to carry something, install something, or remember something. Most customers won't."
      problems={PROBLEMS.map((problem) => ({ ...problem, icon: ICONS[problem.icon] }))}
    />
  );
}
