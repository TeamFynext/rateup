import { NOT_SPAM_EVENT } from "../../constants.js";
import { WaMessageAssignStatus } from "../../../../types/enums.js";

export interface InternalEventActor {
  /** Null for the automation actor: it has no user row. */
  id: string | null;
  name: string;
}

export interface InternalEventInput {
  status: string | undefined;
  actor: InternalEventActor | null;
  /** Who the event added, already resolved to names. */
  added: { id: string; name: string }[];
  /** Who the event removed. */
  removed: { id: string; name: string }[];
  /** The legacy fragment, used when a status has no sentence of its own. */
  fallback: string;
}

/** "Sara", "Sara and Leo", "Sara, Leo and Ana". */
function names(people: { name: string }[]): string {
  if (people.length <= 1) return people[0]?.name ?? "";
  const last = people[people.length - 1]!.name;
  return `${people
    .slice(0, -1)
    .map((p) => p.name)
    .join(", ")} and ${last}`;
}

/**
 * One finished sentence for a timeline event, actor included.
 *
 * Both clients used to hold half of it: the server wrote a fragment, and each client glued
 * the actor on with a different rule. That produced "Chat assigned to Admin by Admin" when
 * someone took a chat themselves, and "RateUp marked this chat as closed by automation",
 * which names the actor twice. Writing the whole sentence here is also the only way the two
 * clients can say the same thing, since they share no code.
 *
 * Stored alongside the old fragment rather than replacing it, so rows written before this
 * still render through the clients' legacy path.
 */
export function internalEventSentence({
  status,
  actor,
  added,
  removed,
  fallback,
}: InternalEventInput): string {
  const who = actor?.name ?? "";
  // The automation actor reaches here as "RateUp" or "Automation"; neither reads as a person
  // in a sentence, so those events are written in the passive instead of naming it.
  const auto = !actor || actor.id === null;
  const selfOnly = (people: { id: string }[]) =>
    !auto && people.length === 1 && people[0]!.id === actor?.id;

  switch (status) {
    case WaMessageAssignStatus.ASSIGNED:
      if (!added.length) return auto ? "Assigned automatically" : `${who} assigned this chat`;
      if (selfOnly(added)) return `${who} took this chat`;
      return auto
        ? `Assigned to ${names(added)} automatically`
        : `${who} assigned this chat to ${names(added)}`;

    case WaMessageAssignStatus.UNASSIGNED: {
      // An unassign arrives as a plain list, which the caller reads as `added`; only a
      // reassignment splits the two sides.
      const off = removed.length ? removed : added;
      if (!off.length) return auto ? "Unassigned automatically" : `${who} unassigned this chat`;
      if (selfOnly(off)) return `${who} left this chat`;
      return auto
        ? `${names(off)} was unassigned automatically`
        : `${who} removed ${names(off)} from this chat`;
    }

    case "REASSIGNED":
      if (added.length && removed.length)
        return auto
          ? `Moved from ${names(removed)} to ${names(added)} automatically`
          : `${who} moved this chat from ${names(removed)} to ${names(added)}`;
      if (added.length)
        return auto
          ? `Assigned to ${names(added)} automatically`
          : `${who} assigned this chat to ${names(added)}`;
      if (removed.length)
        return auto
          ? `${names(removed)} was unassigned automatically`
          : `${who} removed ${names(removed)} from this chat`;
      return auto ? "Reassigned automatically" : `${who} reassigned this chat`;

    case WaMessageAssignStatus.CLOSED:
      return auto ? "Closed automatically" : `${who} closed this chat`;

    case WaMessageAssignStatus.RESOLVED:
      return auto ? "Resolved automatically" : `${who} resolved this chat`;

    case WaMessageAssignStatus.UNRESOLVED:
      return auto ? "Reopened automatically" : `${who} reopened this chat`;

    // Spam is a property of the contact, so these two say "contact", not "chat".
    case WaMessageAssignStatus.SPAM:
      return auto ? "Marked as spam automatically" : `${who} marked this contact as spam`;

    case NOT_SPAM_EVENT:
      return auto ? "Unmarked as spam automatically" : `${who} marked this contact as not spam`;

    default:
      return who ? `${who} ${fallback}` : fallback;
  }
}
