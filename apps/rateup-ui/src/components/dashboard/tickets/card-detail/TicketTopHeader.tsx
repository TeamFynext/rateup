// Extracted verbatim from `CardDetailPage.tsx`. Behaviour is unchanged.

import { IconAlertCircle, IconSquareCheck, IconX } from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useBoardsQueries,
  useUpdateCardMutation,
  useLabels,
} from "@/backend/tickets/tickets.query";
import { parseColor } from "@/components/Tickets/card.tsx";
import type { Card } from "@/components/Tickets/types.ts";

import { useDebounce } from "./shared.tsx";

export function TicketTopHeader({
  ticket,
  ticketId,
  onClose,
}: Readonly<{
  ticket: Card;
  ticketId: string;
  onClose: () => void;
}>) {
  const { t } = useTranslation();
  const { mutate } = useUpdateCardMutation();
  const [title, setTitle] = useState(ticket.title || "");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const [debouncedTitle] = useDebounce(title, 800);

  const { data: boards } = useBoardsQueries();
  const currentCol = useMemo(() => {
    if (!boards || !ticket.ticketColumnId) return null;
    for (const b of boards) {
      const col = b.ticketColumns?.find((c) => c.id === ticket.ticketColumnId);
      if (col) return col;
    }
    return null;
  }, [boards, ticket.ticketColumnId]);

  const { labels } = useLabels(currentCol?.ticketBoardId ?? "");

  const isOverdue = !!(ticket.deadline && new Date(ticket.deadline) < new Date());

  const ticketLabel = labels?.find((l) => l.id === ticket.labelId);
  const labelColor = ticketLabel ? parseColor(ticketLabel.color) : null;

  useEffect(() => {
    if (debouncedTitle !== ticket.title) {
      mutate({ id: ticketId, title: debouncedTitle });
    }
  }, [debouncedTitle, ticketId, mutate, ticket.title]);

  const commitTitle = () => {
    setIsEditingTitle(false);
    if (title !== ticket.title) {
      mutate({ id: ticketId, title });
    }
  };

  const allItems = (ticket.checklists || []).flatMap((cl) => cl.items || []);
  const doneItems = allItems.filter((i) => i.done).length;
  const totalItems = allItems.length;

  return (
    <div className="border-b border-border flex items-start gap-3 bg-background px-4 py-3 md:px-6 md:pt-4.5 md:pb-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="font-body text-[11px] font-bold text-muted-foreground tracking-wider uppercase">
            #{ticket.ticketId || ticketId.substring(0, 8)}
          </span>
          {currentCol && (
            <span
              className="inline-flex items-center gap-1 rounded-full font-body text-[11px] font-bold border border-border"
              style={{
                padding: "2px 9px",
                background: "var(--muted)",
                color: "var(--foreground)",
              }}
            >
              <span className="w-1.25 h-1.25 rounded-full bg-primary" />
              {currentCol.title}
            </span>
          )}
          {ticketLabel ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full font-body text-[11px] font-bold tracking-wider capitalize"
              style={{
                padding: "2px 9px",
                background: labelColor?.bgcolor,
                color: labelColor?.textcolor,
                border: `1px solid ${labelColor?.bgcolor}`,
              }}
            >
              {ticketLabel.name}
            </span>
          ) : null}
          {isOverdue && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-700 font-body text-[11px] font-bold border border-red-200"
              style={{ padding: "2px 9px" }}
            >
              <IconAlertCircle size={11} className="text-red-700" strokeWidth={2} /> {t("Overdue")}
            </span>
          )}
          {totalItems > 0 && (
            <span
              className="inline-flex items-center gap-1 rounded-full font-body text-[11px] font-semibold"
              style={{
                padding: "2px 9px",
                background: doneItems === totalItems ? "#F0FDF4" : "#F4F5F2",
                color: doneItems === totalItems ? "#15803D" : "#666864",
              }}
            >
              <IconSquareCheck
                size={11}
                strokeWidth={2}
                style={{
                  color: doneItems === totalItems ? "#16A34A" : "#8B8E8A",
                }}
              />
              {doneItems}/{totalItems}
            </span>
          )}
        </div>

        {isEditingTitle ? (
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTitle();
              if (e.key === "Escape") {
                setIsEditingTitle(false);
                setTitle(ticket.title || "");
              }
            }}
            className="font-display font-extrabold text-base md:text-[21px] text-foreground tracking-tight border-none outline-none w-full bg-transparent"
            style={{
              borderBottom: "2px solid var(--primary)",
              padding: "0 0 2px",
            }}
          />
        ) : (
          <div
            onClick={() => {
              setIsEditingTitle(true);
              setTimeout(() => titleRef.current?.focus(), 20);
            }}
            className="font-display font-extrabold text-base md:text-[21px] text-foreground leading-[1.2] cursor-text tracking-tight hover:opacity-80 transition-opacity"
          >
            {title || t("Untitled Ticket")}
          </div>
        )}
      </div>

      <div className="flex gap-0.5 shrink-0">
        <button
          onClick={onClose}
          className="w-7.5 h-7.5 rounded-[7px] border-none bg-transparent text-muted-foreground cursor-pointer flex items-center justify-center transition-colors hover:bg-muted/50"
        >
          <IconX size={16} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
