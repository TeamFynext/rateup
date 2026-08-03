// Drag-and-drop view helpers for the ticket board.
//
// The ticket domain contracts these build on live in `@/backend/tickets/tickets.types.ts`.
// They are re-exported here so existing board components can keep importing both the shapes
// and the drag helpers from one place.

import type { Card, Column } from "@/backend/tickets/tickets.types.ts";

export type {
  Activity,
  Board,
  BoardInfo,
  BoardUpdate,
  Card,
  CardUpdate,
  Checklist,
  ChecklistItem,
  Column,
  Label,
  MemberData,
  TicketComment,
} from "@/backend/tickets/tickets.types.ts";

// Drag and drop specific types
const cardKey = Symbol("card");
export type CardData = Record<string | symbol, unknown> & {
  [cardKey]: true;
  card: Card;
  columnId: string;
  rect: DOMRect;
};

export function getCardData({
  card,
  rect,
  columnId,
}: {
  card: Card;
  rect: DOMRect;
  columnId: string;
}): CardData {
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
export type CardDropTargetData = Record<string | symbol, unknown> & {
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
}: {
  card: Card;
  columnId: string;
}): CardDropTargetData {
  return {
    [cardDropTargetKey]: true,
    card,
    columnId,
  };
}

const columnKey = Symbol("column");
export type ColumnData = Record<string | symbol, unknown> & {
  [columnKey]: true;
  ticketColumn: Column;
};

export function getColumnData({ ticketColumn }: { ticketColumn: Column }): ColumnData {
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
