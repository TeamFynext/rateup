import { useState } from "react";
import { useRouter } from "next/router";

import { Flex, Group, Modal, MultiSelect, Stack, Title } from "@mantine/core";

import { useTeamsByUser } from "@/backend/team/team.query";
import { useBoard, useBoardQueries } from "@/backend/tickets/tickets.query";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import { ContainedTextField } from "@/components/input/ContainedInput/ContainedInput";
import { TeamSelector } from "@/components/input/TeamSelector";
import RateupLoader from "@/components/Loaders/RateupLoader";
import { BoardSidebar } from "@/components/Tickets/BoardSidebar";
import useTranslations from "@/dictionaries/useTranslation";

import { Board } from "../../../components/Tickets/board";

export default function Page() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newBoardData, setNewBoardData] = useState({ title: "", teamIds: [] });
  const [editBoardData, setEditBoardData] = useState({
    id: "",
    title: "",
    teamIds: [],
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const router = useRouter();
  const selectedBoardId = router.query?.b as string;
  // Use Tanstack Query for boards data
  const { boards, isLoading, createBoard, updateBoard, deleteBoard } =
    useBoardQueries();
  const { data: teamRes, isPending: teamsLoading } = useTeamsByUser();

  const { translations } = useTranslations();

  const teams = teamRes?.data;

  const teamOptions = teams
    ? teams.map((team) => ({
        value: team.id,
        label: team.name,
      }))
    : [];

  // Get board info for sidebar
  const boardInfos = boards.map((board) => ({
    id: board.id,
    title: board.title,
    teamIds: board.teams.map((team) => team.teamId),
  }));

  const handleCreateBoard = () => {
    if (!newBoardData.title.trim() || !newBoardData.teamIds?.length) return;

    createBoard({
      title: newBoardData.title,
      teamIds: newBoardData.teamIds,
    });

    setNewBoardData({ title: "", teamIds: [] });
    setIsCreateModalOpen(false);
  };

  // Define the handleOpenEditBoard function to open the edit modal
  const handleOpenEditBoard = (boardId: string) => {
    console.log("Opening edit modal for board:", boardId);

    // Find the board in boardInfos
    const board = boardInfos.find((b) => b.id === boardId);
    if (board) {
      // Set the edit board data state
      setEditBoardData({
        id: board.id,
        title: board.title,
        teamIds: board.teamIds,
      });

      // Open the modal - ensure this happens after state is set
      setTimeout(() => {
        setIsEditModalOpen(true);
      }, 0);
    } else {
      console.error("Board not found with ID:", boardId);
    }
  };

  const handleSaveEditBoard = () => {
    if (!editBoardData.title.trim() || !editBoardData.teamIds?.length) return;

    updateBoard({
      id: editBoardData.id,
      title: editBoardData.title,
      teamIds: editBoardData.teamIds,
    });

    setIsEditModalOpen(false);
  };

  const handleDeleteBoard = (boardId: string) => {
    deleteBoard(boardId);

    if (boardId === selectedBoardId) {
      router.push({
        query: {},
      });
    }
  };

  if (isLoading) return <RateupLoader h={"100dvh"} />;

  return (
    <Flex h="100%">
      <BoardSidebar
        selectedBoardId={selectedBoardId}
        onCreateBoard={() => setIsCreateModalOpen(true)}
        onEditBoard={handleOpenEditBoard}
        onDeleteBoard={handleDeleteBoard}
        collapsed={sidebarCollapsed}
        toggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        boards={boardInfos}
      />
      <ColumnListByBoardId
        selectedBoardId={selectedBoardId}
        // boardInfos={boardInfos}
      />

      {/* Create Board Modal */}
      <Modal
        opened={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Board"
      >
        <Stack>
          <ContainedTextField
            label="Board Title"
            placeholder="Enter board title"
            value={newBoardData.title}
            onChange={(e) =>
              setNewBoardData({ ...newBoardData, title: e.currentTarget.value })
            }
            required
          />
          <MultiSelect
            radius="md"
            placeholder={translations["Select teams"]}
            data={teamOptions}
            value={newBoardData.teamIds}
            onChange={(teamIds) =>
              setNewBoardData({ ...newBoardData, teamIds })
            }
          />
          <Group justify="right" mt="md">
            <RateupButtonPrimary
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
              title="Cancel"
            />
            <RateupButtonPrimary onClick={handleCreateBoard} title="Create" />
          </Group>
        </Stack>
      </Modal>

      {/* Edit Board Modal - Add a key to force re-render */}
      <Modal
        opened={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Board"
        key={`edit-modal-${editBoardData.id}`}
      >
        <Stack>
          <ContainedTextField
            label="Board Title"
            placeholder="Enter board title"
            value={editBoardData.title}
            onChange={(e) =>
              setEditBoardData({
                ...editBoardData,
                title: e.currentTarget.value,
              })
            }
            required
          />
          <MultiSelect
            radius="md"
            placeholder={translations["Select teams"]}
            data={teamOptions}
            value={editBoardData.teamIds}
            onChange={(teamIds) =>
              setEditBoardData({ ...editBoardData, teamIds })
            }
          />
          <Group justify="right" mt="md">
            <RateupButtonPrimary
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              title="Cancel"
            />
            <RateupButtonPrimary onClick={handleSaveEditBoard} title="Save" />
          </Group>
        </Stack>
      </Modal>
    </Flex>
  );
}

const ColumnListByBoardId = ({
  selectedBoardId,
  boardInfos,
}: {
  selectedBoardId: string;
  boardInfos?: { id: string; title: string; teamId: string }[];
}) => {
  // Get selected board data
  const { board: selectedBoard, isLoading: IsBoardDataLoading } = useBoard(
    selectedBoardId || "",
  );
  if (IsBoardDataLoading) return <RateupLoader h={"100dvh"} w={"100%"} />;
  if (!selectedBoard || !selectedBoardId)
    return (
      <Flex align="center" justify="center" h="100%" w={"100%"}>
        <Title order={4}>Select a board to start</Title>
      </Flex>
    );
  return (
    <Stack style={{ flexGrow: 1, height: "100%", overflow: "hidden" }} p="md">
      <div style={{ overflowX: "auto", width: "100%", height: "100%" }}>
        <Board
          initial={selectedBoard}
          //  availableBoards={boardInfos}
        />
      </div>
    </Stack>
  );
};
