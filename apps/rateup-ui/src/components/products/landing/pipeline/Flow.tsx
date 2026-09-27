import type { ReactNode } from "react";

import Stepper from "../shared/Stepper";
import { FLOW_STEPS } from "./content";

const ICONS: readonly ReactNode[] = [
  <path
    key="0"
    d="M20.5 12c0 4-3.8 7-8.5 7-1 0-2-.15-2.9-.4L4 20l1.3-3.6A6.9 6.9 0 0 1 3.5 12c0-4 3.8-7 8.5-7s8.5 3 8.5 7Z"
  />,
  <path key="1" d="M3.6 5h16.8l-6.3 7.1v6L10 20v-7.9L3.6 5Z" />,
  <>
    <circle cx="10" cy="8" r="3.4" />
    <path d="M3.5 20a6.5 6.5 0 0 1 13 0M18 8v6M15 11h6" />
  </>,
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m8.5 12.2 2.4 2.4 4.6-5" />
  </>,
];

export default function Flow() {
  return (
    <Stepper
      eyebrow="Chat to customer"
      eyebrowIcon={<path d="M4 12h13M13 6l6 6-6 6" />}
      title="From first message to a closed deal."
      lead="The lead starts where the customer did — in the inbox — and keeps the conversation one click away."
      steps={FLOW_STEPS.map((step, i) => ({ ...step, icon: ICONS[i] }))}
    />
  );
}
