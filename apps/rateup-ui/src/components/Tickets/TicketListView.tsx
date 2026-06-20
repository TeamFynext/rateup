import { useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { Clock, MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar.tsx";
import { Badge } from "@/components/ui/badge.tsx";

import type { Board as BoardType } from "./types.ts";

export function TicketListView({
  board,
  priorityFilter,
  searchQuery,
  assigneeFilter,
  boardMembers = [],
}: {
  board: BoardType;
  priorityFilter: string | null;
  searchQuery: string;
  assigneeFilter: string | null;
  boardMembers?: any[];
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="h-full overflow-y-auto px-2 py-4">
      {board.ticketColumns.map((column) => {
        const filteredCards = column.ticketCards.filter((card) => {
          let matches = true;
          if (priorityFilter && card.priority !== priorityFilter)
            matches = false;
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
            const isAssigned = card.assignees?.some(
              (a) => a.assigneeId === assigneeFilter,
            );
            if (!isAssigned) matches = false;
          }
          return matches;
        });

        if (filteredCards.length === 0) return null;

        return (
          <div key={column.id} className="mb-8">
            <div className="flex items-center gap-2 mb-4 pl-2">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <h3 className="font-bold text-foreground">{column.title}</h3>
              <span className="flex h-5 items-center justify-center rounded-full bg-muted px-2 text-[11px] font-medium text-muted-foreground ml-2">
                {filteredCards.length}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {filteredCards.map((card) => (
                <div
                  key={card.id}
                  onClick={() =>
                    navigate({ to: `/dashboard/tickets/${card.id}` })
                  }
                  className="group bg-card hover:bg-muted/30 border rounded-xl p-4 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-semibold text-[15px] truncate text-foreground">
                        {card.title}
                      </span>
                    </div>
                    {card.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                        {card.description.replace(/<[^>]*>?/gm, "")}
                      </p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className="text-[10px] font-semibold border-border/50 text-muted-foreground uppercase"
                      >
                        {t(card.priority || "NO PRIORITY")}
                      </Badge>

                      {card.deadline && (
                        <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted/30 px-2 py-0.5 rounded border border-transparent">
                          <Clock className="w-3 h-3" />
                          {format(new Date(card.deadline), "MMM d")}
                        </div>
                      )}

                      {card.ticketComments &&
                        card.ticketComments.length > 0 && (
                          <div className="flex items-center gap-3 text-muted-foreground text-[11px] ml-2">
                            <div className="flex items-center gap-1">
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>{card.ticketComments.length}</span>
                            </div>
                          </div>
                        )}
                    </div>
                  </div>

                  <div className="flex items-center pl-4 ml-4 border-l border-border/50">
                    <div className="flex -space-x-2">
                      {card.assignees?.map((assigneeObj) => {
                        const member = boardMembers.find(
                          (m) => m.id === assigneeObj.assigneeId,
                        );
                        if (!member) return null;
                        return (
                          <Avatar
                            key={assigneeObj.assigneeId}
                            className="w-8 h-8 border-2 border-background"
                          >
                            <AvatarImage src={member.profilePhoto} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                              {member.name?.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {board.ticketColumns.every((col) => col.ticketCards.length === 0) && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p>{t("No tickets found.")}</p>
        </div>
      )}
    </div>
  );
}
