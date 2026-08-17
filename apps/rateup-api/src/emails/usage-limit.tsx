import { Section, Text } from "react-email";
import {
  ButtonPair,
  Callout,
  Display,
  EmailLayout,
  Muted,
  Paragraph,
} from "../utils/email/react/components.js";

export interface UsageLimitEmailProps {
  statsLink: string;
  billingLink: string;
}

export function UsageLimitEmail({ statsLink, billingLink }: UsageLimitEmailProps) {
  return (
    <EmailLayout
      preview="You've used everything in your RateUp plan this period"
      note={
        <Muted>
          Hitting the limit usually means the surveys are working. If you&apos;re not sure which
          plan fits, check your usage first — it shows where the volume is coming from.
        </Muted>
      }
    >
      <Section className="mb-8">
        <Display>You&apos;ve hit your plan limit</Display>
        <Paragraph>
          Your organisation has used everything included in its RateUp plan for this billing period.
        </Paragraph>
      </Section>

      <Callout tone="warning">
        <Text className="font-14 text-warning m-0">
          New responses may not be recorded until the period resets or you move to a larger plan.
          Feedback that arrives in the meantime can&apos;t be recovered later.
        </Text>
      </Callout>

      <Section className="pt-9">
        <ButtonPair
          primary={{ href: billingLink, label: "Upgrade plan" }}
          secondary={{ href: statsLink, label: "View usage" }}
        />
      </Section>
    </EmailLayout>
  );
}

UsageLimitEmail.PreviewProps = {
  statsLink: "https://rateup.app/dashboard/settings/billing",
  billingLink: "https://rateup.app/dashboard/settings/billing",
} satisfies UsageLimitEmailProps;

export default UsageLimitEmail;
