import type { ReactNode } from "react";

import Stepper from "../shared/Stepper";
import { STEPS } from "./content";

const ICONS: readonly ReactNode[] = [
  <path key="0" d="M4 7h16l-1.5 11a2 2 0 0 1-2 1.7h-9a2 2 0 0 1-2-1.7L4 7ZM9 7a3 3 0 0 1 6 0" />,
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </>,
  <path
    key="2"
    d="M20.5 12c0 4-3.8 7-8.5 7-1 0-2-.15-2.9-.4L4 20l1.3-3.6A6.9 6.9 0 0 1 3.5 12c0-4 3.8-7 8.5-7s8.5 3 8.5 7Z"
  />,
  <path key="3" d="M6 4v6a4 4 0 0 0 4 4h8M14 10l4 4-4 4M6 20v-2" />,
];

export default function HowItRuns() {
  return (
    <Stepper
      eyebrow="How it runs"
      eyebrowIcon={<path d="M4 12h13M13 6l6 6-6 6" />}
      title="Set it up once. Every visit gets asked."
      lead="Feedback runs on your RateUp loyalty programme, so every purchase you record can start it."
      steps={STEPS.map((step, i) => ({ ...step, icon: ICONS[i] }))}
    />
  );
}
