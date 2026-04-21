"use client";

import { useContext, useEffect, useRef, useState } from "react";

import { Button, Flex, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { IconPlus } from "@tabler/icons-react";
import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import { extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { reorder } from "@atlaskit/pragmatic-drag-and-drop/reorder";
import { toast } from "sonner";
import invariant from "tiny-invariant";

import { useBoard } from "@/backend/tickets/tickets.query";
import { useUserInfo } from "@/backend/user/user.query";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import { ContainedTextField } from "@/components/input/ContainedInput/ContainedInput";
import RateupLoader from "@/components/Loaders/RateupLoader";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";

import { Column } from "./column";
import { TColumn } from "./data";
import { SettingsContext } from "./settings-context";
import {
  BoardInfo,
  Board as BoardType,
  isCardData,
  isCardDropTargetData,
  isColumnData,
  isDraggingACard,
  isDraggingAColumn,
} from "./types";

export function Board({
  initial,
  priorityFilter,
  availableBoards,
}: {
  initial: BoardType;
  priorityFilter: string;
  availableBoards?: BoardInfo[];
}) {
  const { settings } = useContext(SettingsContext);
  const scrollableRef = useRef<HTMLDivElement | null>(null);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [isAddingColumn, { open, close }] = useDisclosure(false);
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
      toast.warning("Only admin or super admin can delete this.");
      return;
    }

    modals.openConfirmModal({
      title: "Delete ",
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to delete this? This action cannot be undone
        </Text>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: () => {
        deleteColumn(columnId);
      },
    });
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
              const column = data.ticketColumns.find(
                (col) => col.id === sourceColumnId,
              );

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
                    closestEdge === "bottom"
                      ? targetCardIndex + 1
                      : targetCardIndex;

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
              const column = data.ticketColumns.find(
                (col) => col.id === sourceColumnId,
              );

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
    <Flex direction="column" gap="md">
      <Flex flex={1}>
        <Flex
          ref={scrollableRef}
          gap={"sm"}
          mah={"calc(100vh - 121px)"}
          style={{
            overflowX: "auto",
            ...(settings.isBoardMoreObvious
              ? {
                  borderRadius: "0.25rem",
                  borderWidth: "2px",
                  borderStyle: "dashed",
                }
              : {}),
          }}
        >
          {data.ticketColumns.length > 0 &&
            data.ticketColumns.map((column) => {
              const filteredColumn = {
                ...column,
                ticketCards: priorityFilter
                  ? column.ticketCards.filter(
                      (card) => card.priority === priorityFilter,
                    )
                  : column.ticketCards,
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
            <Flex direction="column" style={{ width: 280 }}>
              <PaperLayout radius={"md"}>
                <ContainedTextField
                  autoFocus
                  value={newColumnTitle}
                  onChange={(e) => setNewColumnTitle(e.target.value)}
                  placeholder="Enter column title..."
                />
                <Flex gap="xs" mt={"xs"}>
                  <RateupButtonPrimary
                    onClick={handleAddColumn}
                    size="xs"
                    variant="filled"
                    title="Save"
                  />
                  <RateupButtonPrimary
                    onClick={close}
                    size="xs"
                    variant="subtle"
                    title="Cancel"
                  />
                </Flex>
              </PaperLayout>
            </Flex>
          ) : (
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={open}
              variant="light"
              radius={"md"}
              miw={200}
            >
              Add another list
            </Button>
          )}
        </Flex>
      </Flex>
    </Flex>
  );
}
