/**
 * The seam between the app and `src/emails`.
 *
 * Every caller that needs an email body goes through a `render*` function here,
 * so templates stay free of `process.env` lookups and route building. All of
 * these are async — rendering JSX to HTML is not synchronous, unlike the string
 * templates these replaced.
 */
import BookDemoConfirmationEmail, {
  type BookDemoConfirmationEmailProps,
} from "../../../emails/book-demo-confirmation.js";
import BookDemoRequestEmail, {
  type BookDemoRequestEmailProps,
} from "../../../emails/book-demo-request.js";
import CampaignCompletedEmail from "../../../emails/campaign-completed.js";
import ContactFormEmail, { type ContactFormEmailProps } from "../../../emails/contact-form.js";
import GeneralEmail, { type GeneralEmailProps } from "../../../emails/general.js";
import OrgDeletionReminderEmail, {
  type OrgDeletionReminderEmailProps,
} from "../../../emails/org-deletion-reminder.js";
import OrgInactivityWarningEmail, {
  type OrgInactivityWarningEmailProps,
} from "../../../emails/org-inactivity-warning.js";
import OrgSignupEmail, { type OrgSignupEmailProps } from "../../../emails/org-signup.js";
import OtpEmail, { type OtpEmailProps } from "../../../emails/otp.js";
import PasswordResetEmail from "../../../emails/password-reset.js";
import PaymentFailedEmail from "../../../emails/payment-failed.js";
import PartnerInquiryEmail, {
  type PartnerInquiryEmailProps,
} from "../../../emails/partner-inquiry.js";
import PricingPlanSelectedEmail, {
  type PricingPlanSelectedEmailProps,
} from "../../../emails/pricing-plan-selected.js";
import SubscriptionActivatedEmail from "../../../emails/subscription-activated.js";
import SubscriptionExpiryEmail, { type ExpiryStage } from "../../../emails/subscription-expiry.js";
import SurveyResponseEmail, { type SurveyResponseAnswer } from "../../../emails/survey-response.js";
import TeamInviteEmail, { type TeamInviteEmailProps } from "../../../emails/team-invite.js";
import TicketEmail, { type TicketEmailProps } from "../../../emails/ticket.js";
import TrialStartedEmail from "../../../emails/trial-started.js";
import UsageLimitEmail from "../../../emails/usage-limit.js";
import VerifyEmail, { type VerifyEmailProps } from "../../../emails/verify-email.js";
import WeeklyReportEmail, { type WeeklyReportEmailProps } from "../../../emails/weekly-report.js";
import WeeklyStatsEmail, { type WeeklyStatsRow } from "../../../emails/weekly-stats.js";
import { billingPage, FRONTEND_URL, statsPage } from "../../constants/constants.js";
import { brand } from "./brand.js";
import { renderEmail, renderEmailText } from "./render.js";

const dashboardLink = `${FRONTEND_URL}/dashboard`;

/**
 * Where the footer's "Unsubscribe" link points on marketing and digest mail.
 *
 * RateUp has no tokenised unsubscribe endpoint, so this goes to account
 * settings, where a signed-in owner can turn the mail off. Point it at a real
 * one-click endpoint when one exists — every caller reads it from here.
 */
const emailPreferencesLink = `${FRONTEND_URL}/dashboard/settings/account`;

/**
 * What a brand-new paying account should do first. Shared by the trial and
 * activation emails so the two do not drift apart.
 */
const ONBOARDING_STEPS = [
  {
    title: "Create your first survey",
    description:
      "Start from a template or write your own questions, then share it over the web or WhatsApp.",
    href: `${FRONTEND_URL}/dashboard/surveys`,
  },
  {
    title: "Invite your team",
    description: "Bring in the people who'll read responses and follow up with customers.",
    href: `${FRONTEND_URL}/dashboard/settings/team`,
  },
] as const;

/**
 * A payment-provider amount, in minor units, as something a person can read.
 *
 * Both Stripe and Razorpay report paise/cents, so the division belongs here
 * rather than at each call site. An unknown currency falls back to a plain
 * number followed by the code, which is wrong-looking but never "NaN".
 */
export function formatAmountPaid(
  amountMinor: number | undefined,
  currency: string | undefined,
): string | undefined {
  if (amountMinor === undefined || !Number.isFinite(amountMinor)) return undefined;
  const major = amountMinor / 100;
  const code = currency?.toUpperCase();
  if (!code) return major.toFixed(2);
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: code }).format(major);
  } catch {
    return `${major.toFixed(2)} ${code}`;
  }
}

export function renderOtpEmail(props: OtpEmailProps) {
  return renderEmail(<OtpEmail {...props} />);
}

export function renderGeneralEmail(props: GeneralEmailProps) {
  return renderEmail(<GeneralEmail {...props} />);
}

export function renderVerifyEmail(props: VerifyEmailProps) {
  return renderEmail(<VerifyEmail {...props} />);
}

export function renderPasswordResetEmail(resetLink: string) {
  return renderEmail(<PasswordResetEmail resetLink={resetLink} />);
}

export function renderTeamInviteEmail(props: TeamInviteEmailProps) {
  return renderEmail(<TeamInviteEmail {...props} />);
}

export function renderSurveyResponseEmail(props: {
  surveyTitle: string;
  resultsLink: string;
  answers: SurveyResponseAnswer[];
}) {
  return renderEmail(<SurveyResponseEmail {...props} unsubscribeUrl={emailPreferencesLink} />);
}

export function renderContactFormEmail(props: ContactFormEmailProps) {
  return renderEmail(<ContactFormEmail {...props} />);
}

export function renderTicketEmail(props: TicketEmailProps) {
  return renderEmail(<TicketEmail {...props} />);
}

export function renderSubscriptionActivatedEmail(props: {
  planName: string;
  validUntil: string;
  isRenewed?: boolean;
  amountPaid?: string;
}) {
  return renderEmail(
    <SubscriptionActivatedEmail
      {...props}
      billingLink={billingPage}
      nextSteps={[...ONBOARDING_STEPS]}
    />,
  );
}

export function renderTrialStartedEmail(props: {
  userName: string;
  planName: string;
  trialDays: number;
  expiresAt: string;
  renewalPrice?: string;
}) {
  return renderEmail(
    <TrialStartedEmail
      {...props}
      dashboardLink={dashboardLink}
      nextSteps={[...ONBOARDING_STEPS]}
      unsubscribeUrl={emailPreferencesLink}
    />,
  );
}

export function renderPaymentFailedEmail(isRenewal = false) {
  return renderEmail(<PaymentFailedEmail isRenewal={isRenewal} billingLink={billingPage} />);
}

export function renderUsageLimitEmail() {
  return renderEmail(<UsageLimitEmail statsLink={statsPage} billingLink={billingPage} />);
}

export function renderSubscriptionExpiryEmail(props: {
  stage: ExpiryStage;
  ownerName: string;
  planName: string;
  expiresAt: string;
}) {
  return renderEmail(
    <SubscriptionExpiryEmail {...props} statsLink={statsPage} billingLink={billingPage} />,
  );
}

export function renderPricingPlanSelectedEmail(props: PricingPlanSelectedEmailProps) {
  return renderEmail(<PricingPlanSelectedEmail {...props} />);
}

export function renderOrgInactivityWarningEmail(
  props: Omit<OrgInactivityWarningEmailProps, "dashboardLink">,
) {
  return renderEmail(<OrgInactivityWarningEmail {...props} dashboardLink={dashboardLink} />);
}

export function renderOrgDeletionReminderEmail(
  props: Omit<OrgDeletionReminderEmailProps, "reviewLink"> & { orgId: string },
) {
  const { orgId, ...rest } = props;
  return renderEmail(
    <OrgDeletionReminderEmail {...rest} reviewLink={`${FRONTEND_URL}/admin/orgs/${orgId}`} />,
  );
}

export function renderWeeklyStatsEmail(props: {
  periodStart: string;
  periodEnd: string;
  rows: WeeklyStatsRow[];
}) {
  return renderEmail(
    <WeeklyStatsEmail
      {...props}
      dashboardLink={dashboardLink}
      unsubscribeUrl={emailPreferencesLink}
    />,
  );
}

/**
 * These return both bodies. Where the older wrappers hand back HTML and leave
 * the caller to write a one-line `text`, every template converted here already
 * had a real plain-text half — so it is derived from the same element instead,
 * which is what stops the two from drifting apart.
 */
export async function renderBookDemoRequestEmailBodies(props: BookDemoRequestEmailProps) {
  const element = <BookDemoRequestEmail {...props} />;

  return { html: await renderEmail(element), text: await renderEmailText(element) };
}

export async function renderBookDemoConfirmationEmailBodies(
  props: Omit<BookDemoConfirmationEmailProps, "websiteLink">,
) {
  const element = <BookDemoConfirmationEmail {...props} websiteLink={brand.website} />;

  return { html: await renderEmail(element), text: await renderEmailText(element) };
}

export async function renderPartnerInquiryEmailBodies(props: PartnerInquiryEmailProps) {
  const element = <PartnerInquiryEmail {...props} />;

  return { html: await renderEmail(element), text: await renderEmailText(element) };
}

export async function renderOrgSignupEmailBodies(
  props: Omit<OrgSignupEmailProps, "adminLink"> & { orgId: string },
) {
  const { orgId, ...rest } = props;
  const element = <OrgSignupEmail {...rest} adminLink={`${FRONTEND_URL}/admin/orgs/${orgId}`} />;

  return { html: await renderEmail(element), text: await renderEmailText(element) };
}

export async function renderCampaignCompletedEmailBodies(props: {
  campaignName: string;
  campaignId: string;
}) {
  const element = (
    <CampaignCompletedEmail
      campaignName={props.campaignName}
      campaignLink={`${FRONTEND_URL}/dashboard/campaign/${props.campaignId}`}
    />
  );

  return { html: await renderEmail(element), text: await renderEmailText(element) };
}

export async function renderWeeklyReportEmailBodies(
  props: Omit<WeeklyReportEmailProps, "inboxLink" | "unsubscribeUrl">,
) {
  const element = (
    <WeeklyReportEmail
      {...props}
      inboxLink={`${FRONTEND_URL}/dashboard/inbox`}
      unsubscribeUrl={emailPreferencesLink}
    />
  );

  return { html: await renderEmail(element), text: await renderEmailText(element) };
}
