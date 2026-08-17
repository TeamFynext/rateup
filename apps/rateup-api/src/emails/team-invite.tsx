import { Section } from "react-email";
import {
  Band,
  Display,
  EmailLayout,
  Muted,
  Paragraph,
  PrimaryButton,
} from "../utils/email/react/components.js";

export interface TeamInviteEmailProps {
  inviteLink: string;
  /** The organisation doing the inviting, when the caller knows it. */
  orgName?: string;
  teamName?: string;
}

export function TeamInviteEmail({ inviteLink, orgName, teamName }: TeamInviteEmailProps) {
  const invitedTo = teamName ? `the ${teamName} team` : "a team";
  const inviter = orgName ?? "Your team";

  return (
    <EmailLayout
      preview={`You've been invited to join ${invitedTo} on RateUp`}
      note={
        <Muted>
          If you weren&apos;t expecting this invitation you can ignore it — nothing is shared with
          you until you accept.
        </Muted>
      }
      band={
        <Band
          heading="What you'll be able to do"
          intro="RateUp is where your team collects customer feedback over the web and WhatsApp, and turns it into reviews and repeat visits. You'll land straight in the workspace — there's nothing to install."
          lead="Once you're in:"
          items={[
            {
              title: "Read what customers said",
              description:
                "Every response, with the questions they answered and the visit it came from, in one place.",
            },
            {
              title: "Follow up while it matters",
              description:
                "Turn an unhappy response into a ticket and reply over WhatsApp before the customer writes a public review.",
            },
            {
              title: "See the pattern, not just the noise",
              description:
                "Track scores over time so you can tell a bad night from a real problem.",
            },
          ]}
        />
      }
    >
      <Section className="mb-9">
        <Display>You&apos;re invited</Display>
        <Paragraph>
          {inviter} has invited you to join {invitedTo} on RateUp. Accept the invitation to get
          access to their surveys, responses, and customer follow-ups.
        </Paragraph>
      </Section>

      <PrimaryButton href={inviteLink}>Accept invitation</PrimaryButton>
    </EmailLayout>
  );
}

TeamInviteEmail.PreviewProps = {
  inviteLink: "https://rateup.app/auth/invite?token=example",
  orgName: "Northside Coffee",
  teamName: "Front of House",
} satisfies TeamInviteEmailProps;

export default TeamInviteEmail;
