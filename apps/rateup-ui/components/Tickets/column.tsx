"use client";

import { memo, useContext, useEffect, useRef, useState } from "react";

import {
  ActionIcon,
  Button,
  Group,
  Menu,
  Modal,
  NativeSelect,
  Paper,
  Stack,
  Textarea,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconAdjustmentsCog,
  IconEdit,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import { unsafeOverflowAutoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/unsafe-overflow/element";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { DragLocationHistory } from "@atlaskit/pragmatic-drag-and-drop/dist/types/internal-types";
import {
  draggable,
  dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { preserveOffsetOnSource } from "@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";
import invariant from "tiny-invariant";

import { useBoard } from "@/backend/tickets/tickets.query";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import { ContainedTextField } from "@/components/input/ContainedInput/ContainedInput";
import { TicketType } from "@/utils/enums/ticket";

import { Card, CardShadow } from "./card";
import { blockBoardPanningAttr } from "./data-attributes";
import { isSafari } from "./is-safari";
import { isShallowEqual } from "./is-shallow-equal";
import { SettingsContext } from "./settings-context";
import {
  BoardInfo,
  CardData,
  Column as ColumnType,
  getColumnData,
  isCardData,
  isCardDropTargetData,
  isColumnData,
  isDraggingACard,
  isDraggingAColumn,
} from "./types";

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

/**
 * A memoized component for rendering out the card.
 *
 * Created so that state changes to the column don't require all cards to be rendered
 */
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
  const [state, setState] = useState<TColumnState>(idle);
  const [isEditModalOpen, { open: openEditModal, close: closeEditModal }] =
    useDisclosure(false);
  const [editTitle, setEditTitle] = useState(column.title);
  const [selectedBoardId, setSelectedBoardId] = useState(currentBoardId || "");

  // Add Card State
  const [
    isAddCardModalOpen,
    { open: openAddCardModal, close: closeAddCardModal },
  ] = useDisclosure(false);
  const [newCard, setNewCard] = useState<{
    title: string;
    description: string;
  }>({
    title: "",
    description: "",
  });

  // Get API mutation functions
  const { createCard, updateCard, deleteCard } = useBoard(currentBoardId || "");

  // Update timestamp when modal opens
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
              // Simple drag preview generation: just cloning the current element.
              // Not using react for this.
              const rect = inner.getBoundingClientRect();
              const preview = inner.cloneNode(true);
              invariant(preview instanceof HTMLElement);
              preview.style.width = `${rect.width}px`;
              preview.style.height = `${rect.height}px`;

              // rotation of native drag previews does not work in safari
              if (!isSafari()) {
                preview.style.transform = "rotate(4deg)";
              }

              container.appendChild(preview);
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
      style={{
        display: "flex",
        width: "18rem",
        flexShrink: 0,
        userSelect: "none",
        flexDirection: "column",
      }}
      ref={outerFullHeightRef}
    >
      <Paper
        style={{
          display: "flex",
          maxHeight: "100%",
          flexDirection: "column",
          borderRadius: "12px",
          backgroundColor: "var(--board-bg)",
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
          <Group
            justify={"space-between"}
            align={"center"}
            p={"sm"}
            pb={"xs"}
            ref={headerRef}
            bg={"white"}
            bd={"1px solid var(--light-blue-5)"}
            style={{
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
              borderBottomColor: "white",
            }}
          >
            <Title order={5} c="gray.7" tt="uppercase">
              {column.title}
            </Title>

            <Menu shadow="md" width={200} position="bottom-end">
              <Menu.Target>
                <ActionIcon variant="transparent" aria-label="More actions">
                  <IconAdjustmentsCog size={20} />
                </ActionIcon>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconEdit size={14} />}
                  onClick={openEditModal}
                >
                  Edit
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconTrash size={14} />}
                  color="red"
                  onClick={handleDelete}
                >
                  Delete
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
              overflowAnchor: "none",
              scrollbarColor: "var(--board-scrollbar) var(--board-bg) ",
              scrollbarWidth: "thin",
              transition: "height 0.3s ease-in-out", // Add smooth transition for height
              minHeight: "50px", // Ensure column always has some height
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
          <Group p={"sm"} px={28}>
            <Button
              radius={15}
              leftSection={<IconPlus size={16} />}
              variant="light"
              onClick={handleOpenAddCardModal}
              fullWidth
            >
              Add a card
            </Button>
          </Group>
        </div>
      </Paper>

      {/* Edit Column Modal */}
      <Modal
        opened={isEditModalOpen}
        onClose={closeEditModal}
        title="Edit Column"
        size="sm"
      >
        <Stack gap="md">
          <ContainedTextField
            label="Title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Column title"
            autoFocus
          />

          {/* {availableBoards && availableBoards.length > 0 && (
            <NativeSelect
              label="Board"
              value={selectedBoardId}
              onChange={(e) => setSelectedBoardId(e.target.value)}
              data={availableBoards.map((board) => ({
                value: board.id,
                label: board.title,
              }))}
            />
          )} */}

          <Group justify="right" mt="md">
            <RateupButtonPrimary
              variant="outline"
              onClick={closeEditModal}
              title="Cancel"
            />
            <RateupButtonPrimary onClick={handleSaveEdit} title="Save" />
          </Group>
        </Stack>
      </Modal>

      {/* Add Card Modal */}
      <Modal
        opened={isAddCardModalOpen}
        onClose={closeAddCardModal}
        title="Add Card"
        size="md"
      >
        <Stack gap="md">
          <ContainedTextField
            label="Title"
            value={newCard.title}
            onChange={(e) =>
              setNewCard((prev) => ({ ...prev, title: e.target.value }))
            }
            placeholder="Card title"
            autoFocus
            required
          />

          <Textarea
            label="Description"
            value={newCard.description}
            onChange={(e) =>
              setNewCard((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="Enter card description..."
            minRows={3}
          />
          <Group justify="right" mt="md">
            <RateupButtonPrimary
              variant="outline"
              onClick={closeAddCardModal}
              title="Cancel"
            />
            <RateupButtonPrimary onClick={handleAddCard} title="Save" />
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
