import type { ReactNode } from "react";

import Stepper from "../shared/Stepper";
import { LIFECYCLE_STEPS } from "./content";

const ICONS: readonly ReactNode[] = [
  <path
    key="0"
    d="M20.5 12c0 4-3.8 7-8.5 7-1 0-2-.15-2.9-.4L4 20l1.3-3.6A6.9 6.9 0 0 1 3.5 12c0-4 3.8-7 8.5-7s8.5 3 8.5 7Z"
  />,
  <path
    key="1"
    d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8ZM10 6v12"
  />,
  <>
    <circle cx="10" cy="8" r="3.4" />
    <path d="M3.5 20a6.5 6.5 0 0 1 13 0M18 8v6M15 11h6" />
  </>,
  <path key="3" d="M5 4.5h14v11H11l-4 4v-4H5v-11ZM9 9h6M9 12h4" />,
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m8.5 12.2 2.4 2.4 4.6-5" />
  </>,
];

export default function Lifecycle() {
  return (
    <Stepper
      eyebrow="Message to result"
      eyebrowIcon={<path d="M4 12h13M13 6l6 6-6 6" />}
      title="From message to result, in five steps."
      lead="The same path for every message, on every channel — so “what happened with that customer?” always has an answer."
      steps={LIFECYCLE_STEPS.map((step, i) => ({ ...step, icon: ICONS[i] }))}
    />
  );
}
