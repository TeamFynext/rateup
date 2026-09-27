import { create } from "zustand";

import type { OptimisticMessage } from "@/components/whatsapp/inbox/chatdisplay/chatdisplayFooter/index.tsx";
import { WaMessageAssignStatus } from "@/types/enums.ts";
import { assignEventSentence } from "@/utils/whatsapp/inbox.ts";

import { generateInternalMessageId } from "../util.tsx";

interface Person {
  id: string;
  name: string;
}

interface Actor extends Person {
  profilePhoto?: string;
}

/**
 * The thread line an assignment writes, added before the API answers. The API
 * writes the real one under the same id, so the two collapse into one row.
 */
export function buildAssignEvent({
  contactId,
  actor,
  added,
  removed,
}: {
  contactId: string;
  actor: Actor;
  added: Person[];
  removed: Person[];
}): OptimisticMessage {
  let status: string = WaMessageAssignStatus.ASSIGNED;
  if (added.length && removed.length) status = "REASSIGNED";
  else if (removed.length) status = WaMessageAssignStatus.UNASSIGNED;

  const summary = assignEventSentence(actor, status, added, removed);
  const id = generateInternalMessageId();
  return {
    id,
    messageId: id,
    contactId,
    waCreatedAt: new Date().toISOString(),
    messageBody: {
      send: null,
      receive: null,
      internal: {
        text: { body: summary },
        summary,
        assignedUsers: [],
        assignStatus: status,
        triggeredByUser: { id: actor.id, name: actor.name },
      },
      exchangeProcess: "internal",
    },
    sourcePlatform: "INTERNAL",
    sourceIdentifier: null,
    sendBy: actor.id,
    sender: { name: actor.name, profilePhoto: actor.profilePhoto },
    stats: { read: "", sent: "", failed: "", delivered: "" },
  };
}

/**
 * A one-shot "open the assignee picker" request, from the thread's `A` shortcut.
 * The panel may mount only after the request (it opens the panel too), so the
 * request waits until a picker consumes it.
 */
interface AssignPickerRequest {
  pending: boolean;
  request: () => void;
  consume: () => void;
}

export const useAssignPickerRequest = create<AssignPickerRequest>()((set) => ({
  pending: false,
  request: () => set({ pending: true }),
  consume: () => set({ pending: false }),
}));
