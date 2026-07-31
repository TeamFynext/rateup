import { CircleCheckBig, Ticket } from "lucide-react";

import type { ContactWithUpdatedAt } from "@/store/inbox.store.ts";

import { resolutionResultLabel } from "./ticket.ts";

interface TicketSubBarProps {
  contact: ContactWithUpdatedAt;
}

/**
 * The ticket identity strip that sits directly under the header row:
 * ticket icon, monospace `#<number>`, bold subject, and — once the ticket has
 * been closed with a result — a green result badge pinned to the right.
 */
export default function TicketSubBar({ contact }: Readonly<TicketSubBarProps>) {
  const ticketNumber = contact?.ticketNumber;
  if (!ticketNumber) return null;

  const resultLabel = resolutionResultLabel(contact?.resolutionResult);

  return (
    // h-9 with the divider on the bottom edge — matching the chat list's second
    // header row exactly, so this bar's line lands on the same y as that one.
    <div className="flex h-9 shrink-0 items-center gap-2.5 border-b border-border bg-muted px-5">
      <Ticket className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="shrink-0 font-mono text-[11px] text-muted-foreground mt-1">
        #{ticketNumber}
      </span>
      <span className="truncate text-[13px] font-bold text-foreground">
        {contact?.ticketSubject || ""}
      </span>
      <span className="flex-1" />
      {resultLabel && (
        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-green-600">
          <CircleCheckBig className="size-3" />
          {resultLabel}
        </span>
      )}
    </div>
  );
}
