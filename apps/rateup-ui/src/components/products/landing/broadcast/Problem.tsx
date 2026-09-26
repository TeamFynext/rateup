import type { ReactNode } from "react";

import ProblemCards from "../shared/ProblemCards";
import { PROBLEMS } from "./content";

const ICONS: Record<(typeof PROBLEMS)[number]["icon"], ReactNode> = {
  list: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  ban: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m5.6 5.6 12.8 12.8" />
    </>
  ),
  report: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
};

export default function Problem() {
  return (
    <ProblemCards
      title="The Business App's broadcast list was never built for a business."
      lead="It works for a handful of friends. It breaks the moment you have a real customer list."
      problems={PROBLEMS.map((problem) => ({ ...problem, icon: ICONS[problem.icon] }))}
    />
  );
}
