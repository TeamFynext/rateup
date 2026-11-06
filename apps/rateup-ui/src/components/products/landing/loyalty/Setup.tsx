import type { ReactNode } from "react";

import Stepper from "../shared/Stepper";
import { SETUP_STEPS } from "./content";

const ICONS: readonly ReactNode[] = [
  <>
    <circle cx="12" cy="8" r="3.4" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </>,
  <path
    key="1"
    d="M12 3v18M16.5 7.5c0-1.7-2-3-4.5-3s-4.5 1.3-4.5 3 2 2.6 4.5 3 4.5 1.3 4.5 3-2 3-4.5 3-4.5-1.3-4.5-3"
  />,
  <path key="2" d="m12 3 2.6 5.5 6 .8-4.4 4.1 1.1 6L12 16.5l-5.3 2.9 1.1-6L3.4 9.3l6-.8L12 3Z" />,
  <path
    key="3"
    d="M4 9h16v11H4zM2.5 5.5h19V9h-19zM12 5.5V20M12 5.5c-1.5-3-5-3-5-.5s5 .5 5 .5Zm0 0c1.5-3 5-3 5-.5s-5 .5-5 .5Z"
  />,
  <path
    key="4"
    d="M20.5 12c0 4-3.8 7-8.5 7-1 0-2-.15-2.9-.4L4 20l1.3-3.6A6.9 6.9 0 0 1 3.5 12c0-4 3.8-7 8.5-7s8.5 3 8.5 7Z"
  />,
  <path key="5" d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2z" />,
];

export default function Setup() {
  return (
    <Stepper
      eyebrow="Setup"
      eyebrowIcon={<path d="M4 12h13M13 6l6 6-6 6" />}
      title="Live in six steps, from a preset that fits."
      lead="Start from a café, retail, salon or gym preset — the wizard fills in sensible rules, tiers, rewards and messages you can change."
      steps={SETUP_STEPS.map((step, i) => ({ ...step, icon: ICONS[i] }))}
    />
  );
}
