import type { ReactNode } from "react";

import Stepper from "../shared/Stepper";
import { FLOW_STEPS } from "./content";

const ICONS: readonly ReactNode[] = [
  <path
    key="0"
    d="M20.5 12c0 4-3.8 7-8.5 7-1 0-2-.15-2.9-.4L4 20l1.3-3.6A6.9 6.9 0 0 1 3.5 12c0-4 3.8-7 8.5-7s8.5 3 8.5 7Z"
  />,
  <>
    <rect x="3.5" y="4" width="7.5" height="16" rx="1.5" />
    <rect x="13" y="4" width="7.5" height="16" rx="1.5" />
  </>,
  <>
    <path d="M3 4h2l2.4 11h10.2L20 8H6.2" />
    <circle cx="9" cy="19" r="1.3" />
    <circle cx="17" cy="19" r="1.3" />
  </>,
  <>
    <rect x="3" y="5.5" width="18" height="13" rx="2" />
    <path d="M3 10h18M7 14.5h4" />
  </>,
  <>
    <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Z" />
    <path d="m3 7.5 9 4.5 9-4.5M12 12v9" />
  </>,
];

export default function Flow() {
  return (
    <Stepper
      eyebrow="How it works"
      eyebrowIcon={<path d="M4 12h13M13 6l6 6-6 6" />}
      title="From a comment to a delivered order."
      lead="The customer never has to leave the conversation they started."
      steps={FLOW_STEPS.map((step, i) => ({ ...step, icon: ICONS[i] }))}
    />
  );
}
