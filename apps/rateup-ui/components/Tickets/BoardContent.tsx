import { Flex, Group, Stack, Text } from "@mantine/core";

import { useBoard } from "@/backend/tickets/tickets.query";

import RateupLoader from "../Loaders/RateupLoader";
import { Board } from "./board";

export function BoardContent({ selectedBoardId }: { selectedBoardId: string }) {
  const { board: selectedBoard, isLoading: isBoardDataLoading } = useBoard(
    selectedBoardId || "",
  );

  if (isBoardDataLoading) return <RateupLoader h="400px" w="100%" />;

  if (!selectedBoard || !selectedBoardId)
    return (
      <Flex align="center" justify="center" h="60vh">
        <Text>Board not found</Text>
      </Flex>
    );

  return (
    <Stack>
      <Group></Group>
      <div style={{ height: "100%", overflow: "auto" }}>
        <Board initial={selectedBoard} />
      </div>
    </Stack>
  );
}
