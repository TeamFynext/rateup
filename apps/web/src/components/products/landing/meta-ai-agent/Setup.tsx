import type { ReactNode } from "react";

import Stepper from "../shared/Stepper";
import { SETUP_STEPS } from "./content";

const ICONS: readonly ReactNode[] = [
  <path key="0" d="M9 7V3M15 7V3M6 7h12v4a6 6 0 0 1-12 0V7ZM12 17v4" />,
  <path
    key="1"
    d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5v-13ZM13 4h5.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H13V4Z"
  />,
  <path key="2" d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM16.5 13v7M13 16.5h7" />,
  <path key="3" d="M7 4.5v15l12-7.5-12-7.5Z" />,
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m8.5 12.2 2.4 2.4 4.6-5" />
  </>,
];

export default function Setup() {
  return (
    <Stepper
      eyebrow="Setup"
      eyebrowIcon={<path d="M4 12h13M13 6l6 6-6 6" />}
      title="A guided setup, step by step."
      lead="The same checklist the dashboard walks you through, with Meta's approval first and a test before anything reaches a customer."
      steps={SETUP_STEPS.map((step, i) => ({ ...step, icon: ICONS[i] }))}
    />
  );
}
