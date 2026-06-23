"use client";

import { memo, useContext, useEffect, useRef, useState } from "react";

import {
  IconDots,
  IconEdit,
  IconPlus,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
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
import { Ticket } from "lucide-react";
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
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { TicketType } from "@/utils/enums/ticket.ts";

import { Input } from "../ui/input.tsx";
import { Card, CardShadow, PRIORITY_CONFIG } from "./card.tsx";
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
  const [newCard, setNewCard] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    deadline: "",
  });
  const openEditModal = () => setIsEditModalOpen(true);
  const closeEditModal = () => setIsEditModalOpen(false);

  const [editTitle, setEditTitle] = useState(column.title);
  const [selectedBoardId, setSelectedBoardId] = useState(currentBoardId || "");

  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
  const openAddCardModal = () => setIsAddCardModalOpen(true);
  const closeAddCardModal = () => setIsAddCardModalOpen(false);

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

    const payload: any = {
      title: newCard.title,
      description: newCard.description || "",
      ticketColumnId: column.id,
      type: TicketType.CUSTOM,
      priority: newCard.priority as any,
    };

    if (newCard.deadline) {
      payload.deadline = newCard.deadline;
    }

    createCard(payload);

    // Reset and close modal
    setNewCard({
      title: "",
      description: "",
      priority: "MEDIUM",
      deadline: "",
    });
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
      className="w-xs shrink-0 flex flex-col max-h-full"
      ref={outerFullHeightRef}
    >
      <div
        className={`transition-all duration-150 border rounded-xl p-1.5 ${
          state.type === "is-column-over"
            ? "border-2 border-dashed border-blue-500/50 bg-blue-500/5"
            : "border border-dashed border-slate-300 dark:border-slate-700 bg-transparent"
        }`}
        style={{
          display: "flex",
          maxHeight: "100%",
          flexDirection: "column",
          color: "var(--board-text)",
          opacity: state.type === "is-dragging" ? 0.4 : 1,
          cursor: state.type === "idle" ? "grab" : "default",
        }}
        ref={innerRef}
        {...{ [blockBoardPanningAttr]: true }}
      >
        <div
          style={{
            display: "flex",
            maxHeight: "100%",
            flexDirection: "column",
            visibility: state.type === "is-column-over" ? "hidden" : "visible",
          }}
        >
          <div
            className="flex items-center gap-[7px] px-3 py-2.5 mb-2 group/column-header"
            ref={headerRef}
          >
            <span className="w-[9px] h-[9px] rounded-full shrink-0 bg-slate-400" />
            <span className="font-display font-extrabold text-[13.5px] text-foreground flex-1 tracking-tight truncate">
              {column.title}
            </span>
            <span
              className="font-body text-[11px] font-bold rounded-full text-slate-800 bg-slate-100"
              style={{
                padding: "2px 8px",
              }}
            >
              {column.ticketCards.length}
            </span>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="w-[22px] h-[22px] rounded-md border-none bg-transparent text-muted-foreground cursor-pointer flex items-center justify-center transition-all duration-150 hover:bg-muted opacity-0 group-hover/column-header:opacity-100"
                  aria-label="More actions"
                >
                  <IconDots size={16} />
                </button>
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

            <button
              onClick={handleOpenAddCardModal}
              className="w-[22px] h-[22px] rounded-md border-none bg-transparent text-muted-foreground cursor-pointer flex items-center justify-center transition-all duration-150 hover:bg-muted hover:text-primary"
            >
              <IconPlus size={13} strokeWidth={2.5} />
            </button>
          </div>

          <div
            style={{
              overflowAnchor: "none",
              scrollbarColor: "rgba(150, 150, 150, 0.2) transparent",
              scrollbarWidth: "thin",
            }}
            ref={scrollableRef}
            className={`column-cards-container flex-1 flex flex-col overflow-y-auto transition-all duration-150 min-h-[80px] p-[1px] rounded-xl border-2 border-dashed ${
              state.type === "is-card-over"
                ? "bg-blue-800/5 border-blue-800/30"
                : "bg-transparent border-transparent"
            }`}
          >
            <CardList column={column} onCardDelete={handleCardDelete} />
            {state.type === "is-card-over" && !state.isOverChildCard ? (
              <div
                style={{
                  flexShrink: 0,
                }}
              >
                <CardShadow dragging={state.dragging} />
              </div>
            ) : null}
            {column.ticketCards.length === 0 &&
              state.type !== "is-card-over" && (
                <div className="h-14 flex items-center justify-center text-muted-foreground font-body text-xs border-2 border-dashed border-border rounded-lg">
                  {t("No tickets")}
                </div>
              )}
          </div>
          {isAddCardModalOpen ? null : (
            <button
              onClick={handleOpenAddCardModal}
              className="mx-1 mt-2 p-2 rounded-lg bg-transparent border-2 border-dashed border-border text-muted-foreground font-body text-sm font-semibold cursor-pointer flex items-center justify-center gap-2 px-3 transition-all duration-150 hover:bg-muted/60 hover:text-foreground shrink-0"
            >
              <IconPlus size={16} strokeWidth={2.5} /> {t("Add ticket")}
            </button>
          )}
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
            <DialogTitle>{t("Add Ticket")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-5 py-2">
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-semibold">
                {t("Title")} <span className="text-red-500">*</span>
              </Label>
              <Input
                value={newCard.title}
                onChange={(e) =>
                  setNewCard((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder={t("e.g., Fix the navigation bug")}
                className="h-10"
                autoFocus
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-sm font-semibold">
                {t("Description")}
              </Label>
              <Textarea
                value={newCard.description}
                onChange={(e) =>
                  setNewCard((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder={t("Add a more detailed description...")}
                className="resize-none"
                rows={4}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-sm font-semibold">{t("Priority")}</Label>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(PRIORITY_CONFIG)
                  .filter(([k]) => k !== "na")
                  .map(([k, v]) => {
                    const priorityKey = newCard.priority.toLowerCase();
                    const isSelected = priorityKey === k;
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() =>
                          setNewCard((prev) => ({
                            ...prev,
                            priority: k.toUpperCase(),
                          }))
                        }
                        className="rounded-full font-body text-[11.5px] font-semibold cursor-pointer transition-all duration-150"
                        style={{
                          padding: "4px 10px",
                          border: isSelected
                            ? `2px solid ${v.dot}`
                            : `2px solid ${v.bg}`,
                          background: v.bg,
                          color: v.color,
                          boxShadow: isSelected
                            ? `0 0 0 2px ${v.dot}22`
                            : "none",
                        }}
                      >
                        {t(v.label)}
                      </button>
                    );
                  })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-sm font-semibold">{t("Due Date")}</Label>
              <Input
                type="date"
                value={newCard.deadline}
                onChange={(e) =>
                  setNewCard((prev) => ({ ...prev, deadline: e.target.value }))
                }
                min={new Date().toISOString().split("T")[0]}
                className="h-10"
                onClick={(e) =>
                  "showPicker" in e.target && (e.target as any).showPicker()
                }
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={closeAddCardModal}
              className="h-10 px-5"
            >
              {t("Cancel")}
            </Button>
            <Button
              onClick={handleAddCard}
              className="h-10 px-5 font-semibold shadow-sm"
            >
              <Ticket size={16} className="mr-2" /> {t("Add Ticket")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
