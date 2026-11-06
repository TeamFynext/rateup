import type { ReactNode } from "react";

import ProblemCards from "../shared/ProblemCards";
import { PROBLEMS } from "./content";

const ICONS: Record<(typeof PROBLEMS)[number]["icon"], ReactNode> = {
  repeat: (
    <path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 0 1-13.7 5.6L4 15.5M4 20v-4.5h4.5" />
  ),
  night: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />,
  trap: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </>
  ),
};

export default function Problem() {
  return (
    <ProblemCards
      title="Most chats don't need a person. Some really do."
      lead="Answer every message by hand and the team drowns; hand them all to a bot and customers get stuck."
      problems={PROBLEMS.map((problem) => ({ ...problem, icon: ICONS[problem.icon] }))}
    />
  );
}
