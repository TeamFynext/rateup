"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  ActionIcon,
  Burger,
  Card,
  Divider,
  Flex,
  Group,
  Menu,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import { IconDots, IconEdit, IconPlus, IconTrash } from "@tabler/icons-react";

import { TeamSelector } from "@/components/input/TeamSelector";

import { BoardInfo } from "./types";

type BoardSidebarProps = {
  selectedBoardId: string | null;
  onCreateBoard: () => void;
  onEditBoard?: (boardId: string) => void;
  onDeleteBoard?: (boardId: string) => void;
  collapsed: boolean;
  toggleCollapse: () => void;
  boards?: BoardInfo[];
};

export function BoardSidebar({
  selectedBoardId,
  onCreateBoard,
  onEditBoard,
  onDeleteBoard,
  collapsed,
  toggleCollapse,
  boards = [],
}: BoardSidebarProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string>("all");
  const router = useRouter();
  const boardsToDisplay = boards;

  // Group boards by teamId
  const boardsByTeam: Record<string, BoardInfo[]> = {};
  const teamIds: string[] = [];

  boardsToDisplay?.forEach((board) => {
    board.teamIds.forEach((teamId) => {
      if (!boardsByTeam[teamId]) {
        boardsByTeam[teamId] = [];
        teamIds.push(teamId);
      }
      boardsByTeam[teamId].push(board);
    });
  });

  if (collapsed) {
    return (
      <Paper
        shadow="md"
        p="xs"
        style={{
          height: "100%",
          width: "40px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <Burger
          opened={!collapsed}
          onClick={toggleCollapse}
          size="sm"
          mt={-5}
        />
      </Paper>
    );
  }

  const currentTeamBoards =
    selectedTeamId === "all"
      ? boardsToDisplay
      : boardsByTeam[selectedTeamId] || [];

  return (
    <Card
      shadow="md"
      p="xs"
      style={{
        height: "100%",
        minWidth: "250px",
        maxWidth: "250px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Group justify="space-between" mb="xs" mt={-5}>
        <Text fw={700}>Boards</Text>
        <Group>
          <ActionIcon onClick={onCreateBoard} size="sm">
            <IconPlus />
          </ActionIcon>
          <Burger opened={!collapsed} onClick={toggleCollapse} size="sm" />
        </Group>
      </Group>
      <Divider mb="md" />

      <TeamSelector
        value={selectedTeamId}
        onChange={(value) => setSelectedTeamId(value)}
        enableAll
      />
      {teamIds.length > 0 ? (
        <>
          <Stack
            style={{ flexGrow: 1, overflowY: "auto" }}
            mt={"xs"}
            gap={4}
            w={220}
          >
            {currentTeamBoards.length > 0 ? (
              currentTeamBoards.map((board) => (
                <Flex
                  key={board.id}
                  justify={"space-between"}
                  align={"center"}
                  bg={
                    selectedBoardId === board.id
                      ? "var(--mantine-primary-color-light)"
                      : "transparent"
                  }
                  style={{
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  <Text
                    style={{
                      padding: "4px 8px",
                      flex: 1,
                    }}
                    onClick={() => router.push(`?b=${board.id}`)}
                  >
                    {board.title}
                  </Text>
                  <Menu shadow="md" position="bottom-end" withinPortal>
                    <Menu.Target>
                      <ActionIcon
                        size="md"
                        variant="transparent"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <IconDots size={14} />
                      </ActionIcon>
                    </Menu.Target>

                    <Menu.Dropdown>
                      {onEditBoard && (
                        <Menu.Item
                          leftSection={<IconEdit size={14} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            console.log("Edit board clicked:", board.id);
                            // Ensure the board ID is passed and the function exists
                            if (onEditBoard && board.id) {
                              onEditBoard(board.id);
                            }
                          }}
                        >
                          Edit board
                        </Menu.Item>
                      )}
                      {onDeleteBoard && (
                        <Menu.Item
                          leftSection={<IconTrash size={14} />}
                          color="red"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteBoard(board.id);
                          }}
                        >
                          Delete board
                        </Menu.Item>
                      )}
                    </Menu.Dropdown>
                  </Menu>
                </Flex>
              ))
            ) : (
              <Text fs="italic" c="dimmed" ta="center">
                No boards for this team
              </Text>
            )}
          </Stack>
        </>
      ) : (
        <Text fs="italic" c="dimmed" ta="center" style={{ flexGrow: 1 }}>
          No teams or boards created yet
        </Text>
      )}
    </Card>
  );
}
