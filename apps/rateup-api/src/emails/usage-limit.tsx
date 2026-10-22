import { Section, Text } from "react-email";
import {
  ButtonPair,
  Callout,
  Display,
  EmailLayout,
  Muted,
  Paragraph,
} from "../utils/email/react/components.js";

export type UsageLimitKind = "activeContacts" | "campaignCredits" | "formResponses" | "shopOrders";

export interface UsageLimitEmailProps {
  limit: UsageLimitKind;
  statsLink: string;
  billingLink: string;
}

const COPY: Record<
  UsageLimitKind,
  { preview: string; title: string; body: string; impact: string; cta?: string }
> = {
  activeContacts: {
    preview: "You've reached this month's active contacts",
    title: "You've reached your monthly active contacts",
    body: "Your organisation has messaged every contact its RateUp plan includes this month.",
    impact:
      "You can keep messaging contacts you've already talked to this month. Messages to new " +
      "contacts won't send until next month, or until you add a contact pack or upgrade. " +
      "Customers can still message you.",
  },
  campaignCredits: {
    preview: "You've used all of this month's campaign credits",
    title: "You've used all your campaign credits",
    body: "Your organisation has sent every campaign message its RateUp plan includes this month.",
    impact:
      "Running campaigns are paused and new ones can't start until next month, or until you " +
      "add a campaign credit pack or upgrade. Inbox replies and automations keep working.",
  },
  formResponses: {
    preview: "Your forms have reached this month's response limit",
    title: "You've hit your form response limit",
    body: "Your organisation has collected every form response its RateUp plan includes this month.",
    impact:
      "New responses may not be recorded until next month or until you move to a larger " +
      "plan. Feedback that arrives in the meantime can't be recovered later.",
  },
  shopOrders: {
    preview: "Your shop has taken this month's orders",
    title: "You've reached this month's orders",
    body: "Your shop has taken every order its RateUp plan includes this month.",
    impact:
      "Customers can't place new orders online until next month or until you upgrade. " +
      "They're asked to message you instead, and orders already paid for still go through.",
    cta: "Upgrade your plan",
  },
};

export function UsageLimitEmail({ limit, statsLink, billingLink }: UsageLimitEmailProps) {
  const copy = COPY[limit];
  return (
    <EmailLayout
      preview={copy.preview}
      note={
        <Muted>
          Not sure which plan fits? Check your usage first — it shows where the volume is coming
          from.
        </Muted>
      }
    >
      <Section className="mb-8">
        <Display>{copy.title}</Display>
        <Paragraph>{copy.body}</Paragraph>
      </Section>

      <Callout tone="warning">
        <Text className="font-14 text-warning m-0">{copy.impact}</Text>
      </Callout>

      <Section className="pt-9">
        <ButtonPair
          primary={{ href: billingLink, label: copy.cta ?? "Upgrade or add a pack" }}
          secondary={{ href: statsLink, label: "View usage" }}
        />
      </Section>
    </EmailLayout>
  );
}

UsageLimitEmail.PreviewProps = {
  limit: "activeContacts",
  statsLink: "https://rateup.app/dashboard/settings/billing",
  billingLink: "https://rateup.app/dashboard/settings/billing",
} satisfies UsageLimitEmailProps;

export default UsageLimitEmail;
