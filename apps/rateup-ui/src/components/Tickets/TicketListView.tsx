import { useNavigate } from "@tanstack/react-router";
import dayjs from "dayjs";
import { Calendar, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { MemberData } from "@/components/Tickets/types.ts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";

import { PRIORITY_CONFIG } from "./card.tsx";
import type { Board as BoardType, Card, Column as ColumnType } from "./types.ts";

export function TicketListView({
  board,
  labelFilters,
  searchQuery,
  assigneeFilter,
  boardMembers = [],
}: {
  board: BoardType;
  labelFilters: string[];
  searchQuery: string;
  assigneeFilter: string | null;
  boardMembers?: MemberData[];
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Flatten tickets
  const tickets: Array<{ card: Card; col: ColumnType }> = [];
  board.ticketColumns.forEach((col) => {
    col.ticketCards.forEach((card) => {
      tickets.push({ card, col });
    });
  });

  const filtered = tickets.filter(({ card }) => {
    let matches = true;
    if (labelFilters && labelFilters.length > 0) {
      if (!card.labels?.some((l: any) => labelFilters.includes(l.id))) {
        matches = false;
      }
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !card.title?.toLowerCase().includes(query) &&
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
  });

  const PRIORITY_ORDER: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortBy === "id") {
      const idA = a.card.ticketId || a.card.id;
      const idB = b.card.ticketId || b.card.id;
      cmp = idA.localeCompare(idB);
    } else if (sortBy === "title") {
      cmp = (a.card.title || "").localeCompare(b.card.title || "");
    } else if (sortBy === "priority") {
      const pA = a.card.priority?.toLowerCase() || "low";
      const pB = b.card.priority?.toLowerCase() || "low";
      cmp = (PRIORITY_ORDER[pA] ?? 3) - (PRIORITY_ORDER[pB] ?? 3);
    } else if (sortBy === "status") {
      const colOrder = Object.fromEntries(board.ticketColumns.map((c, i) => [c.id, i]));
      cmp = (colOrder[a.col.id] ?? 0) - (colOrder[b.col.id] ?? 0);
    } else if (sortBy === "due") {
      const da = a.card.deadline ? new Date(a.card.deadline).getTime() : 9999999999999;
      const db = b.card.deadline ? new Date(b.card.deadline).getTime() : 9999999999999;
      cmp = da - db;
    } else if (sortBy === "createdAt") {
      const da = a.card.createdAt ? new Date(a.card.createdAt).getTime() : 0;
      const db = b.card.createdAt ? new Date(b.card.createdAt).getTime() : 0;
      cmp = da - db;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const handleSort = (col: string) => {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(col);
      setSortDir("asc");
    }
  };

  const Th = ({
    id,
    label,
    width,
    sortable = true,
  }: {
    id: string;
    label: string;
    width?: number | string;
    sortable?: boolean;
  }) => (
    <th
      onClick={sortable ? () => handleSort(id) : undefined}
      className="py-2.5 px-3.5 text-left bg-white border-b-2 border-border select-none whitespace-nowrap"
      style={{ width, cursor: sortable ? "pointer" : "default" }}
    >
      <span
        className={`inline-flex items-center gap-1 font-body text-[11px] font-bold tracking-wider uppercase ${sortBy === id ? "text-primary" : "text-gray-500"}`}
      >
        {label}
        {sortable && (
          <span
            className="inline-flex transition-transform duration-150"
            style={{
              transform: sortBy === id && sortDir === "asc" ? "rotate(180deg)" : "none",
            }}
          >
            <ChevronDown size={11} className={sortBy === id ? "text-primary" : "text-gray-300"} />
          </span>
        )}
      </span>
    </th>
  );

  return (
    <div className="flex-1 overflow-y-auto bg-white h-full px-2">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_hsl(var(--border))]">
          <tr>
            <Th id="id" label={t("ID")} width={80} />
            <Th id="title" label={t("Title")} />
            <Th id="priority" label={t("Label")} width={110} />
            <Th id="status" label={t("Status")} width={155} />
            <Th id="assignee" label={t("Assignee")} width={148} sortable={false} />
            <Th id="customer" label={t("Customer")} width={165} sortable={false} />
            <Th id="due" label={t("Due")} width={108} />
          </tr>
        </thead>
        <tbody>
          {sorted.map(({ card, col }) => {
            const isOverdue = !!(card.deadline && new Date(card.deadline) < new Date());
            const pConf =
              PRIORITY_CONFIG[card.priority?.toLowerCase() || "low"] || PRIORITY_CONFIG.low;

            // Extract customer
            let customerName = null;
            let channel = null;
            if (card.contact?.name) {
              customerName = card.contact.name;
              channel = "manual";
            } else if (card.surveyResponse?.Contact?.name) {
              customerName = card.surveyResponse.Contact.name;
              channel = "survey";
            } else if (card.waAutomatedReplyMessage?.contact?.name) {
              customerName = card.waAutomatedReplyMessage.contact.name;
              channel = "whatsapp";
            }

            return (
              <ListRow
                key={card.id}
                card={card}
                col={col}
                isOverdue={isOverdue}
                pConf={pConf}
                customerName={customerName}
                channel={channel}
                boardMembers={boardMembers}
                onClick={() => navigate({ to: `/dashboard/tickets/${card.id}` })}
              />
            );
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={7} className="p-16 text-center font-body text-sm text-muted-foreground">
                {t("No tickets match your filters")}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ListRow({
  card,
  col,
  isOverdue,
  pConf,
  customerName,
  channel,
  boardMembers,
  onClick,
}: {
  card: Card;
  col: ColumnType;
  isOverdue: boolean;
  pConf: any;
  customerName: string | null;
  channel: string | null;
  boardMembers: MemberData[];
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const { t } = useTranslation();

  const avatarColors = [
    "#ef4444",
    "#f97316",
    "#f59e0b",
    "#10b981",
    "#3b82f6",
    "#6366f1",
    "#8b5cf6",
    "#ec4899",
  ];
  const getUserColor = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash += id.charCodeAt(i);
    return avatarColors[hash % avatarColors.length];
  };

  const channelColor = channel === "whatsapp" ? "bg-green-500" : "bg-pink-600";

  // Create a reliable distinct color for column using its id
  const colColor = getUserColor(col.id || "default");

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      className="cursor-pointer border-b border-border transition-colors duration-100"
      style={{
        background: hovered ? "hsl(var(--muted) / 0.3)" : "transparent",
      }}
    >
      <td
        className="py-[11px] px-3.5 font-body text-[11px] font-bold text-muted-foreground tracking-wide whitespace-nowrap"
        style={{ borderLeft: `3px solid ${pConf.dot}` }}
      >
        {card.ticketId || card.id.substring(0, 8)}
      </td>
      <td className="py-[11px] px-3.5 max-w-[300px]">
        <div className="font-body font-semibold text-[13px] text-foreground leading-[1.4] truncate">
          {card.title}
        </div>
        {card.description && (
          <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {card.description.replace(/<[^>]*>?/gm, "")}
          </div>
        )}
      </td>
      <td className="py-[11px] px-3.5 whitespace-nowrap">
        <div
          className="inline-flex items-center gap-[5px] rounded-full font-body text-xs font-semibold"
          style={{
            padding: "2px 8px",
            background: pConf.bg,
            color: pConf.color,
            border: `1px solid ${pConf.color}20`,
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: pConf.dot }} />
          {t(pConf.label)}
        </div>
      </td>
      <td className="py-[11px] px-3.5 whitespace-nowrap">
        <span
          className="inline-flex items-center gap-[5px] rounded-full font-body text-xs font-semibold"
          style={{
            padding: "3px 10px",
            background: colColor + "16",
            color: colColor,
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: colColor }} />
          {col.title}
        </span>
      </td>
      <td className="py-[11px] px-3.5 whitespace-nowrap">
        {card.assignees && card.assignees.length > 0 ? (
          <div className="flex -space-x-2">
            {card.assignees.map((assigneeObj) => {
              const member = boardMembers.find((m) => m.id === assigneeObj.assigneeId);
              if (!member) return null;
              const uColor = getUserColor(member.id);
              return (
                <Avatar
                  key={assigneeObj.assigneeId}
                  className="w-[26px] h-[26px] border-[1.5px] border-background"
                >
                  <AvatarImage src={member.profilePhoto} />
                  <AvatarFallback
                    className="text-[9px] font-bold text-white"
                    style={{ backgroundColor: uColor }}
                  >
                    {member.name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              );
            })}
          </div>
        ) : (
          <span className="font-body text-xs text-muted-foreground italic">{t("Unassigned")}</span>
        )}
      </td>
      <td className="py-[11px] px-3.5">
        {customerName ? (
          <div className="flex items-center gap-1.5">
            <div className="relative shrink-0">
              <Avatar className="w-[22px] h-[22px]">
                <AvatarFallback className="bg-muted text-muted-foreground text-[8px] font-bold">
                  {customerName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span
                className={`absolute -bottom-px -right-px w-2 h-2 rounded-full ${channelColor}`}
                style={{
                  border: "1.5px solid var(--background)",
                }}
              />
            </div>
            <span className="font-body text-xs text-foreground max-w-[120px] truncate">
              {customerName}
            </span>
          </div>
        ) : (
          <span className="font-body text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="py-[11px] px-3.5 whitespace-nowrap">
        {card.deadline ? (
          <span
            className={`inline-flex items-center gap-1 font-body text-xs font-medium rounded-full ${isOverdue ? "text-red-600 bg-red-50" : "text-muted-foreground bg-transparent"}`}
            style={{
              padding: isOverdue ? "2px 8px" : "0",
            }}
          >
            <Calendar
              size={12}
              strokeWidth={2}
              className={isOverdue ? "text-red-600" : "text-muted-foreground"}
            />
            {dayjs(card.deadline).format("D MMM")}
          </span>
        ) : (
          <span className="text-muted-foreground font-body text-[13px]">—</span>
        )}
      </td>
    </tr>
  );
}
