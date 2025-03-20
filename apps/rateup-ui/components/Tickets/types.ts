// Shared ticket types used across the application

import { TicketType } from "@/utils/enums/ticket";

// Base ticket types
export interface User {
  id: string;
  name: string;
  email?: string;
  profilePhoto?: string | null;
}

export interface Board {
  id: string;
  title: string;
  teamId: string;
  ticketColumns: Column[];
}

export interface BoardInfo {
  id: string;
  title: string;
  teamId: string;
}

export interface Column {
  id: string;
  title: string;
  teamId: string;
  ticketBoardId?: string;
  ticketCards: Card[];
}

export interface Card {
  id: string;
  title?: string;
  description?: string;
  ticketId?: string;
  deadline?: Date | null;
  assignedToId?: string | null;
  priority?: string | null;
  category?: string | null;
  status?: string | null;
  type?: TicketType;
  createdAt?: string | Date;
  columnId?: string;
  ticketActivities?: Activity[];
  ticketColumn?: {
    ticketBoard?: {
      team?: {
        members?: Array<{
          user: User;
        }>;
      };
    };
  };
  ticketComments?: Array<TicketComment>;
  surveyResponseId?: string;
  surveyResponse: {
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
    };
    surveyTeamMap: {
      survey: {
        WaFlow: {
          json: any;
        };
      };
    };
  };
  waAutomatedReplyMessageId?: string;
  waAutomatedReplyMessage?: WaAutomatedReplyMessage;
}
export type WaAutomatedReplyMessage = {
  id: string;
  createdAt: string;
  message: string;
  phone: number;
  currentScreen: string;
  waAutomatedReplyId: string;
  orgId: string;
  waAutomatedReply: {
    name: string;
  };
};

export interface Activity {
  id: string;
  type: "ADDED_MEMBER" | "ADDED_CARD" | "MOVED_CARD" | "EDITED_CARD";
  user?: User;
  userId?: string;
  timestamp: string;
  cardId?: string;
  details?: {
    title?: string;
    fromColumnName?: string;
    toColumnName?: string;
    memberName?: string;
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

export function isCardData(
  value: Record<string | symbol, unknown>,
): value is CardData {
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

export function getColumnData({
  ticketColumn,
}: Omit<ColumnData, typeof columnKey>): ColumnData {
  return {
    [columnKey]: true,
    ticketColumn,
  };
}

export function isColumnData(
  value: Record<string | symbol, unknown>,
): value is ColumnData {
  return Boolean(value[columnKey]);
}

export function isDraggingAColumn({
  source,
}: {
  source: { data: Record<string | symbol, unknown> };
}): boolean {
  return isColumnData(source.data);
}
