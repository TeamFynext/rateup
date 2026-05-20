// For backwards compatibility, we'll alias the types with T prefix
import type {
  Board as TBoard,
  BoardInfo as TBoardInfo,
  Card as TCard,
  Activity as TCardActivity,
  CardData as TCardData,
  CardDropTargetData as TCardDropTargetData,
  Column as TColumn,
  ColumnData as TColumnData,
} from "./types.ts";

export {
  // Re-export all types and helpers from types.ts
  type Card,
  type Activity,
  type Column,
  type BoardInfo,
  type Board,
  type CardData,
  type CardDropTargetData,
  type ColumnData,
  getCardData,
  isCardData,
  isDraggingACard,
  isCardDropTargetData,
  getCardDropTargetData,
  getColumnData,
  isColumnData,
  isDraggingAColumn,
} from "./types.ts";

export type {
  TBoard,
  TBoardInfo,
  TCard,
  TCardActivity,
  TColumn,
  TCardData,
  TCardDropTargetData,
  TColumnData,
};
