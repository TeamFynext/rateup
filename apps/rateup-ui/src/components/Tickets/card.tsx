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
import dayjs from "dayjs";
import {
  Calendar,
  CalendarClock,
  CheckSquare,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Trash2,
  User,
} from "lucide-react";
import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import invariant from "tiny-invariant";

import { useCardTeamMembersById } from "@/backend/tickets/tickets.query";
import { useUserInfo } from "@/backend/user/user.query";
import { getUserColor } from "@/components/Tickets/BoardContent.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { getFileUrlFromKey } from "@/utils/file-upload/upload.ts";

import { getCardData, getCardDropTargetData, isCardData, isDraggingACard } from "./data.ts";
import { isShallowEqual } from "./is-shallow-equal.ts";
import type { Card as TCard } from "./types.ts";

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
      className="border-2 border-dashed border-slate-300 dark:border-slate-700 bg-transparent rounded-xl"
      style={{
        flexShrink: 0,
        height: dragging.height,
      }}
    />
  );
}

export const PRIORITY_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  low: {
    label: "Low",
    color: "#666864",
    bg: "#F4F5F2",
    border: "#D9DAD7",
    dot: "#B7B9B5",
  },
  medium: {
    label: "Medium",
    color: "#174678",
    bg: "#EEF4FB",
    border: "#A9C3E3",
    dot: "#4C7FBC",
  },
  high: {
    label: "High",
    color: "#A85C07",
    bg: "#FFF8E1",
    border: "#FFDC6D",
    dot: "#F8951D",
  },
  critical: {
    label: "Critical",
    color: "#B91C1C",
    bg: "#FEF2F2",
    border: "#FECACA",
    dot: "#DC2626",
  },
  na: {
    label: "Medium",
    color: "#174678",
    bg: "#EEF4FB",
    border: "#A9C3E3",
    dot: "#4C7FBC",
  }, // fallback
};

export const parseColor = (c: string) => {
  try {
    const parsed = JSON.parse(c);
    if (parsed && parsed.bgcolor && parsed.textcolor) return parsed;
    return { bgcolor: c, textcolor: "#171717" };
  } catch {
    return { bgcolor: c, textcolor: "#171717" };
  }
};

function CardDisplay({
  card,
  state,
  outerRef,
  innerRef,
  onClick,
  onDelete,
}: {
  card: TCard;
  state: TCardState;
  outerRef?: RefObject<HTMLDivElement | null>;
  innerRef?: RefObject<HTMLDivElement | null>;
  onClick?: () => void;
  onDelete?: () => void;
}) {
  const { t } = useTranslation();
  const { data: members = [] } = useCardTeamMembersById(card.id);

  const assignedMemberIds = card.assignees?.map((a) => a.assigneeId) || [];
  const assignees = members.filter((m) => assignedMemberIds.includes(m.id));
  const firstAssignee = assignees[0];

  const allItems = (card.checklists || []).flatMap((cl) => cl.items || []);
  const doneCount = allItems.filter((i) => i.done).length;
  const totalCount = allItems.length;

  const hasDueDate = !!card.deadline;
  const targetDate = card.deadline
    ? new Date(card.deadline)
    : card.createdAt
      ? new Date(card.createdAt)
      : null;

  const dateFormatted = targetDate ? dayjs(targetDate).format("DD MMM") : "";

  let isCloseToDueDate = false;
  let isOverdue = false;

  if (hasDueDate && card.deadline) {
    const dueDateObj = new Date(card.deadline);
    const now = Date.now();
    isOverdue = dueDateObj.getTime() < now;
    const twoDaysFromNow = now + 2 * 24 * 60 * 60 * 1000;
    isCloseToDueDate = !isOverdue && dueDateObj.getTime() <= twoDaysFromNow;
  }

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

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
        ...(state.type === "is-dragging-and-left-self" ? { display: "none" } : {}),
      }}
    >
      {state.type === "is-over" && state.closestEdge === "top" ? (
        <CardShadow dragging={state.dragging} />
      ) : null}
      <div
        ref={innerRef}
        onClick={state.type === "idle" ? onClick : undefined}
        className={`bg-card border border-border rounded-xl cursor-pointer select-none transition-all duration-150 group/card ${state.type === "idle" ? "hover:shadow-[0_4px_20px_rgba(0,0,0,.10)] hover:-translate-y-[1px]" : ""} ${state.type === "preview" ? "rotate-2" : ""}`}
        style={{
          padding: "15px 16px",
          opacity: state.type === "is-dragging" ? 0.4 : 1,
          boxShadow: state.type !== "preview" ? "0 1px 3px rgba(11,31,72,.04)" : "none",
          ...(state.type === "preview"
            ? { width: state.dragging.width, height: state.dragging.height }
            : {}),
        }}
      >
        {/* Header */}
        <div className="flex items-start gap-2">
          <div className="flex-1 font-body font-bold text-sm text-foreground leading-[1.4] line-clamp-2">
            {card.title || t("Untitled Ticket")}
          </div>
          {state.type === "idle" && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    onClick={handleMenuClick}
                    className="shrink-0 w-[22px] h-[22px] -mt-0.5 rounded-md border-none bg-transparent text-muted-foreground cursor-pointer flex items-center justify-center transition-all duration-150 hover:bg-muted opacity-0 group-hover/card:opacity-100"
                  />
                }
              >
                <MoreHorizontal size={16} strokeWidth={2} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onDelete) onDelete();
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("Delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Subtitle */}
        <div className="flex items-center gap-1.5 mt-1">
          <span
            className={`w-[7px] h-[7px] rounded-full shrink-0 ${firstAssignee ? "bg-green-500" : "bg-gray-300"}`}
          />
          <span className="font-body text-[12.5px] text-muted-foreground font-medium truncate flex items-center">
            {firstAssignee ? (
              <>
                {firstAssignee.name}
                {assignees.length > 1 && (
                  <span className="ml-1.5 font-bold tracking-wide">+{assignees.length - 1}</span>
                )}
              </>
            ) : (
              t("Unassigned")
            )}
          </span>
        </div>
        {/* Meta */}
        <div className="flex items-center gap-1.5 flex-wrap mt-[11px]">
          {/* <div>
            {tags.slice(0, 2).map((tag, idx) => {
              const colorClass = TAG_COLORS[idx % TAG_COLORS.length];
              return (
                <span
                  key={idx}
                  className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold tracking-wide capitalize ${colorClass}`}
                >
                  {tag}
                </span>
              );
            })}
          </div> */}

          {card.labels && card.labels.length > 0 ? (
            <>
              {card.labels.slice(0, 2).map((lbl) => {
                const pColor = parseColor(lbl.color);
                return (
                  <span
                    key={lbl.id}
                    className="px-2 py-0.5 rounded-full font-body text-[10.5px] font-bold tracking-wide capitalize"
                    style={{
                      backgroundColor: pColor.bgcolor,
                      color: pColor.textcolor,
                      border: `1px solid ${pColor.bgcolor}`,
                    }}
                  >
                    {lbl.name}
                  </span>
                );
              })}
              {card.labels.length > 2 && (
                <span className="px-2 py-0.5 rounded-full font-body text-[10.5px] font-bold tracking-wide text-muted-foreground bg-muted border border-border">
                  +{card.labels.length - 2}
                </span>
              )}
            </>
          ) : card.label ? (
            <span
              className="px-2 py-0.5 rounded-full font-body text-[10.5px] font-bold tracking-wide capitalize"
              style={{
                backgroundColor: parseColor(card.label.color).bgcolor,
                color: parseColor(card.label.color).textcolor,
                border: `1px solid ${parseColor(card.label.color).bgcolor}`,
              }}
            >
              {card.label.name}
            </span>
          ) : null}

          {card.attachments && card.attachments.length > 0 && (
            <span className="inline-flex items-center gap-[3px] font-body text-[11.5px] font-medium text-muted-foreground">
              <Paperclip size={12} className="text-muted-foreground" strokeWidth={2} />
              {card.attachments.length}
            </span>
          )}
          {totalCount > 0 && (
            <span
              className={`inline-flex items-center gap-[3px] font-body text-[11.5px] font-medium ${doneCount === totalCount ? "text-green-600" : "text-muted-foreground"}`}
            >
              <CheckSquare
                size={12}
                strokeWidth={2}
                className={doneCount === totalCount ? "text-green-600" : "text-gray-400"}
              />
              {doneCount}/{totalCount}
            </span>
          )}
          <span className="inline-flex items-center gap-[3px] font-body text-[11.5px] font-medium text-muted-foreground">
            <MessageCircle size={12} className="text-muted-foreground" strokeWidth={2} />
            {card.ticketComments?.length || 0}
          </span>
        </div>

        {/* Divider */}
        <div className="h-px bg-border my-3" />

        {/* Footer */}
        <div className="flex items-center justify-end gap-[9px]">
          <div className="flex items-center gap-[9px]">
            {dateFormatted && (
              <span
                className={`inline-flex items-center gap-1 font-body text-[11.5px] font-medium ${isOverdue ? "text-red-600" : isCloseToDueDate ? "text-amber-600" : "text-muted-foreground"}`}
              >
                {hasDueDate ? (
                  <CalendarClock
                    size={12}
                    strokeWidth={2}
                    className={
                      isOverdue
                        ? "text-red-600"
                        : isCloseToDueDate
                          ? "text-amber-600"
                          : "text-gray-400"
                    }
                  />
                ) : (
                  <Calendar size={12} strokeWidth={2} className="text-gray-400" />
                )}
                {dateFormatted}
              </span>
            )}
            {assignees.length > 0 ? (
              <div className="flex items-center -space-x-1.5">
                {assignees.slice(0, 3).map((a, i: number) => (
                  <Avatar
                    key={a.id}
                    className="h-[22px] w-[22px] border-2 border-background"
                    style={{ zIndex: 3 - i }}
                  >
                    <AvatarImage src={getFileUrlFromKey(a.profilePhoto ?? "")} />
                    <AvatarFallback
                      className="text-[9px] font-bold text-white"
                      style={{ backgroundColor: getUserColor(a.id) }}
                    >
                      {a.name?.substring(0, 2).toUpperCase() || "UN"}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {assignees.length > 3 && (
                  <div
                    className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-muted border-2 border-background text-[9px] font-bold text-muted-foreground"
                    style={{ zIndex: 0 }}
                  >
                    +{assignees.length - 3}
                  </div>
                )}
              </div>
            ) : (
              <div className="w-[22px] h-[22px] rounded-full border-[1.5px] border-dashed border-border flex items-center justify-center">
                <User size={11} className="text-muted-foreground" />
              </div>
            )}
          </div>
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
  const confirm = useConfirm();
  const { data: userRes } = useUserInfo() as {
    data: { data: { role: string } };
  };
  const role = userRes?.data?.role;
  const isAdmin = role === "SUPER_ADMIN" || role === "ADMIN";

  const handleDeleteClick = async () => {
    if (!isAdmin) {
      toast.warning(t("Only admin or super admin can delete this ticket."));
      return;
    }

    const shouldDelete = await confirm({
      title: t("Delete ticket?"),
      description: t("Are you sure you want to delete this ticket? This action cannot be undone."),
      confirmText: t("Delete"),
      cancelText: t("Cancel"),
    });

    if (!shouldDelete) return;

    if (onDelete) onDelete(card.id);
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
        ? createPortal(<CardDisplay state={state} card={card} />, state.container)
        : null}
    </>
  );
}
