"use client";

import { useMemo, useState } from "react";

import { useNavigate } from "@tanstack/react-router";
import {
  ChevronLeft,
  LayoutPanelTop,
  List,
  Search,
  Settings,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  useBoard,
  useBoardTeamMembersById,
} from "@/backend/tickets/tickets.query";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.tsx";

import { Board } from "./board.tsx";
import TicketSettings from "./boardSettings.tsx";
import { TicketListView } from "./TicketListView.tsx";

export function BoardContent({
  selectedBoardId,
  teamOptions,
}: Readonly<{
  selectedBoardId: string;
  teamOptions: { value: string; label: string }[];
}>) {
  const { board: selectedBoard, isLoading: isBoardDataLoading } = useBoard(
    selectedBoardId || "",
  );
  const { t } = useTranslation();

  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  const navigate = useNavigate();

  const stats = useMemo(() => {
    let openCount = 0;
    let criticalCount = 0;
    let overdueCount = 0;

    if (!selectedBoard?.ticketColumns)
      return { openCount, criticalCount, overdueCount };

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
        if (
          card.deadline &&
          new Date(card.deadline) < new Date() &&
          !isResolvedColumn
        ) {
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
        <Button
          variant="ghost"
          onClick={() => setShowSettings(false)}
          className="self-start mb-4"
        >
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

  const priorities = [
    { value: "CRITICAL", label: t("Critical") },
    { value: "HIGH", label: t("High") },
    { value: "MEDIUM", label: t("Medium") },
    { value: "LOW", label: t("Low") },
  ];

  return (
    <div className="h-full flex flex-col min-h-0">
      <Tabs defaultValue="board" className="flex flex-col h-full min-h-0">
        <div className="flex flex-col gap-2 px-1 shrink-0">
          {/* Top Row: Navigation & Stats */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <button
                onClick={() => navigate({ to: "/dashboard/tickets" })}
                className="flex items-center text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> {t("All boards")}
              </button>

              <Separator
                orientation="vertical"
                className="h-6 mx-0 hidden md:block"
              />

              <div className="flex items-center gap-2 shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                <h1 className="text-lg font-bold tracking-tight">
                  {selectedBoard.title}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 md:mr-2 flex-wrap">
                <Badge
                  variant="secondary"
                  className="bg-blue-50 text-primary hover:bg-blue-100 font-bold border-none px-2.5 py-0.5"
                >
                  <span className="mr-1.5">{stats.openCount}</span> {t("Open")}
                </Badge>
                <Badge
                  variant="secondary"
                  className="bg-red-50 text-red-600 hover:bg-red-100 font-bold border-none px-2.5 py-0.5"
                >
                  <span className="font-semibold">{stats.criticalCount}</span>{" "}
                  {t("Critical")}
                </Badge>
                <Badge
                  variant="secondary"
                  className="bg-orange-50 text-orange-600 hover:bg-orange-100 font-bold border-none px-2.5 py-0.5"
                >
                  <span className="mr-1.5">{stats.overdueCount}</span>{" "}
                  {t("Overdue")}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <TabsList className="h-9 bg-muted/50 p-1 shrink-0">
                  <TabsTrigger
                    value="board"
                    className="text-xs px-3 sm:px-4 data-[state=active]:text-primary"
                  >
                    <LayoutPanelTop className="w-3.5 h-3.5 mr-1.5" />{" "}
                    {t("Board")}
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
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 py-1">
            {/* Search */}
            <div className="relative w-full md:w-64 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("Search tickets...")}
                className="pl-9 h-9 text-sm bg-muted/20 border-border/60 focus-visible:ring-primary/40 rounded-full w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {/* Priority */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-muted-foreground tracking-widest text-[10px] uppercase">
                  {t("Priority")}
                </span>
                <button
                  onClick={() => setPriorityFilter(null)}
                  className={`text-xs font-bold px-3 py-1 rounded-full transition-all ${
                    priorityFilter === null
                      ? "text-[#1e40af] border border-blue-200 bg-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("All")}
                </button>
                {priorities.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPriorityFilter(p.value)}
                    className={`text-xs font-bold px-3 py-1 rounded-full transition-all ${
                      priorityFilter === p.value
                        ? "text-[#1e40af] border border-blue-200 bg-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <Separator
                orientation="vertical"
                className="h-6 mx-1 hidden md:block"
              />

              {/* Assignee */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-muted-foreground tracking-widest text-[10px] uppercase">
                  {t("Assignee")}
                </span>
                <button
                  onClick={() => setAssigneeFilter(null)}
                  className={`text-xs font-bold px-3 py-1 rounded-full transition-all ${
                    assigneeFilter === null
                      ? "text-[#1e40af] border border-blue-200 bg-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("All")}
                </button>
                <div className="flex items-center -space-x-1.5 ml-1">
                  {assignees.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => setAssigneeFilter(user.id)}
                      title={user.name}
                      className={`rounded-full transition-all border-2 ${assigneeFilter === user.id ? "border-[#1e40af] z-10 scale-110 relative" : "border-background hover:scale-110 hover:z-10 relative"}`}
                    >
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={user.profilePhoto} />
                        <AvatarFallback className="bg-primary/20 text-[10px] font-bold text-primary">
                          {user.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <Separator className="mb-4" />

        <TabsContent value="board" className="flex-1 mt-0 h-full min-h-0">
          <Board
            initial={selectedBoard}
            priorityFilter={priorityFilter}
            searchQuery={searchQuery}
            assigneeFilter={assigneeFilter}
          />
        </TabsContent>
        <TabsContent
          value="list"
          className="flex-1 mt-0 min-h-0 overflow-y-auto"
        >
          <TicketListView
            board={selectedBoard}
            priorityFilter={priorityFilter}
            searchQuery={searchQuery}
            assigneeFilter={assigneeFilter}
            boardMembers={assignees}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
