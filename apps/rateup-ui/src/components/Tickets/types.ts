// Shared ticket types used across the application

import type { TicketType } from "@/utils/enums/ticket.ts";

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
  checklists?: any;
  attachments?: string[]; // array of file keys; full metadata stored in TicketActivity
}

interface surveyResponse {
  id: string;
  createdAt: string | Date;
  surveyTeamMapId: string;
  responses: Array<any>;
  response: string | number;
  questionId: string;
  encryptedResponses: null | any;
  language: string;
  platform: string;
  tag: string | null;
  ip: null | string;
  location: null | any;
  deviceData: null | any;
  contactId: string | null;
  Contact: {
    id: string;
    name: string;
    phone: string;
    lastReceivedMessageTimeStamp: string;
  };
  surveyTeamMap: {
    survey: {
      WaFlow: {
        json: any;
      };
    };
  };
}
export interface MemberData {
  id: string;
  name: string;
  profilePhoto?: string;
}
type WaAutomatedReplyMessage = {
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
};

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

// Drag and drop specific types
const cardKey = Symbol("card");
export type CardData = {
  [cardKey]: true;
  card: Card;
  columnId: string;
  rect: DOMRect;
};

export function getCardData({
  card,
  rect,
  columnId,
}: Omit<CardData, typeof cardKey> & { columnId: string }): CardData {
  return {
    [cardKey]: true,
    rect,
    card,
    columnId,
  };
}

export function isCardData(value: Record<string | symbol, unknown>): value is CardData {
  return Boolean(value[cardKey]);
}

export function isDraggingACard({
  source,
}: {
  source: { data: Record<string | symbol, unknown> };
}): boolean {
  return isCardData(source.data);
}

const cardDropTargetKey = Symbol("card-drop-target");
export type CardDropTargetData = {
  [cardDropTargetKey]: true;
  card: Card;
  columnId: string;
};

export function isCardDropTargetData(
  value: Record<string | symbol, unknown>,
): value is CardDropTargetData {
  return Boolean(value[cardDropTargetKey]);
}

export function getCardDropTargetData({
  card,
  columnId,
}: Omit<CardDropTargetData, typeof cardDropTargetKey> & {
  columnId: string;
}): CardDropTargetData {
  return {
    [cardDropTargetKey]: true,
    card,
    columnId,
  };
}

const columnKey = Symbol("column");
export type ColumnData = {
  [columnKey]: true;
  ticketColumn: Column;
};

export function getColumnData({ ticketColumn }: Omit<ColumnData, typeof columnKey>): ColumnData {
  return {
    [columnKey]: true,
    ticketColumn,
  };
}

export function isColumnData(value: Record<string | symbol, unknown>): value is ColumnData {
  return Boolean(value[columnKey]);
}

export function isDraggingAColumn({
  source,
}: {
  source: { data: Record<string | symbol, unknown> };
}): boolean {
  return isColumnData(source.data);
}
