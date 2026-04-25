"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ArrowLeft, LayoutPanelTop, Settings } from "lucide-react";

import { useBoard } from "@/backend/tickets/tickets.query";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Board } from "./board";
import TicketSettings from "./boardSettings";
import { PriorityFilter } from "./PriorityFilter";

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
  const router = useRouter();
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
              onClick={() => router.push("/dashboard/tickets")}
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
