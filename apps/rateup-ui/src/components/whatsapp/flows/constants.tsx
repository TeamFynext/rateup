import {
  IconCalendarEvent,
  IconChartBar,
  IconDots,
  IconHeadset,
  IconLogin,
  IconMagnet,
  IconMail,
  IconMessageStar,
  IconUserPlus,
} from "@tabler/icons-react";

import { LOYALTY_FEEDBACK_FLOW_CATEGORY } from "@/types/enums.ts";

/**
 * What a WhatsApp Flow is for — the choice the create wizard opens on, and the category the
 * flow is created with. Meta's own eight, plus RateUp's LOYALTY_FEEDBACK, which the API maps
 * to SURVEY before Meta sees it and which Loyalty → Feedback selects flows by.
 *
 * The order is the product decision: loyalty feedback sits after Survey (it is a kind of
 * survey) rather than first, because it is one purpose among nine and not a headline. `Other`
 * stays last, so the catch-all reads as one.
 *
 * Words live in `useFlowPurposeCopy` — see the note there on why they cannot live here.
 */
export const FLOW_PURPOSES = [
  { value: "SIGN_UP", icon: IconUserPlus },
  { value: "SIGN_IN", icon: IconLogin },
  { value: "APPOINTMENT_BOOKING", icon: IconCalendarEvent },
  { value: "LEAD_GENERATION", icon: IconMagnet },
  { value: "CONTACT_US", icon: IconMail },
  { value: "CUSTOMER_SUPPORT", icon: IconHeadset },
  { value: "SURVEY", icon: IconChartBar },
  { value: LOYALTY_FEEDBACK_FLOW_CATEGORY, icon: IconMessageStar },
  { value: "OTHER", icon: IconDots },
] as const;
