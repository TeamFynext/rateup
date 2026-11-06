import type { ReactNode } from "react";

import ProblemCards from "../shared/ProblemCards";
import { PROBLEMS } from "./content";

const ICONS: Record<(typeof PROBLEMS)[number]["icon"], ReactNode> = {
  buried: (
    <>
      <path d="M20.5 12c0 4-3.8 7-8.5 7-1 0-2-.15-2.9-.4L4 20l1.3-3.6A6.9 6.9 0 0 1 3.5 12c0-4 3.8-7 8.5-7s8.5 3 8.5 7Z" />
      <path d="M9 11h6M9 14h3" />
    </>
  ),
  next: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  sheet: (
    <>
      <rect x="3.5" y="4" width="17" height="16" rx="2" />
      <path d="M3.5 9.5h17M3.5 15h17M9.5 4v16" />
    </>
  ),
};

export default function Problem() {
  return (
    <ProblemCards
      title="Enquiries don't wait in a chat list."
      lead="The sale is decided in the conversation — but the conversation is the worst place to keep track of it."
      problems={PROBLEMS.map((problem) => ({ ...problem, icon: ICONS[problem.icon] }))}
    />
  );
}
