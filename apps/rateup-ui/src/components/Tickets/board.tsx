import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import { extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { reorder } from "@atlaskit/pragmatic-drag-and-drop/reorder";
import { IconPlus } from "@tabler/icons-react";
import { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import invariant from "tiny-invariant";

import { useBoard } from "@/backend/tickets/tickets.query";
import { useUserInfo } from "@/backend/user/user.query";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";

import { Column } from "./column.tsx";
import { SettingsContext } from "./settings-context.tsx";
import type { BoardInfo, Board as BoardType, Column as TColumn } from "./types.ts";
import {
  isCardData,
  isCardDropTargetData,
  isColumnData,
  isDraggingACard,
  isDraggingAColumn,
} from "./types.ts";

export function Board({
  initial,
  priorityFilter,
  searchQuery,
  assigneeFilter,
  availableBoards,
}: {
  initial: BoardType;
  priorityFilter: string | null;
  searchQuery?: string;
  assigneeFilter?: string | null;
  availableBoards?: BoardInfo[];
}) {
  const { t } = useTranslation();
  const { settings } = useContext(SettingsContext);
  const scrollableRef = useRef<HTMLDivElement | null>(null);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const open = () => setIsAddingColumn(true);
  const close = () => setIsAddingColumn(false);

  const [deleteColumnId, setDeleteColumnId] = useState<string | null>(null);
  // get userInformation for checking the role
  const { data: userRes } = useUserInfo() as { data: { data: UserData } };
  const role = userRes?.data?.role;
  const isAdmin = role === "SUPER_ADMIN" || role === "ADMIN";

  // Use Tanstack Query hooks
  const {
    board,
    isLoading,
    createColumn,
    updateColumn,
    deleteColumn,
    moveColumn,
    moveCard,
    reorderCard,
    reorderColumns,
  } = useBoard(initial.id);

  // Use the fetched board data or fall back to initial prop
  const data = board || initial;

  const handleAddColumn = () => {
    if (!newColumnTitle.trim()) return;

    createColumn({
      title: newColumnTitle,
      ticketBoardId: data.id,
    });

    close();
    setNewColumnTitle("");
  };

  const handleDeleteColumn = (columnId: string) => {
    if (!isAdmin) {
      toast.warning(t("Only admin or super admin can delete this."));
      return;
    }

    setDeleteColumnId(columnId);
  };

  const handleUpdateColumn = (columnId: string, updates: Partial<TColumn>) => {
    if (updates.title) {
      updateColumn({ id: columnId, title: updates.title });
    }
  };

  const handleMoveColumnToBoard = (
    columnId: string,
    targetBoardId: string,
    updatedTitle?: string,
  ) => {
    moveColumn({
      columnId,
      targetBoardId,
      title: updatedTitle,
    });
  };

  useEffect(() => {
    const element = scrollableRef.current;
    invariant(element);
    return combine(
      monitorForElements({
        canMonitor: isDraggingACard,
        onDrop({ source, location }) {
          const dragging = source.data;
          if (!isCardData(dragging)) {
            return;
          }

          const innerMost = location.current.dropTargets[0];

          if (!innerMost) {
            return;
          }

          const dropTargetData = innerMost.data;
          const sourceColumnId = dragging.columnId;

          // dropping on a card
          if (isCardDropTargetData(dropTargetData)) {
            const targetColumnId = dropTargetData.columnId;

            // If in the same column, reorder cards
            if (sourceColumnId === targetColumnId) {
              const column = data.ticketColumns.find((col) => col.id === sourceColumnId);

              if (column) {
                const cardIndexInHome = column.ticketCards.findIndex(
                  (card) => card.id === dragging.card.id,
                );

                const targetCardIndex = column.ticketCards.findIndex(
                  (card) => card.id === dropTargetData.card.id,
                );

                if (cardIndexInHome !== -1 && targetCardIndex !== -1) {
                  const closestEdge = extractClosestEdge(dropTargetData);

                  // Calculate final index based on closest edge
                  const finalIndex =
                    closestEdge === "bottom" ? targetCardIndex + 1 : targetCardIndex;

                  // Create a new cards array in the correct order
                  const newCards = Array.from(column.ticketCards);
                  // Remove the card from its current position
                  const [movedCard] = newCards.splice(cardIndexInHome, 1);
                  // Insert it at the final position
                  newCards.splice(
                    finalIndex > cardIndexInHome ? finalIndex - 1 : finalIndex,
                    0,
                    movedCard,
                  );

                  // Create the cards order array with all cards and their indices
                  const cardsOrder = newCards.map((card, index) => ({
                    id: card.id,
                    order: index,
                  }));

                  // Call reorderCard API with all cards in the column
                  reorderCard({
                    columnId: sourceColumnId,
                    cards: cardsOrder,
                  });
                }
              }
              return;
            }

            // If moving to a different column
            moveCard({
              cardId: dragging.card.id,
              sourceColumnId,
              targetColumnId,
            });
          }

          // dropping onto a column, but not onto a card
          if (isColumnData(dropTargetData)) {
            const targetColumnId = dropTargetData.ticketColumn.id;
            console.log("🚀 ~ onDrop ~ targetColumnId:", targetColumnId);

            if (sourceColumnId === targetColumnId) {
              // Move to the end of the same column
              const column = data.ticketColumns.find((col) => col.id === sourceColumnId);

              if (column) {
                const cardIndex = column.ticketCards.findIndex(
                  (card) => card.id === dragging.card.id,
                );

                if (cardIndex !== -1) {
                  // Create a new cards array with the card moved to the end
                  const newCards = Array.from(column.ticketCards);
                  // Remove the card from its current position
                  const [movedCard] = newCards.splice(cardIndex, 1);
                  // Add the card to the end
                  newCards.push(movedCard);

                  // Create cards order array
                  const cardsOrder = newCards.map((card, index) => ({
                    id: card.id,
                    order: index,
                  }));

                  // Call reorderCard API with all cards
                  reorderCard({
                    columnId: sourceColumnId,
                    cards: cardsOrder,
                  });
                }
              }
              return;
            }

            // If moving to a different column
            moveCard({
              cardId: dragging.card.id,
              sourceColumnId,
              targetColumnId,
            });
          }
        },
      }),
      monitorForElements({
        canMonitor: isDraggingAColumn,
        onDrop({ source, location }) {
          const dragging = source.data;
          if (!isColumnData(dragging)) {
            return;
          }

          const innerMost = location.current.dropTargets[0];

          if (!innerMost) {
            return;
          }
          const dropTargetData = innerMost.data;

          if (!isColumnData(dropTargetData)) {
            return;
          }
          const homeIndex = data.ticketColumns.findIndex(
            (column) => column.id === dragging.ticketColumn.id,
          );
          const destinationIndex = data.ticketColumns.findIndex(
            (column) => column.id === dropTargetData.ticketColumn.id,
          );

          if (homeIndex === -1 || destinationIndex === -1) {
            return;
          }

          if (homeIndex === destinationIndex) {
            return;
          }

          // Create a new columns array with the reordered columns
          const reordered = reorder({
            list: data.ticketColumns,
            startIndex: homeIndex,
            finishIndex: destinationIndex,
          });

          // Create column order array with all columns and their indices
          const columnsOrder = reordered.map((column, index) => ({
            id: column.id,
            order: index,
          }));

          // Call reorderColumns API with all columns
          reorderColumns({
            boardId: data.id,
            columns: columnsOrder,
          });
        },
      }),
      autoScrollForElements({
        canScroll({ source }) {
          if (!settings.isOverElementAutoScrollEnabled) {
            return false;
          }

          return isDraggingACard({ source }) || isDraggingAColumn({ source });
        },
        getConfiguration: () => ({ maxScrollSpeed: settings.boardScrollSpeed }),
        element,
      }),
    );
  }, [data, settings, moveCard, reorderCard, reorderColumns]);

  if (isLoading) return <RateupLoader />;

  return (
    <div className="flex flex-col gap-4 w-full h-full overflow-hidden">
      <div className="flex flex-1 min-w-0 w-full overflow-hidden">
        <div
          ref={scrollableRef}
          className="flex gap-3 pb-4 px-6 overflow-x-auto w-full max-h-[calc(100vh-121px)]"
          style={
            settings.isBoardMoreObvious
              ? {
                  borderRadius: "0.25rem",
                  borderWidth: "2px",
                  borderStyle: "dashed",
                }
              : {}
          }
        >
          {data.ticketColumns.length > 0 &&
            data.ticketColumns.map((column) => {
              const filteredColumn = {
                ...column,
                ticketCards: column.ticketCards.filter((card) => {
                  let matches = true;
                  if (priorityFilter && card.priority !== priorityFilter) {
                    matches = false;
                  }
                  if (searchQuery) {
                    const query = searchQuery.toLowerCase();
                    if (
                      !card.title.toLowerCase().includes(query) &&
                      !card.description?.toLowerCase().includes(query)
                    ) {
                      matches = false;
                    }
                  }
                  if (assigneeFilter) {
                    const isAssigned = card.assignees?.some((a) => a.assigneeId === assigneeFilter);
                    if (!isAssigned) matches = false;
                  }
                  return matches;
                }),
              };

              return (
                <Column
                  key={column.id}
                  column={filteredColumn}
                  onDelete={handleDeleteColumn}
                  onUpdate={handleUpdateColumn}
                  onMoveToBoard={handleMoveColumnToBoard}
                  currentBoardId={data.id}
                />
              );
            })}

          {/* Column add form */}
          {isAddingColumn ? (
            <div className="flex flex-col w-[280px] shrink-0 bg-muted/30 p-3 rounded-[12px] border border-border/50 shadow-sm self-start mt-0">
              <Input
                autoFocus
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                placeholder={t("Enter list title...")}
                className="h-9 bg-background text-sm mb-3 shadow-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddColumn();
                  if (e.key === "Escape") close();
                }}
              />
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleAddColumn}
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 font-semibold"
                >
                  {t("Add list")}
                </Button>
                <Button
                  onClick={close}
                  size="sm"
                  variant="ghost"
                  className="h-8 px-3 text-muted-foreground hover:text-foreground"
                >
                  {t("Cancel")}
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={open}
              className="w-[280px] shrink-0 h-[46px] rounded-[12px] self-start mt-0 border-2 border-dashed border-border/60 bg-transparent text-muted-foreground font-body text-sm font-semibold cursor-pointer flex items-center justify-center gap-1.5 transition-all duration-150 hover:border-primary/50 hover:text-primary hover:bg-muted/30"
            >
              <IconPlus size={16} strokeWidth={2.5} /> {t("Add another list")}
            </button>
          )}

          <AlertDialog
            open={!!deleteColumnId}
            onOpenChange={(open) => !open && setDeleteColumnId(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("Delete List")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("Are you sure you want to delete this list? This action cannot be undone.")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeleteColumnId(null)}>
                  {t("Cancel")}
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => {
                    if (deleteColumnId) {
                      deleteColumn(deleteColumnId);
                      setDeleteColumnId(null);
                    }
                  }}
                >
                  {t("Delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
