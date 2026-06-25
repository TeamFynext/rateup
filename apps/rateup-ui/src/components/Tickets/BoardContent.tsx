import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Columns3, LayoutPanelTop, List, Search, Settings } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useBoard, useBoardTeamMembersById } from "@/backend/tickets/tickets.query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";

import { Board } from "./board.tsx";
import TicketSettings from "./boardSettings.tsx";
import { PRIORITY_CONFIG } from "./card.tsx";
import { ManageColumnsDialog } from "./ManageColumnsDialog.tsx";
import { TicketListView } from "./TicketListView.tsx";

export function BoardContent({
  selectedBoardId,
  teamOptions,
}: Readonly<{
  selectedBoardId: string;
  teamOptions: { value: string; label: string }[];
}>) {
  const {
    board: selectedBoard,
    isLoading: isBoardDataLoading,
    createColumn,
    updateColumn,
    deleteColumn,
    reorderColumns,
  } = useBoard(selectedBoardId || "");
  const { t } = useTranslation();

  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);
  const [viewPref, setViewPref] = useState(() => {
    return localStorage.getItem("rateup_ticket_view") || "board";
  });

  const navigate = useNavigate();

  const stats = useMemo(() => {
    let openCount = 0;
    let criticalCount = 0;
    let overdueCount = 0;

    if (!selectedBoard?.ticketColumns) return { openCount, criticalCount, overdueCount };

    selectedBoard.ticketColumns.forEach((col) => {
      const isResolvedColumn =
        col.title.toLowerCase().includes("resolve") ||
        col.title.toLowerCase().includes("complet") ||
        col.title.toLowerCase().includes("done");

      col.ticketCards?.forEach((card) => {
        if (!isResolvedColumn) {
          openCount++;
        }
        if (card.priority === "CRITICAL") {
          criticalCount++;
        }
        const targetDate = card.deadline ? new Date(card.deadline) : null;
        if (targetDate && targetDate < new Date() && !isResolvedColumn) {
          overdueCount++;
        }
      });
    });
    return { openCount, criticalCount, overdueCount };
  }, [selectedBoard]);

  const { data: boardMembers = [] } = useBoardTeamMembersById(selectedBoardId);

  const assignees = useMemo(() => {
    return boardMembers;
  }, [boardMembers]);

  if (isBoardDataLoading) return <Skeleton className="h-96 w-full" />;

  if (!selectedBoard || !selectedBoardId)
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <span className="text-muted-foreground">{t("Board not found")}</span>
      </div>
    );

  if (showSettings) {
    return (
      <div className="h-full flex flex-col p-4">
        <Button variant="ghost" onClick={() => setShowSettings(false)} className="self-start mb-4">
          <ChevronLeft className="w-4 h-4 mr-2" /> {t("Back to Board")}
        </Button>
        <TicketSettings
          boardId={selectedBoardId}
          teamOptions={teamOptions}
          selectedBoard={selectedBoard}
        />
      </div>
    );
  }

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

  const priorities = [
    { value: "CRITICAL", label: t("Critical") },
    { value: "HIGH", label: t("High") },
    { value: "MEDIUM", label: t("Medium") },
    { value: "LOW", label: t("Low") },
  ];

  const handleViewChange = (v: string) => {
    setViewPref(v);
    localStorage.setItem("rateup_ticket_view", v);
  };

  const handleSaveColumns = async (newColumns: any[], deletedIds: string[]) => {
    // Handle deletes
    for (const id of deletedIds) {
      deleteColumn(id);
    }
    // Handle updates and adds
    for (const col of newColumns) {
      if (col.isNew) {
        createColumn({ title: col.title, ticketBoardId: selectedBoardId });
      } else {
        updateColumn({ id: col.id, title: col.title });
      }
    }
    // Handle reorder
    const orderData = newColumns
      .filter((c) => !c.isNew)
      .map((c, index) => ({ id: c.id, order: index }));
    if (orderData.length > 0) {
      reorderColumns({ boardId: selectedBoardId, columns: orderData });
    }
  };

  return (
    <div className="h-full flex flex-col min-h-0">
      <Tabs
        value={viewPref}
        onValueChange={handleViewChange}
        className="flex flex-col h-full min-h-0"
      >
        <div className="flex flex-col shrink-0 border-b border-border bg-background">
          {/* Top Row: Navigation & Stats */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 md:px-6 pt-4 pb-2">
            <div className="flex items-center gap-4 flex-wrap">
              <button
                onClick={() => navigate({ to: "/dashboard/tickets" })}
                className="flex items-center text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> {t("All boards")}
              </button>

              <Separator orientation="vertical" className="h-6 mx-0 hidden md:block" />

              <div className="flex items-center gap-2 shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                <h1 className="text-lg font-bold tracking-tight">{selectedBoard.title}</h1>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex gap-[7px] items-center md:mr-2 flex-wrap">
                <StatPill label={t("Open")} value={stats.openCount} color="#1C518E" />
                {stats.criticalCount > 0 && (
                  <StatPill label={t("Critical")} value={stats.criticalCount} color="#DC2626" />
                )}
                {stats.overdueCount > 0 && (
                  <StatPill label={t("Overdue")} value={stats.overdueCount} color="#F8951D" />
                )}
              </div>

              <div className="flex items-center gap-2">
                <TabsList className="h-9 bg-muted/50 p-1 shrink-0">
                  <TabsTrigger
                    value="board"
                    className="text-xs px-3 sm:px-4 data-[state=active]:text-primary"
                  >
                    <LayoutPanelTop className="w-3.5 h-3.5 mr-1.5" /> {t("Board")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="list"
                    className="text-xs px-3 sm:px-4 data-[state=active]:text-primary"
                  >
                    <List className="w-3.5 h-3.5 mr-1.5" /> {t("List")}
                  </TabsTrigger>
                </TabsList>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0"
                  onClick={() => setIsManageColumnsOpen(true)}
                >
                  <Columns3 className="w-4 h-4 sm:mr-2 text-primary" />
                  <span className="hidden sm:inline text-primary">{t("Manage Columns")}</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0"
                  onClick={() => setShowSettings(true)}
                >
                  <Settings className="w-4 h-4 sm:mr-2 text-muted-foreground" />
                  <span className="hidden sm:inline">{t("Settings")}</span>
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Bottom Row: Filters */}
          <div className="h-[46px] flex items-center px-4 md:px-6 gap-2.5 shrink-0">
            <div className="relative">
              <span className="absolute left-[9px] top-1/2 -translate-y-1/2 pointer-events-none">
                <Search size={13} className="text-muted-foreground" />
              </span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("Search tickets...")}
                className="font-body text-[13px] py-[5px] pl-7 pr-2.5 border-[1.5px] border-border rounded-lg outline-none w-full md:w-[200px] bg-muted/50 transition-colors focus:border-primary"
              />
            </div>

            <div className="w-px h-5 bg-border hidden md:block" />

            <div className="hidden md:flex gap-1 items-center">
              <span className="font-body text-[11px] font-semibold text-muted-foreground tracking-wider uppercase mr-1">
                {t("Priority")}
              </span>
              <button
                onClick={() => setPriorityFilter(null)}
                className="rounded-full font-body text-[11px] font-semibold cursor-pointer transition-all duration-150 flex items-center justify-center leading-none"
                style={{
                  padding: "2px 8px",
                  border:
                    priorityFilter === null
                      ? "1.5px solid currentColor"
                      : "1.5px solid transparent",
                  background: priorityFilter === null ? "#EEF4FB" : "transparent",
                  color: priorityFilter === null ? "#1C518E" : "#8B8E8A",
                }}
              >
                {t("All")}
              </button>
              {priorities.map((p) => {
                const on = priorityFilter === p.value;
                const pConf = PRIORITY_CONFIG[p.value.toLowerCase()];
                return (
                  <button
                    key={p.value}
                    onClick={() => setPriorityFilter(p.value)}
                    className="rounded-full font-body text-[11px] font-semibold cursor-pointer transition-all duration-150 flex items-center justify-center leading-none"
                    style={{
                      padding: "2px 8px",
                      border: on ? "1.5px solid currentColor" : "1.5px solid transparent",
                      background: on ? pConf?.bg : "transparent",
                      color: on ? pConf?.color : "#8B8E8A",
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            <div className="w-px h-5 bg-border hidden md:block" />

            <div className="hidden md:flex gap-[5px] items-center">
              <span className="font-body text-[11px] font-semibold text-muted-foreground tracking-wider uppercase mr-1">
                {t("Assignee")}
              </span>
              <button
                onClick={() => setAssigneeFilter(null)}
                className="rounded-full font-body text-[11px] font-semibold cursor-pointer transition-all duration-150 flex items-center justify-center leading-none"
                style={{
                  padding: "2px 8px",
                  border: !assigneeFilter ? "1.5px solid #1C518E" : "1.5px solid transparent",
                  background: !assigneeFilter ? "#EEF4FB" : "transparent",
                  color: !assigneeFilter ? "#1C518E" : "#8B8E8A",
                }}
              >
                {t("All")}
              </button>
              {assignees.map((user) => {
                const on = assigneeFilter === user.id;
                const userColor = getUserColor(user.id);
                return (
                  <button
                    key={user.id}
                    title={user.name}
                    onClick={() => setAssigneeFilter(on ? null : user.id)}
                    className="bg-none border-none cursor-pointer p-0 rounded-full transition-all duration-150 outline-none hover:opacity-80"
                    style={{
                      outline: on ? `3px solid ${userColor}` : "3px solid transparent",
                      outlineOffset: 2,
                    }}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={user.profilePhoto} />
                      <AvatarFallback
                        className="text-[10px] font-bold text-white"
                        style={{ backgroundColor: userColor }}
                      >
                        {user.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <TabsContent value="board" className="flex-1 mt-0 h-full min-h-0">
          <Board
            initial={selectedBoard}
            priorityFilter={priorityFilter}
            searchQuery={searchQuery}
            assigneeFilter={assigneeFilter}
          />
        </TabsContent>
        <TabsContent value="list" className="flex-1 mt-0 min-h-0 overflow-y-auto">
          <TicketListView
            board={selectedBoard}
            priorityFilter={priorityFilter}
            searchQuery={searchQuery}
            assigneeFilter={assigneeFilter}
            boardMembers={assignees}
          />
        </TabsContent>
      </Tabs>

      {isManageColumnsOpen && (
        <ManageColumnsDialog
          columns={selectedBoard?.ticketColumns || []}
          onClose={() => setIsManageColumnsOpen(false)}
          onSave={handleSaveColumns}
        />
      )}
    </div>
  );
}

interface StatPillProps {
  label: string;
  value: number;
  color: string;
}

function StatPill({ label, value, color }: StatPillProps) {
  return (
    <div
      className="flex items-center gap-[5px] rounded-full"
      style={{
        padding: "4px 11px",
        background: color + "12",
        border: `1px solid ${color}24`,
      }}
    >
      <span className="font-display font-black text-sm leading-none" style={{ color }}>
        {value}
      </span>
      <span
        className="font-body text-[11px] font-semibold tracking-wide"
        style={{ color: color + "BB" }}
      >
        {label}
      </span>
    </div>
  );
}
