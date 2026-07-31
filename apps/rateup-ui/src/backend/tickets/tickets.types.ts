// Ticket domain contracts, as the ticket endpoints return and accept them.
//
// The drag-and-drop helpers that used to sit alongside these live in
// `@/components/Tickets/types.ts` — they are view concerns and depend on these shapes,
// not the other way round.

import type { WaFlowJson } from "@/types/global";
import type { TicketType } from "@/utils/enums/ticket.ts";

export interface Label {
  id: string;
  name: string;
  color: string;
  ticketBoardId: string;
  createdAt?: string | Date;
}

// Base ticket types
interface User {
  id: string;
  name: string;
  email?: string;
  profilePhoto?: string | null;
}

export interface Board {
  id: string;
  title: string;
  ticketColumns: Column[];
  teams: Array<{
    teamId: string;
    createdAt?: string;
    boardId?: string;
  }>;
  ticketCreatedEmail: boolean;
  ticketCreatedWhatsapp: boolean;
  ticketAssignedEmail: boolean;
  ticketAssignedWhatsapp: boolean;
  notificationRecipients: Array<{
    userId: string;
    boardId?: string;
  }>;
  description?: string;
  createdAt?: string | Date;
}

export interface BoardInfo {
  id: string;
  title: string;
  teamIds: Array<string>;
}

export interface Column {
  id: string;
  title: string;
  teamId: string;
  /** Set by the column editor; older columns have none. */
  color?: string;
  ticketBoardId?: string;
  ticketCards: Card[];
  _count?: {
    ticketCards: number;
  };
}

export interface Card {
  id: string;
  title?: string;
  description?: string;
  ticketId?: string;
  deadline?: Date | null;
  priority?: string | null;
  category?: string | null;
  status?: string | null;
  type?: TicketType;
  labelId?: string | null;
  label?: Label | null;
  labels?: Label[];
  createdAt?: string | Date;
  columnId?: string;
  ticketColumnId?: string;
  ticketActivities?: Activity[];
  ticketComments?: Array<TicketComment>;
  surveyResponseId?: string;
  surveyResponse: surveyResponse;
  assignees: Array<{
    assigneeId: string;
  }>;
  waAutomatedReplyMessageId?: string;
  waAutomatedReplyMessage?: WaAutomatedReplyMessage;
  contactId?: string | null;
  contact?: {
    id: string;
    name: string;
    phone: string;
    lastReceivedMessageTimeStamp?: string;
    consent?: boolean;
  } | null;
  checklists?: Checklist[];
  attachments?: string[]; // array of file keys; full metadata stored in TicketActivity
}

/** A checklist on a ticket, with its items. */
export interface Checklist {
  id: string;
  name: string;
  items: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

interface surveyResponse {
  id: string;
  createdAt: string | Date;
  surveyTeamMapId: string;
  responses: Array<QuestionResponse>;
  response: string | number;
  questionId: string;
  encryptedResponses: null | string;
  language: string;
  platform: string;
  tag: string | null;
  ip: null | string;
  location: null | {
    coordinates?: Coordinates;
    city?: string;
    state?: string;
    country?: string;
  };
  deviceData: null | Record<string, unknown>;
  contactId: string | null;
  Contact: {
    id: string;
    name: string;
    phone: string;
    lastReceivedMessageTimeStamp: string;
  };
  surveyTeamMap: {
    survey: {
      /** Selected alongside the flow; present for web-survey responses. */
      questions?: Question[];
      WaFlow: {
        json: WaFlowJson;
      };
    };
  };
}

export interface MemberData {
  id: string;
  name: string;
  profilePhoto?: string;
}

interface WaAutomatedReplyMessage {
  id: string;
  createdAt: string;
  response: {
    value: string;
    action?: string;
  };
  phone: number;
  currentScreen: string;
  waAutomatedReplyId: string;
  orgId: string;
  waAutomatedReply: {
    name: string;
  };
  contact: {
    id: string;
    name: string;
    phone: string;
    lastReceivedMessageTimeStamp: string;
  };
}

export interface Activity {
  id: string;
  type:
    | "ADDED_MEMBER"
    | "REMOVED_MEMBER"
    | "ADDED_CARD"
    | "MOVED_CARD"
    | "EDITED_CARD"
    | "ADDED_ATTACHMENT"
    | "REMOVED_ATTACHMENT"
    | "ADDED_CONTACT"
    | "REMOVED_CONTACT"
    | "CHANGED_PRIORITY"
    | "ADDED_CHECKLIST"
    | "REMOVED_CHECKLIST"
    | "ADDED_CHECKLIST_ITEM"
    | "REMOVED_CHECKLIST_ITEM"
    | "CHECKED_CHECKLIST_ITEM"
    | "UNCHECKED_CHECKLIST_ITEM";
  user?: User;
  userId?: string;
  timestamp: string;
  cardId?: string;
  details?: {
    title?: string;
    fromColumnName?: string;
    toColumnName?: string;
    memberName?: string;
    contactName?: string;
    key?: string;
    fromPriority?: string;
    toPriority?: string;
    checklistName?: string;
    itemName?: string;
  };
}

export interface TicketComment {
  id: string;
  text: string;
  createdById: string;
  createdAt: string | Date;
  ticketCardId: string;
  createdBy: User;
}

/**
 * Payload for a card update: every field is optional except the id, and the
 * assignee/label sets are written as id arrays even though a read-back `Card`
 * exposes them as `assignees` / `labelId`.
 */
export type CardUpdate = Partial<Card> & {
  id: string;
  assignedToIds?: string[];
  labelIds?: string[];
};

/**
 * Payload for a board update. `teamIds` is write-only; a read-back `Board`
 * exposes the same relation as `teams`.
 */
export type BoardUpdate = Partial<Board> & {
  id: string;
  teamIds?: string[];
};
