import { Section, Text } from "react-email";
import {
  Callout,
  Display,
  EmailLayout,
  Muted,
  Paragraph,
  PrimaryButton,
} from "../utils/email/react/components.js";
import { brand } from "../utils/email/react/brand.js";

export interface OrgInactivityWarningEmailProps {
  orgName: string;
  ownerName: string;
  /** Pre-formatted for the recipient by the caller. */
  deadline: string;
  /** How long it has been idle, e.g. "over a year". */
  idleFor?: string;
  dashboardLink: string;
}

export function OrgInactivityWarningEmail({
  orgName,
  ownerName,
  deadline,
  idleFor = "a long time",
  dashboardLink,
}: OrgInactivityWarningEmailProps) {
  return (
    <EmailLayout
      preview={`${orgName} will be deleted on ${deadline} unless you sign in`}
      note={
        <Muted>
          Think this is a mistake? Write to {brand.supportEmail} and we&apos;ll look into it before
          anything happens. An automated message — replies to this address aren&apos;t monitored.
        </Muted>
      }
    >
      <Section className="mb-8">
        <Display>Your workspace is about to close</Display>
        <Paragraph>
          Hi {ownerName} — there&apos;s been no activity in <strong>{orgName}</strong> on RateUp for
          {idleFor}, so it&apos;s been flagged as dormant.
        </Paragraph>
      </Section>

      <Callout tone="danger">
        <Text className="font-14 text-danger m-0">
          If nobody signs in before {deadline}, {orgName} will be permanently deleted, along with
          its surveys, responses, and contacts. This can&apos;t be undone.
        </Text>
      </Callout>

      <Section className="pt-8">
        <Paragraph tight>
          Keeping it open takes one sign-in by you or anyone on your team. Open your dashboard and
          the flag clears straight away.
        </Paragraph>
      </Section>

      <Section className="pt-8">
        <PrimaryButton href={dashboardLink}>Keep my workspace</PrimaryButton>
      </Section>
    </EmailLayout>
  );
}

OrgInactivityWarningEmail.PreviewProps = {
  orgName: "Northside Coffee",
  ownerName: "Priya",
  deadline: "16 Sep 2026",
  idleFor: "over a year",
  dashboardLink: "https://rateup.app/dashboard",
} satisfies OrgInactivityWarningEmailProps;

export default OrgInactivityWarningEmail;
