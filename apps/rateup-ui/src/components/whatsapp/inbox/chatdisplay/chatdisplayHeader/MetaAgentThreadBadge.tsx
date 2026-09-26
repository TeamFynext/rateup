import { IconChevronDown, IconSparkles, IconUserCheck } from "@tabler/icons-react";
import dayjs from "dayjs";

import { useSetThreadControl } from "@/backend/metaAgent/metaAgent.query";
import { getRowKey } from "@/backend/whatsapp/inbox/message/wamessage.api";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { Button } from "@/components/ui/button.tsx";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { cn } from "@/lib/utils.ts";
import { type ContactWithUpdatedAt, useContactsStore } from "@/store/inbox.store.ts";

/** Meta's handover `metadata`, plus the reasons the API records itself. */
const REASON_LABELS: Record<string, string> = {
  customer_request: "The customer asked for a person",
  staff_reply: "A teammate replied from the inbox",
  released: "Handed back to Meta AI",
  ticket_closed: "Handed back when the ticket closed",
  // Any message RateUp sends takes the conversation off Meta AI, not only a
  // person's reply — WhatsApp gives it to whoever sends.
  automation: "An automation sent a message",
  campaign: "A campaign message was sent",
  api_send: "A message was sent through the API",
};

const digits = (value: string | null | undefined) => (value ?? "").replace(/\D/g, "");

/** How each ownership state reads in the header and its popover. */
const STATES = {
  AI: {
    label: "Meta AI",
    title: "Meta AI is replying",
    body: "Meta AI answers this customer. Replying here takes the conversation over.",
    pill: "bg-primary/10 text-primary hover:bg-primary/15",
  },
  STAFF: {
    label: "Staff",
    title: "Handed over to staff",
    body: "Meta AI has stopped answering. It stays silent until you hand the conversation back.",
    pill: "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:hover:bg-amber-950/60",
  },
  UNKNOWN: {
    label: "AI agent",
    title: "Meta AI agent",
    body: "No handover has been seen for this customer yet. If Meta AI has stopped replying to them, hand the conversation back.",
    pill: "bg-muted text-muted-foreground ring-1 ring-inset ring-border hover:bg-accent",
  },
} as const;

/**
 * Who is answering this customer when the Meta Business Agent is set up: Meta
 * AI, or staff after a handover. Before either has been seen the state is
 * UNKNOWN for a customer Meta AI has replied to, so a thread escalated before handovers
 * were tracked can still be handed back; null everywhere else.
 */
function useMetaAgentThread(selected: ContactWithUpdatedAt) {
  // The header is handed the selection, which is a copy taken when the chat was
  // opened (and persisted across reloads); list refetches never touch it. The
  // live row is what they update, so thread state is read from there.
  const liveRow = useContactsStore((s) => s.contactsById.get(getRowKey(selected)));
  const contact = liveRow ?? selected;
  const state: keyof typeof STATES | null =
    contact.metaAgentThreadOwner ?? (contact.metaAgentInvolved ? "UNKNOWN" : null);
  const canRelease = (state === "STAFF" || state === "UNKNOWN") && !!contact.phone;
  const { data: waSettings } = useWaSettings(canRelease);

  // The thread-control call is per business number: resolve the one this
  // thread runs through, by Meta's phone id first, then by the channel number.
  const channelDigits = digits(contact.lastMessage?.sourceIdentifier);
  const waSetting =
    waSettings?.find((w) => w.phoneId === contact.metadata?.phone_number_id) ??
    (channelDigits ? waSettings?.find((w) => digits(w.phone) === channelDigits) : undefined) ??
    (waSettings?.length === 1 ? waSettings[0] : undefined);
  const setThreadControl = useSetThreadControl(waSetting?.id ?? "");

  return {
    contact,
    state,
    canRelease,
    /** Settings are loaded and none matches this thread's number. */
    unmatched: canRelease && !!waSettings && !waSetting,
    releasable: canRelease && !!waSetting,
    isReleasing: setThreadControl.isPending,
    release: () => setThreadControl.mutate({ action: "release", to: `+${digits(contact.phone)}` }),
  };
}

/** The status pill beside the customer's name; its popover explains the state. */
export default function MetaAgentThreadBadge({
  contact: selected,
}: Readonly<{ contact: ContactWithUpdatedAt }>) {
  const { contact, state, unmatched, releasable, isReleasing, release } =
    useMetaAgentThread(selected);

  if (!state) return null;
  const view = STATES[state];
  const reason = contact.metaAgentHandoverReason;
  const reasonLabel = reason ? (REASON_LABELS[reason] ?? reason) : null;
  const since = contact.metaAgentThreadOwnerAt
    ? dayjs(contact.metaAgentThreadOwnerAt).format("D MMM, h:mm A")
    : null;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "inline-flex h-4.5 shrink-0 items-center gap-1 rounded-full px-1.5 text-[10px] font-semibold transition-colors",
              view.pill,
            )}
            aria-label={view.title}
          />
        }
      >
        {state === "STAFF" ? (
          <IconUserCheck className="size-3" />
        ) : (
          <IconSparkles className="size-3" />
        )}
        {view.label}
        <IconChevronDown className="size-2.5 opacity-70" />
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-64 gap-3">
        <PopoverHeader>
          <PopoverTitle>{view.title}</PopoverTitle>
          <PopoverDescription>{view.body}</PopoverDescription>
        </PopoverHeader>
        {(reasonLabel || since) && (
          <p className="text-xs text-muted-foreground">
            {[reasonLabel, since].filter(Boolean).join(" · ")}
          </p>
        )}
        {unmatched && (
          <p className="text-xs text-muted-foreground">
            This customer's WhatsApp number could not be matched to a connected number, so it can
            only be handed back from Meta AI Agent → Operate.
          </p>
        )}
        {releasable && (
          <Button type="button" size="sm" variant="outline" loading={isReleasing} onClick={release}>
            <IconSparkles className="size-3.5" />
            Hand back to Meta AI
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
