import { IconEdit, IconTrash } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { ActionCard } from "@/components/common/action-card.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";

interface BoardCardProps {
  readonly board: {
    readonly id: string;
    readonly title: string;
    readonly description?: string | null;
    readonly createdAt?: string | Date;
    readonly totalTickets: number;
    readonly columnStats: Array<{ title: string; count: number }>;
  };
  readonly onSelect: (boardId: string) => void;
  readonly onEdit: (boardId: string) => void;
  readonly onDelete: (boardId: string) => void;
}

export function BoardCard({ board, onSelect, onEdit, onDelete }: Readonly<BoardCardProps>) {
  const { t: translations } = useTranslation();

  const actions = (
    <DropdownMenu>
      <DropdownMenuTrigger
        onClick={(e) => e.stopPropagation()}
        render={<Button variant="ghost" size="icon" className="h-8 w-8" />}
      >
        <IconEdit size={16} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(board.id)}>
          <IconEdit size={16} className="mr-2" />
          {translations("Edit")}
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={() => onDelete(board.id)}>
          <IconTrash size={16} className="mr-2" />
          {translations("Delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <ActionCard
      title={board.title}
      subtitle={board.description || translations("No description")}
      actions={actions}
      content={
        <div className="text-sm">
          <div className="font-semibold text-ink-900">
            {board.totalTickets}{" "}
            {board.totalTickets === 1 ? translations("ticket") : translations("tickets")}
            {board.columnStats.length > 0 && (
              <span className="inline-flex gap-1.5 ml-2.5">
                {board.columnStats.map((stat, i) => {
                  const isFirst = i === 0;
                  const colorClass = isFirst
                    ? "text-red-600 bg-[#FEF2F2]"
                    : "text-[#d97a0f] bg-[#fff8eb]";
                  return (
                    <span
                      key={i}
                      className={`text-[11px] font-bold px-2 py-[2px] rounded-full ${colorClass}`}
                    >
                      {stat.count} {stat.title.toLowerCase()}
                    </span>
                  );
                })}
              </span>
            )}
          </div>
        </div>
      }
      footerLeft={
        <span className="text-xs font-semibold text-green-700 bg-[#E7F7EC] rounded-full px-3 py-1">
          {translations("Active")}
        </span>
      }
      createdAt={board.createdAt}
      onClick={() => onSelect(board.id)}
    />
  );
}
