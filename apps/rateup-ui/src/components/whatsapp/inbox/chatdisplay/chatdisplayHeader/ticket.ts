import type { ResolutionResult } from "@/backend/whatsapp/inbox/message/wamessage.api.ts";
import type { ContactWithUpdatedAt } from "@/store/inbox.store.ts";
import { WaMessageAssignStatus } from "@/types/enums.ts";

/**
 * Contact-level statuses that mean "this ticket is no longer open".
 * Mirrors the list the old header used to hide its Close menu.
 */
export const CLOSED_STATUSES: string[] = [
  WaMessageAssignStatus.CLOSED,
  WaMessageAssignStatus.SPAM,
  WaMessageAssignStatus.RESOLVED,
  WaMessageAssignStatus.UNRESOLVED,
];

export type DerivedStatusId = "new" | "assigned" | "closed" | "unresolved";

/** Base pill chrome shared by the status pills; combine with a `DerivedStatus.className`.
 *  The dot is a `<span className="size-[5px] rounded-full bg-current" />` child. */
export const STATUS_PILL_BASE =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold";

export interface DerivedStatus {
  id: DerivedStatusId;
  label: string;
  /** Tailwind bg + text colours for the status pill (the dot inherits via `bg-current`). */
  className: string;
}

const DERIVED: Record<DerivedStatusId, DerivedStatus> = {
  new: {
    id: "new",
    label: "New",
    className: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-500",
  },
  assigned: { id: "assigned", label: "Assigned", className: "bg-primary/10 text-primary" },
  closed: { id: "closed", label: "Closed", className: "bg-green-600/10 text-green-600" },
  unresolved: {
    id: "unresolved",
    label: "Unresolved",
    className: "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400",
  },
};

/**
 * Status is DERIVED, never stored: closed wins, otherwise having assignees
 * means Assigned and no assignees means New. The ticket's own
 * `conversationStatus` is preferred over the contact-level status.
 */
export function deriveStatus(contact: {
  conversationStatus?: string | null;
  waMessageAssignStatus?: string | null;
  assignedUsers?: unknown[];
}): DerivedStatus {
  const status = contact?.conversationStatus ?? contact?.waMessageAssignStatus ?? null;
  // Unresolved is the one closed outcome worth telling apart at a glance.
  if (status === WaMessageAssignStatus.UNRESOLVED) return DERIVED.unresolved;
  if (status && CLOSED_STATUSES.includes(status)) return DERIVED.closed;
  return contact?.assignedUsers?.length ? DERIVED.assigned : DERIVED.new;
}

export function isTicketClosed(contact: Partial<ContactWithUpdatedAt>): boolean {
  const { id } = deriveStatus(contact as ContactWithUpdatedAt);
  return id === "closed" || id === "unresolved";
}

export interface CloseResultOption {
  value: ResolutionResult;
  label: string;
}

/** Close-with-result taxonomy, in the order the design lists it. */
export const CLOSE_RESULTS: CloseResultOption[] = [
  { value: "RESOLVED", label: "Resolved" },
  { value: "ANSWERED", label: "Question answered" },
  { value: "NO_RESPONSE", label: "No response" },
  { value: "DUPLICATE", label: "Duplicate" },
];

export function resolutionResultLabel(result?: ResolutionResult | null): string | null {
  if (!result) return null;
  return CLOSE_RESULTS.find((r) => r.value === result)?.label ?? null;
}
