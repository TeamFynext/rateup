import { Section } from "react-email";
import {
  Display,
  EmailLayout,
  Paragraph,
  PrimaryButton,
  SummaryRows,
} from "../utils/email/react/components.js";

export interface TicketEmailProps {
  variant: "assigned" | "created";
  ticketLink: string;
  ticketNo: string;
  boardName: string;
  columnName: string;
}

export function TicketEmail({
  variant,
  ticketLink,
  ticketNo,
  boardName,
  columnName,
}: TicketEmailProps) {
  const assigned = variant === "assigned";

  return (
    <EmailLayout
      preview={
        assigned ? `Ticket #${ticketNo} is now yours` : `Ticket #${ticketNo} was just created`
      }
    >
      <Section className="mb-9">
        <Display>{assigned ? "A ticket is yours" : "New ticket created"}</Display>
        <Paragraph>
          {assigned
            ? `Ticket #${ticketNo} has been assigned to you. Here's where it stands right now.`
            : `Ticket #${ticketNo} has been opened on ${boardName}. Here's where it stands right now.`}
        </Paragraph>
      </Section>

      <Section className="mb-10">
        <SummaryRows
          rows={[
            { label: "Ticket", value: `#${ticketNo}` },
            { label: "Board", value: boardName },
            { label: "Status", value: columnName },
          ]}
        />
      </Section>

      <Section>
        <PrimaryButton href={ticketLink}>Open the ticket</PrimaryButton>
      </Section>
    </EmailLayout>
  );
}

TicketEmail.PreviewProps = {
  variant: "assigned",
  ticketLink: "https://rateup.app/dashboard/tickets/1042",
  ticketNo: "1042",
  boardName: "Customer Support",
  columnName: "In Progress",
} satisfies TicketEmailProps;

export default TicketEmail;
