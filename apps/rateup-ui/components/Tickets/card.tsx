import { MutableRefObject, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";

import {
  ActionIcon,
  Badge,
  Box,
  Divider,
  Group,
  Menu,
  Stack,
  Text,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconClock, IconDotsVertical, IconTrash } from "@tabler/icons-react";
import {
  attachClosestEdge,
  extractClosestEdge,
  type Edge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
  draggable,
  dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { preserveOffsetOnSource } from "@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";
import { createPortal } from "react-dom";
import invariant from "tiny-invariant";

import { useUserInfo } from "@/backend/user/user.query";
import { formatDate, getTimeRemaining } from "@/utils/dateTime";
import { showWarnToast } from "@/utils/notifications";

import {
  getCardData,
  getCardDropTargetData,
  isCardData,
  isDraggingACard,
  TCard,
} from "./data";
import { isSafari } from "./is-safari";
import { isShallowEqual } from "./is-shallow-equal";

type TCardState =
  | {
      type: "idle";
    }
  | {
      type: "is-dragging";
    }
  | {
      type: "is-dragging-and-left-self";
    }
  | {
      type: "is-over";
      dragging: DOMRect;
      closestEdge: Edge;
    }
  | {
      type: "preview";
      container: HTMLElement;
      dragging: DOMRect;
    };

const idle: TCardState = { type: "idle" };

const innerStyles: { [Key in TCardState["type"]]?: string } = {
  idle: "hover:outline  outline-neutral-50 cursor-grab",
  "is-dragging": "opacity-40",
};

const outerStyles: { [Key in TCardState["type"]]?: string } = {
  // We no longer render the draggable item after we have left it
  // as it's space will be taken up by a shadow on adjacent items.
  // Using `display:none` rather than returning `null` so we can always
  // return refs from this component.
  // Keeping the refs allows us to continue to receive events during the drag.
  "is-dragging-and-left-self": "hidden",
};

export function CardShadow({ dragging }: { dragging: DOMRect }) {
  return (
    <div
      style={{
        flexShrink: 0,
        borderRadius: "4px",
        backgroundColor: "var(--board-card-shadow)",
        height: dragging.height,
      }}
    />
  );
}

export function CardDisplay({
  card,
  state,
  outerRef,
  innerRef,
  onClick,
  onDelete,
}: {
  card: TCard;
  state: TCardState;
  outerRef?: React.MutableRefObject<HTMLDivElement | null>;
  innerRef?: MutableRefObject<HTMLDivElement | null>;
  onClick?: () => void;
  onDelete?: () => void;
}) {
  // Stop propagation to prevent opening the card details when clicking on the menu
  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const priorityStyles: Record<string, { bg: string; color: string }> = {
    low: { bg: "#dcfce7", color: "#166534" },
    medium: { bg: "#f3e8ff", color: "#7e22ce" },
    high: { bg: "#fef9c3", color: "#92400e" },
    critical: { bg: "#ffe5e5", color: "#c92a2a" },
    na: { bg: "#edf2f7", color: "#6b7280" },
  };

  // Get priority key and styles
  const priorityKey = card.priority?.toLowerCase() || "na";
  const barStyle = priorityStyles[priorityKey] || priorityStyles.na;

  // Add class for animations
  const getAnimationClass = () => {
    if (state.type === "is-dragging") return "card-exiting";
    if (state.type === "preview") return ""; // No animation for preview
    return "card-entering";
  };

  return (
    <div
      ref={outerRef}
      className={getAnimationClass()}
      style={{
        display: "flex",
        flexShrink: 0,
        flexDirection: "column",
        gap: "8px",
        paddingLeft: ".75rem",
        paddingRight: ".75rem",
        paddingTop: ".75rem",
        ...(state.type === "is-dragging-and-left-self"
          ? { display: "none" }
          : {}),
      }}
    >
      {/* Put a shadow before the item if closer to the top edge */}
      {state.type === "is-over" && state.closestEdge === "top" ? (
        <CardShadow dragging={state.dragging} />
      ) : null}
      <div
        ref={innerRef}
        style={{
          borderRadius: "4px",
          backgroundColor: "var(--board-card-bg)",
          padding: "8px",
          color: "var(--board-card-text)",
          position: "relative", // Needed for absolute positioning of menu
          ...(state.type === "idle" ? { cursor: "pointer" } : {}),
          ...(state.type === "is-dragging" ? { opacity: 0.4 } : {}),
          ...(state.type === "preview"
            ? {
                width: state.dragging.width,
                height: state.dragging.height,
                transform: !isSafari() ? "rotate(4deg)" : undefined,
              }
            : {}),
        }}
        onClick={state.type === "idle" ? onClick : undefined}
      >
        {/* Card menu */}
        {state.type === "idle" && (
          <div
            style={{
              position: "absolute",
              right: ".5rem",
            }}
            onClick={handleMenuClick}
          >
            <Menu withinPortal position="bottom-end" shadow="md" offset={4}>
              <Menu.Target>
                <ActionIcon
                  mt={21}
                  mr={8}
                  variant="white"
                  size="sm"
                  color="var(--board-scrollbar)"
                >
                  <IconDotsVertical size={16} />
                </ActionIcon>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Item
                  color="red"
                  leftSection={<IconTrash size={16} />}
                  onClick={onDelete}
                >
                  Delete
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </div>
        )}

        <Box
          style={{
            borderRadius: 12,
            overflow: "hidden",
            background: "#fff",
            border: `1px solid #e9ecef`,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
          }}
        >
          {/* Top Bar */}
          <Box h={6} style={{ backgroundColor: barStyle.color }} />

          {/* Card Body */}
          <Stack gap={8} p={4} py={6}>
            {card.title && (
              <Text
                size="lg"
                fw={700}
                gradient={{ from: "teal", to: "#5c6ac4", deg: 65 }}
                variant="gradient"
              >
                {card.title}
              </Text>
            )}

            <Divider color={"var(--grey-color-5)"} />

            <Group py={4}>
              {[
                { label: "Source", value: card.type },
                { label: "Priority", value: card.priority ?? "NA" },
              ].map((item, i) => {
                const isPriority = item.label === "Priority";
                const key = item.value?.toString().toLowerCase();
                const styles = isPriority
                  ? priorityStyles[key] || priorityStyles.na
                  : { bg: "#e0f2fe", color: "#0369a1" };

                return (
                  <Stack gap={0} key={i}>
                    <Text size="xs" ta="center" c="var(--board-scrollbar)">
                      {item.label}
                    </Text>
                    <Badge
                      size="sm"
                      fw="normal"
                      variant="light"
                      style={{
                        backgroundColor: styles.bg,
                        color: styles.color,
                        textTransform: "capitalize",
                      }}
                    >
                      {item.value}
                    </Badge>
                  </Stack>
                );
              })}
            </Group>

            <Divider color={"var(--grey-color-5)"} />

            <Group justify="space-between" py={2}>
              <Group gap={4}>
                <Text size="xs" c={"var(--board-scrollbar)"}>
                  Created on:
                </Text>
                <Text size="xs">{formatDate(card.createdAt)}</Text>
              </Group>
              <Group gap={4} display={card.deadline ? "flex" : "none"}>
                <IconClock size={16} />
                <Text size="xs" c={"red"} fw="bold">
                  {getTimeRemaining(card.deadline)}
                </Text>
              </Group>
            </Group>
          </Stack>
        </Box>
      </div>
      {/* Put a shadow after the item if closer to the bottom edge */}
      {state.type === "is-over" && state.closestEdge === "bottom" ? (
        <CardShadow dragging={state.dragging} />
      ) : null}
    </div>
  );
}

export function Card({
  card,
  columnId,
  onDelete,
}: {
  card: TCard;
  columnId: string;
  onDelete?: (cardId: string) => void;
}) {
  const outerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<TCardState>(idle);
  const [editedCard, setEditedCard] = useState<{
    title: string;
    description: string;
  }>({
    title: card.title || "",
    description: card.description,
  });
  const router = useRouter();
  // get userInformation for checking the role
  const { data: userRes } = useUserInfo() as { data: { data: UserData } };
  const role = userRes?.data?.role;
  const isAdmin = role === "SUPER_ADMIN" || role === "ADMIN";

  // Reset edited card when original card changes
  useEffect(() => {
    setEditedCard({
      title: card.title || "",
      description: card.description,
    });
  }, [card]);

  const handleDeleteCard = () => {
    if (!isAdmin) {
      showWarnToast("Only admin or super admin can delete this ticket.");
      return;
    }

    modals.openConfirmModal({
      title: "Delete ",
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to delete this? This action cannot be undone.
        </Text>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: () => {
        if (onDelete) {
          onDelete(card.id);
        }
      },
    });
  };

  // Card dragging functionality
  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    invariant(outer && inner);

    return combine(
      draggable({
        element: inner,
        getInitialData: ({ element }) =>
          getCardData({
            card,
            columnId,
            rect: element.getBoundingClientRect(),
          }),
        onGenerateDragPreview({ nativeSetDragImage, location, source }) {
          const data = source.data;
          invariant(isCardData(data));
          setCustomNativeDragPreview({
            nativeSetDragImage,
            getOffset: preserveOffsetOnSource({
              element: inner,
              input: location.current.input,
            }),
            render({ container }) {
              // Demonstrating using a react portal to generate a preview
              setState({
                type: "preview",
                container,
                dragging: inner.getBoundingClientRect(),
              });
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
        getIsSticky: () => true,
        canDrop: isDraggingACard,
        getData: ({ element, input }) => {
          const data = getCardDropTargetData({ card, columnId });
          return attachClosestEdge(data, {
            element,
            input,
            allowedEdges: ["top", "bottom"],
          });
        },
        onDragEnter({ source, self }) {
          if (!isCardData(source.data)) {
            return;
          }
          if (source.data.card.id === card.id) {
            return;
          }
          const closestEdge = extractClosestEdge(self.data);
          if (!closestEdge) {
            return;
          }

          setState({
            type: "is-over",
            dragging: source.data.rect,
            closestEdge,
          });
        },
        onDrag({ source, self }) {
          if (!isCardData(source.data)) {
            return;
          }
          if (source.data.card.id === card.id) {
            return;
          }
          const closestEdge = extractClosestEdge(self.data);
          if (!closestEdge) {
            return;
          }
          // optimization - Don't update react state if we don't need to.
          const proposed: TCardState = {
            type: "is-over",
            dragging: source.data.rect,
            closestEdge,
          };
          setState((current) => {
            if (isShallowEqual(proposed, current)) {
              return current;
            }
            return proposed;
          });
        },
        onDragLeave({ source }) {
          if (!isCardData(source.data)) {
            return;
          }
          if (source.data.card.id === card.id) {
            setState({ type: "is-dragging-and-left-self" });
            return;
          }
          setState(idle);
        },
        onDrop() {
          setState(idle);
        },
      }),
    );
  }, [card, columnId]);

  return (
    <>
      <CardDisplay
        outerRef={outerRef}
        innerRef={innerRef}
        state={state}
        card={card}
        onClick={() => router.push(`/dashboard/tickets/${card.id}`)}
        onDelete={handleDeleteCard}
      />
      {state.type === "preview"
        ? createPortal(
            <CardDisplay state={state} card={card} />,
            state.container,
          )
        : null}
    </>
  );
}
