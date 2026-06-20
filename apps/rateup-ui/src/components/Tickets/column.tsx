"use client";

import { memo, useContext, useEffect, useRef, useState } from "react";

import { IconDots, IconEdit, IconPlus, IconTrash } from "@tabler/icons-react";
import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import { unsafeOverflowAutoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/unsafe-overflow/element";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import type { DragLocationHistory } from "@atlaskit/pragmatic-drag-and-drop/dist/types/internal-types";
import {
  draggable,
  dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { preserveOffsetOnSource } from "@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";
import { useTranslation } from "react-i18next";
import invariant from "tiny-invariant";

import { useBoard } from "@/backend/tickets/tickets.query";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { TicketType } from "@/utils/enums/ticket.ts";

import { Card, CardShadow } from "./card.tsx";
import { blockBoardPanningAttr } from "./data-attributes.ts";
import { isShallowEqual } from "./is-shallow-equal.ts";
import { SettingsContext } from "./settings-context.tsx";
import type { BoardInfo, CardData, Column as ColumnType } from "./types.ts";
import {
  getColumnData,
  isCardData,
  isCardDropTargetData,
  isColumnData,
  isDraggingACard,
  isDraggingAColumn,
} from "./types.ts";

type TColumnState =
  | {
      type: "is-card-over";
      isOverChildCard: boolean;
      dragging: DOMRect;
    }
  | {
      type: "is-column-over";
    }
  | {
      type: "idle";
    }
  | {
      type: "is-dragging";
    };

const stateStyles = {
  idle: { cursor: "grab" },
  "is-card-over": { outline: "2px solid var(--board-card-over)" },
  "is-dragging": { opacity: 0.4 },
  "is-column-over": { backgroundColor: "var(--is-column-over)" },
};

const idle = { type: "idle" } satisfies TColumnState;

const CardList = memo(function CardList({
  column,
  onCardDelete,
}: {
  column: ColumnType;
  onCardDelete?: (cardId: string) => void;
}) {
  return (
    <>
      {column.ticketCards.map((card) => (
        <Card
          key={card.id}
          card={card}
          columnId={column.id}
          onDelete={onCardDelete}
        />
      ))}
    </>
  );
});

export function Column({
  column,
  onDelete,
  onUpdate,
  onMoveToBoard,
  availableBoards,
  currentBoardId,
}: {
  column: ColumnType;
  onDelete?: (columnId: string) => void;
  onUpdate?: (columnId: string, updates: Partial<ColumnType>) => void;
  onMoveToBoard?: (
    columnId: string,
    targetBoardId: string,
    updatedTitle?: string,
  ) => void;
  availableBoards?: BoardInfo[];
  currentBoardId?: string;
}) {
  const scrollableRef = useRef<HTMLDivElement | null>(null);
  const outerFullHeightRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const { settings } = useContext(SettingsContext);
  const { t } = useTranslation();
  const [state, setState] = useState<TColumnState>(idle);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const openEditModal = () => setIsEditModalOpen(true);
  const closeEditModal = () => setIsEditModalOpen(false);

  const [editTitle, setEditTitle] = useState(column.title);
  const [selectedBoardId, setSelectedBoardId] = useState(currentBoardId || "");

  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
  const openAddCardModal = () => setIsAddCardModalOpen(true);
  const closeAddCardModal = () => setIsAddCardModalOpen(false);

  const [newCard, setNewCard] = useState<{
    title: string;
    description: string;
  }>({
    title: "",
    description: "",
  });

  const { createCard, updateCard, deleteCard } = useBoard(currentBoardId || "");

  const handleOpenAddCardModal = () => {
    openAddCardModal();
  };

  // Reset edit form when column changes
  useEffect(() => {
    setEditTitle(column.title);
    setSelectedBoardId(currentBoardId || "");
  }, [column.title, currentBoardId]);

  const handleSaveEdit = () => {
    if (editTitle.trim()) {
      // Update column title if staying in the same board
      if (selectedBoardId === currentBoardId && onUpdate) {
        onUpdate(column.id, { title: editTitle });
      }

      // Move to a different board if needed
      if (
        onMoveToBoard &&
        selectedBoardId !== currentBoardId &&
        selectedBoardId
      ) {
        onMoveToBoard(column.id, selectedBoardId, editTitle);
      }

      closeEditModal();
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(column.id);
    }
  };

  const handleAddCard = () => {
    if (!newCard.title.trim()) return;

    createCard({
      title: newCard.title,
      description: newCard.description || "",
      ticketColumnId: column.id,
      type: TicketType.CUSTOM,
    });

    // Reset and close modal
    setNewCard({ title: "", description: "" });
    closeAddCardModal();
  };

  // Handle card deletion
  const handleCardDelete = (cardId: string) => {
    deleteCard(cardId);
  };

  useEffect(() => {
    const outer = outerFullHeightRef.current;
    const scrollable = scrollableRef.current;
    const header = headerRef.current;
    const inner = innerRef.current;
    invariant(outer);
    invariant(scrollable);
    invariant(header);
    invariant(inner);

    const data = getColumnData({ ticketColumn: column });

    function setIsCardOver({
      data,
      location,
    }: {
      data: CardData;
      location: DragLocationHistory;
    }) {
      const innerMost = location.current.dropTargets[0];
      const isOverChildCard = Boolean(
        innerMost && isCardDropTargetData(innerMost.data),
      );

      const proposed: TColumnState = {
        type: "is-card-over",
        dragging: data.rect,
        isOverChildCard,
      };
      // optimization - don't update state if we don't need to.
      setState((current) => {
        if (isShallowEqual(proposed, current)) {
          return current;
        }
        return proposed;
      });
    }

    return combine(
      draggable({
        element: header,
        getInitialData: () => data,
        onGenerateDragPreview({ source, location, nativeSetDragImage }) {
          const data = source.data;
          invariant(isColumnData(data));
          setCustomNativeDragPreview({
            nativeSetDragImage,
            getOffset: preserveOffsetOnSource({
              element: header,
              input: location.current.input,
            }),
            render({ container }) {
              setState({ type: "is-dragging" });
              const el = document.createElement("div");
              el.textContent = data.ticketColumn.title;
              el.style.padding = "8px 16px";
              el.style.backgroundColor = "white";
              el.style.borderRadius = "4px";
              el.style.boxShadow = "0 4px 6px -1px rgb(0 0 0 / 0.1)";
              container.appendChild(el);
            },
          });
        },
        onDragStart() {
          setState({ type: "is-dragging" });
        },
        onDrop() {
          setState(idle);
        },
      }),
      dropTargetForElements({
        element: outer,
        getData: () => data,
        canDrop({ source }) {
          return isDraggingACard({ source }) || isDraggingAColumn({ source });
        },
        getIsSticky: () => true,
        onDragStart({ source, location }) {
          if (isCardData(source.data)) {
            setIsCardOver({ data: source.data, location });
          }
        },
        onDragEnter({ source, location }) {
          if (isCardData(source.data)) {
            setIsCardOver({ data: source.data, location });
            return;
          }
          if (
            isColumnData(source.data) &&
            source.data.ticketColumn.id !== column.id
          ) {
            setState({ type: "is-column-over" });
          }
        },
        onDropTargetChange({ source, location }) {
          if (isCardData(source.data)) {
            setIsCardOver({ data: source.data, location });
            return;
          }
        },
        onDragLeave({ source }) {
          if (
            isColumnData(source.data) &&
            source.data.ticketColumn.id === column.id
          ) {
            return;
          }
          setState(idle);
        },
        onDrop() {
          setState(idle);
        },
      }),
      autoScrollForElements({
        canScroll({ source }) {
          if (!settings.isOverElementAutoScrollEnabled) {
            return false;
          }

          return isDraggingACard({ source });
        },
        getConfiguration: () => ({
          maxScrollSpeed: settings.columnScrollSpeed,
        }),
        element: scrollable,
      }),
      unsafeOverflowAutoScrollForElements({
        element: scrollable,
        getConfiguration: () => ({
          maxScrollSpeed: settings.columnScrollSpeed,
        }),
        canScroll({ source }) {
          if (!settings.isOverElementAutoScrollEnabled) {
            return false;
          }

          if (!settings.isOverflowScrollingEnabled) {
            return false;
          }

          return isDraggingACard({ source });
        },
        getOverflow() {
          return {
            forTopEdge: {
              top: 1000,
            },
            forBottomEdge: {
              bottom: 1000,
            },
          };
        },
      }),
    );
  }, [column, settings]);

  return (
    <div
      className="flex w-[85vw] max-w-[320px] md:w-72 shrink-0 select-none flex-col"
      ref={outerFullHeightRef}
    >
      <div
        className="border-2 border-dashed border-border/40 rounded-xl"
        style={{
          display: "flex",
          maxHeight: "100%",
          flexDirection: "column",
          backgroundColor: "transparent",
          color: "var(--board-text)",
          ...stateStyles[state.type],
        }}
        ref={innerRef}
        {...{ [blockBoardPanningAttr]: true }}
      >
        {/* Extra wrapping element to make it easy to toggle visibility of content when a column is dragging over */}
        <div
          style={{
            display: "flex",
            maxHeight: "100%",
            flexDirection: "column",
            visibility: state.type === "is-column-over" ? "hidden" : "visible",
          }}
        >
          <div
            className="flex items-center justify-between p-3 pb-2 group/column-header"
            ref={headerRef}
          >
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <h6 className="font-bold text-base text-foreground m-0">
                {column.title}
              </h6>
            </div>

            <div className="flex items-center gap-1 transition-opacity">
              <span className="flex h-5 items-center justify-center rounded-full bg-muted px-2 text-[11px] font-medium text-muted-foreground">
                {column.ticketCards.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={handleOpenAddCardModal}
              >
                <IconPlus size={16} className="text-muted-foreground" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    aria-label="More actions"
                  >
                    <IconDots size={16} className="text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[150px]">
                  <DropdownMenuItem onSelect={openEditModal}>
                    <IconEdit size={14} className="mr-2" />
                    {t("Edit")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                    onSelect={handleDelete}
                  >
                    <IconTrash size={14} className="mr-2" />
                    {t("Delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
              overflowAnchor: "none",
              scrollbarColor: "rgba(150, 150, 150, 0.2) transparent",
              scrollbarWidth: "thin",
              transition: "height 0.3s ease-in-out",
              minHeight: "50px",
            }}
            ref={scrollableRef}
            className="column-cards-container"
          >
            <CardList column={column} onCardDelete={handleCardDelete} />
            {state.type === "is-card-over" && !state.isOverChildCard ? (
              <div
                style={{
                  flexShrink: 0,
                  padding: "0.75rem",
                  paddingTop: "0.25rem",
                  paddingBottom: "0.25rem",
                }}
              >
                <CardShadow dragging={state.dragging} />
              </div>
            ) : null}
          </div>
          <div className="p-2 pt-0 mt-2">
            <Button
              variant="outline"
              className="w-full bg-transparent text-muted-foreground border-dashed hover:bg-muted"
              onClick={handleOpenAddCardModal}
            >
              <IconPlus size={14} className="mr-2" />
              {t("Add ticket")}
            </Button>
          </div>
        </div>
      </div>

      <Dialog
        open={isEditModalOpen}
        onOpenChange={(open) => !open && closeEditModal()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Edit Column")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>{t("Title")}</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder={t("Column title")}
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <Button variant="outline" onClick={closeEditModal}>
                {t("Cancel")}
              </Button>
              <Button onClick={handleSaveEdit}>{t("Save")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isAddCardModalOpen}
        onOpenChange={(open) => !open && closeAddCardModal()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Add Card")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>
                {t("Title")} <span className="text-red-500">*</span>
              </Label>
              <Input
                value={newCard.title}
                onChange={(e) =>
                  setNewCard((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder={t("Card title")}
                autoFocus
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>{t("Description")}</Label>
              <Textarea
                value={newCard.description}
                onChange={(e) =>
                  setNewCard((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder={t("Enter card description...")}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <Button variant="outline" onClick={closeAddCardModal}>
                {t("Cancel")}
              </Button>
              <Button onClick={handleAddCard}>{t("Save")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
