"use client";

import type { MutableRefObject } from "react";
import { useEffect, useRef, useState } from "react";

import {
  attachClosestEdge,
  extractClosestEdge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import type { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
  draggable,
  dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { preserveOffsetOnSource } from "@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";
import { useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { Calendar, MessageSquare, MoreHorizontal, Trash2 } from "lucide-react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import invariant from "tiny-invariant";

import { useCardTeamMembersById } from "@/backend/tickets/tickets.query";
import { useUserInfo } from "@/backend/user/user.query";
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
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { getFileUrlFromKey } from "@/utils/file-upload/upload.ts";

import type { TCard } from "./data.ts";
import {
  getCardData,
  getCardDropTargetData,
  isCardData,
  isDraggingACard,
} from "./data.ts";
import { isShallowEqual } from "./is-shallow-equal.ts";

type TCardState =
  | { type: "idle" }
  | { type: "is-dragging" }
  | { type: "is-dragging-and-left-self" }
  | { type: "is-over"; dragging: DOMRect; closestEdge: Edge }
  | { type: "preview"; container: HTMLElement; dragging: DOMRect };

const idle: TCardState = { type: "idle" };

export function CardShadow({ dragging }: { dragging: DOMRect }) {
  return (
    <div
      style={{
        flexShrink: 0,
        borderRadius: "0.75rem",
        backgroundColor: "var(--board-card-shadow)",
        height: dragging.height,
      }}
    />
  );
}

const PRIORITY_STYLES: Record<
  string,
  { outline: string; text: string; dot: string; bg: string }
> = {
  high: {
    outline: "border-yellow-200",
    text: "text-yellow-700",
    dot: "bg-yellow-500",
    bg: "bg-yellow-50/50",
  },
  medium: {
    outline: "border-blue-200",
    text: "text-blue-700",
    dot: "bg-blue-500",
    bg: "bg-blue-50/50",
  },
  urgent: {
    outline: "border-red-200",
    text: "text-red-700",
    dot: "bg-red-500",
    bg: "bg-red-50/50",
  },
  critical: {
    outline: "border-red-200",
    text: "text-red-700",
    dot: "bg-red-500",
    bg: "bg-red-50/50",
  },
  low: {
    outline: "border-gray-200",
    text: "text-gray-700",
    dot: "bg-gray-400",
    bg: "bg-gray-50/50",
  },
  na: {
    outline: "border-gray-200",
    text: "text-gray-500",
    dot: "bg-gray-300",
    bg: "bg-gray-50/50",
  },
};

const TAG_COLORS = [
  "bg-blue-50 text-blue-600",
  "bg-red-50 text-red-600",
  "bg-purple-50 text-purple-600",
  "bg-yellow-50 text-yellow-700",
  "bg-green-50 text-green-600",
];

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
  const { t } = useTranslation();
  const { data: members = [] } = useCardTeamMembersById(card.id);

  const assignedMemberId = card.assignees?.[0]?.assigneeId;
  const assignee = members.find((m: any) => m.id === assignedMemberId);

  const dateFormatted = card.createdAt
    ? format(new Date(card.createdAt), "dd MMM")
    : "";
  const isOverdue = card.deadline
    ? new Date(card.deadline).getTime() < Date.now()
    : false;

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const priorityKey = card.priority?.toLowerCase() || "na";
  const priorityStyle = PRIORITY_STYLES[priorityKey] || PRIORITY_STYLES.na;

  const getAnimationClass = () => {
    if (state.type === "is-dragging") return "opacity-40";
    if (state.type === "preview") return "";
    return "";
  };

  const tags = [];
  if (card.category) tags.push(card.category);
  if (card.type) tags.push(card.type);

  return (
    <div
      ref={outerRef}
      className={getAnimationClass()}
      style={{
        display: "flex",
        flexShrink: 0,
        flexDirection: "column",
        gap: "8px",
        padding: "0.5rem",
        ...(state.type === "is-dragging-and-left-self"
          ? { display: "none" }
          : {}),
      }}
    >
      {state.type === "is-over" && state.closestEdge === "top" ? (
        <CardShadow dragging={state.dragging} />
      ) : null}

      <div
        ref={innerRef}
        onClick={state.type === "idle" ? onClick : undefined}
        className={`bg-card rounded-xl p-4 border shadow-sm relative group transition-all duration-150 ${state.type === "idle" ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5" : ""} ${state.type === "preview" ? "rotate-2" : ""}`}
        style={
          state.type === "preview"
            ? { width: state.dragging.width, height: state.dragging.height }
            : {}
        }
      >
        {state.type === "idle" && (
          <div
            className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleMenuClick}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-6 w-6 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive cursor-pointer"
                  onClick={onDelete}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("Delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <div className="pr-6">
          <h3 className="font-bold text-[13px] leading-tight text-foreground line-clamp-2">
            {card.title || t("Untitled Ticket")}
          </h3>
        </div>

        <div className="flex items-center gap-1.5 mt-2.5">
          <div
            className={`w-1.5 h-1.5 rounded-full ${assignee ? "bg-green-500" : "bg-gray-300"}`}
          />
          <span className="text-xs text-muted-foreground font-medium">
            {assignee ? assignee.name : t("Unassigned")}
          </span>
        </div>

        <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
          <div className="flex flex-wrap gap-1.5 flex-1">
            {tags.map((tag, idx) => {
              const colorClass = TAG_COLORS[idx % TAG_COLORS.length];
              return (
                <span
                  key={idx}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide capitalize ${colorClass}`}
                >
                  {tag}
                </span>
              );
            })}
          </div>

          <div className="flex items-center gap-2.5 text-muted-foreground shrink-0">
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="text-[10px]">
                {card.ticketComments?.length || 0}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-3">
            <div
              className={`px-2 py-0.5 rounded-full border ${priorityStyle.outline} ${priorityStyle.bg} flex items-center gap-1.5`}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full ${priorityStyle.dot}`}
              />
              <span
                className={`text-[10px] font-bold capitalize ${priorityStyle.text}`}
              >
                {t(card.priority || "Medium")}
              </span>
            </div>

            <div
              className={`flex items-center gap-1 text-[11px] font-semibold ${isOverdue ? "text-red-500" : "text-muted-foreground"}`}
            >
              <Calendar className="h-3 w-3" />
              {dateFormatted}
            </div>
          </div>

          {assignee && (
            <Avatar className="h-5 w-5 border">
              <AvatarImage src={getFileUrlFromKey(assignee.profilePhoto)} />
              <AvatarFallback className="text-[8px] bg-primary text-primary-foreground font-bold">
                {assignee.name
                  ?.split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .substring(0, 2)
                  .toUpperCase() || "UN"}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>

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
  const { t } = useTranslation();
  const outerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<TCardState>(idle);
  const navigate = useNavigate();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { data: userRes } = useUserInfo() as {
    data: { data: { role: string } };
  };
  const role = userRes?.data?.role;
  const isAdmin = role === "SUPER_ADMIN" || role === "ADMIN";

  const handleDeleteClick = () => {
    if (!isAdmin) {
      toast.warning(t("Only admin or super admin can delete this ticket."));
      return;
    }
    setIsDeleteDialogOpen(true);
  };

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
          if (!isCardData(source.data)) return;
          if (source.data.card.id === card.id) return;
          const closestEdge = extractClosestEdge(self.data);
          if (!closestEdge) return;

          setState({
            type: "is-over",
            dragging: source.data.rect,
            closestEdge,
          });
        },
        onDrag({ source, self }) {
          if (!isCardData(source.data)) return;
          if (source.data.card.id === card.id) return;
          const closestEdge = extractClosestEdge(self.data);
          if (!closestEdge) return;

          const proposed: TCardState = {
            type: "is-over",
            dragging: source.data.rect,
            closestEdge,
          };
          setState((current) => {
            if (isShallowEqual(proposed, current)) return current;
            return proposed;
          });
        },
        onDragLeave({ source }) {
          if (!isCardData(source.data)) return;
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
        onClick={() =>
          navigate({
            to: `/dashboard/tickets/${card.id}`,
          })
        }
        onDelete={handleDeleteClick}
      />
      {state.type === "preview"
        ? createPortal(
            <CardDisplay state={state} card={card} />,
            state.container,
          )
        : null}

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete ticket?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "Are you sure you want to delete this ticket? This action cannot be undone.",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (onDelete) onDelete(card.id);
                setIsDeleteDialogOpen(false);
              }}
            >
              {t("Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
