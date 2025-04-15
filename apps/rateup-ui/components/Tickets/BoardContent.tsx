import { useState } from "react";
import { useRouter } from "next/router";

import {
  Button,
  Flex,
  Group,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconLayoutBoard,
  IconSettings,
} from "@tabler/icons-react";

import { useBoard } from "@/backend/tickets/tickets.query";

import RateupLoader from "../Loaders/RateupLoader";
import StyledTabs from "../styled/StyledTabs/StyledTabs";
import { Board } from "./board";
import TicketSettings from "./boardSettings";
import { PriorityFilter } from "./PriorityFilter";

export function BoardContent({
  selectedBoardId,
  teamOptions,
}: {
  selectedBoardId: string;
  teamOptions: { value: string; label: string }[];
}) {
  const { board: selectedBoard, isLoading: isBoardDataLoading } = useBoard(
    selectedBoardId || "",
  );
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [filterOpened, setFilterOpened] = useState(false);
  const router = useRouter();
  if (isBoardDataLoading) return <RateupLoader h="400px" w="100%" />;

  if (!selectedBoard || !selectedBoardId)
    return (
      <Flex align="center" justify="center" h="60vh">
        <Text>Board not found</Text>
      </Flex>
    );

  return (
    <Stack h={"100%"}>
      <StyledTabs keepMounted={false} defaultValue={"board"} h={"100%"}>
        <SimpleGrid
          mt={{ base: "md", sm: 0 }}
          cols={{
            base: 1,
            sm: 2,
            lg: 3,
          }}
        >
          <Flex align="center" gap={"xs"}>
            <Button
              variant="light"
              radius="md"
              size="sm"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => router.push({ query: {} })}
            >
              Back
            </Button>
            <Text tt="capitalize" fw={500} c={"gray.9"} fz={"xl"} truncate>
              {selectedBoard?.title}
            </Text>
          </Flex>
          <Tabs.List>
            <Tabs.Tab value="board" leftSection={<IconLayoutBoard size={16} />}>
              Board View
            </Tabs.Tab>
            <Tabs.Tab value="settings" leftSection={<IconSettings size={16} />}>
              Settings
            </Tabs.Tab>
          </Tabs.List>

          <PriorityFilter
            filterOpened={filterOpened}
            setFilterOpened={setFilterOpened}
            priorityFilter={priorityFilter}
            setPriorityFilter={setPriorityFilter}
          />
        </SimpleGrid>

        <Tabs.Panel value="board" pt="xs">
          <Board initial={selectedBoard} priorityFilter={priorityFilter} />
        </Tabs.Panel>

        <Tabs.Panel value="settings" pt="xs">
          <TicketSettings
            boardId={selectedBoardId}
            teamOptions={teamOptions}
            selectedBoard={selectedBoard}
          />
        </Tabs.Panel>
      </StyledTabs>
    </Stack>
  );
}
