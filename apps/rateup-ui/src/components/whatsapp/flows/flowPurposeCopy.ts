import { useTranslation } from "react-i18next";

import { LOYALTY_FEEDBACK_FLOW_CATEGORY } from "@/types/enums.ts";

import type { FlowType } from "./CreateFlowWizard/createFlowWizard.steps.ts";

/**
 * How each flow purpose is written.
 *
 * Deliberately not fields on `FLOW_PURPOSES`: `t()` needs the hook, and the extractor only
 * reads literal calls — `t(purpose.label)` over a module-scope English string reaches no
 * locale file, so the keys would be pruned on the next extract and every locale but English
 * would fall back to English. Same split as `STEP_META` in loyalty onboarding: icons and
 * order live with the data, words live here.
 *
 * The `Record<FlowType, …>` is exhaustive, so a tenth purpose cannot be added without copy.
 */
export function useFlowPurposeCopy(): Record<FlowType, { label: string; description: string }> {
  const { t } = useTranslation();
  return {
    SIGN_UP: {
      label: t("Sign up"),
      description: t("Register a new customer."),
    },
    SIGN_IN: {
      label: t("Sign in"),
      description: t("Let a returning customer identify themselves."),
    },
    APPOINTMENT_BOOKING: {
      label: t("Appointment booking"),
      description: t("Take a booking for a date and time."),
    },
    LEAD_GENERATION: {
      label: t("Lead generation"),
      description: t("Capture details from someone interested."),
    },
    CONTACT_US: {
      label: t("Contact us"),
      description: t("Collect an enquiry and how to reply to it."),
    },
    CUSTOMER_SUPPORT: {
      label: t("Customer support"),
      description: t("Take a support request with the details you need."),
    },
    SURVEY: {
      label: t("Survey"),
      description: t("Ask a set of questions and collect the answers."),
    },
    [LOYALTY_FEEDBACK_FLOW_CATEGORY]: {
      label: t("Loyalty feedback"),
      description: t("Ask how a visit went after a customer earns points."),
    },
    OTHER: {
      label: t("Other"),
      description: t("Anything the rest do not cover."),
    },
  };
}
