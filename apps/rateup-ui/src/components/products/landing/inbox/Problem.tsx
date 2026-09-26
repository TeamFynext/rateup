import type { ReactNode } from "react";

import ProblemCards from "../shared/ProblemCards";
import { PROBLEMS } from "./content";

const ICONS: Record<(typeof PROBLEMS)[number]["icon"], ReactNode> = {
  owner: (
    <>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20a7 7 0 0 1 14 0" />
      <path d="m17 4 3 3M20 4l-3 3" />
    </>
  ),
  record: (
    <>
      <path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20V3.5Z" />
      <path d="M14 3.5v4h4M10 13h5M10 16.5h3" />
    </>
  ),
  numbers: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
};

export default function Problem() {
  return (
    <ProblemCards
      title="A shared login is not a support system."
      lead="Three people on one WhatsApp number, DMs nobody owns, and no way to show what got resolved."
      problems={PROBLEMS.map((problem) => ({ ...problem, icon: ICONS[problem.icon] }))}
    />
  );
}
