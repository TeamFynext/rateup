"use client";

import { useState } from "react";

import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, LayoutPanelTop, Settings } from "lucide-react";

import { useBoard } from "@/backend/tickets/tickets.query";
import { Button } from "@/components/ui/button.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";

import { Board } from "./board.tsx";
import TicketSettings from "./boardSettings.tsx";
import { PriorityFilter } from "./PriorityFilter.tsx";

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
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [filterOpened, setFilterOpened] = useState(false);
  const navigate = useNavigate();
  if (isBoardDataLoading) return <Skeleton className="h-96 w-full" />;

  if (!selectedBoard || !selectedBoardId)
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <span className="text-muted-foreground">Board not found</span>
      </div>
    );

  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="board">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                navigate({
                  to: "/dashboard/tickets",
                })
              }
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <span className="font-semibold text-xl truncate capitalize">
              {selectedBoard?.title}
            </span>
          </div>
          <TabsList>
            <TabsTrigger value="board">
              <LayoutPanelTop className="w-4 h-4 mr-1.5" /> Board View
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-1.5" /> Settings
            </TabsTrigger>
          </TabsList>
          <div className="flex justify-end">
            <PriorityFilter
              filterOpened={filterOpened}
              setFilterOpened={setFilterOpened}
              priorityFilter={priorityFilter}
              setPriorityFilter={setPriorityFilter}
            />
          </div>
        </div>
        <Separator />
        <TabsContent value="board">
          <Board initial={selectedBoard} priorityFilter={priorityFilter} />
        </TabsContent>
        <TabsContent value="settings">
          <TicketSettings
            boardId={selectedBoardId}
            teamOptions={teamOptions}
            selectedBoard={selectedBoard}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
