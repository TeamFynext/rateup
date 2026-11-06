import type { ReactNode } from "react";

import ProblemCards from "../shared/ProblemCards";
import { PROBLEMS } from "./content";

const ICONS: Record<(typeof PROBLEMS)[number]["icon"], ReactNode> = {
  comment: (
    <>
      <path d="M20.5 12c0 4-3.8 7-8.5 7-1 0-2-.15-2.9-.4L4 20l1.3-3.6A6.9 6.9 0 0 1 3.5 12c0-4 3.8-7 8.5-7s8.5 3 8.5 7Z" />
      <path d="M10.2 9.6a1.9 1.9 0 1 1 2.6 1.8c-.5.2-.8.6-.8 1.1v.4M12 15.2v.1" />
    </>
  ),
  leave: (
    <>
      <path d="M14 4h5.5A1.5 1.5 0 0 1 21 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14" />
      <path d="M10 16l-4-4 4-4M6 12h10" />
    </>
  ),
  scatter: (
    <>
      <rect x="3.5" y="4" width="7" height="6" rx="1.5" />
      <rect x="13.5" y="6.5" width="7" height="6" rx="1.5" />
      <rect x="6" y="14" width="7" height="6" rx="1.5" />
    </>
  ),
};

export default function Problem() {
  return (
    <ProblemCards
      title="The sale starts in a message."
      lead="Customers already ask to buy in your DMs and on WhatsApp. Most of them are lost between the question and the payment."
      problems={PROBLEMS.map((problem) => ({ ...problem, icon: ICONS[problem.icon] }))}
    />
  );
}
