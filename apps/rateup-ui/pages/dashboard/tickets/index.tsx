import { useState } from "react";
import { useRouter } from "next/router";

import { Flex, Group, Modal, Stack, Title } from "@mantine/core";

import { useBoard, useBoardQueries } from "@/backend/tickets/tickets.query";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import { ContainedTextField } from "@/components/input/ContainedInput/ContainedInput";
import { TeamSelector } from "@/components/input/TeamSelector";
import RateupLoader from "@/components/Loaders/RateupLoader";
import { BoardSidebar } from "@/components/Tickets/BoardSidebar";

import { Board } from "../../../components/Tickets/board";

export default function Page() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newBoardData, setNewBoardData] = useState({ title: "", teamId: "" });
  const [editBoardData, setEditBoardData] = useState({
    id: "",
    title: "",
    teamId: "",
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const router = useRouter();
  const selectedBoardId = router.query?.b as string;
  // Use Tanstack Query for boards data
  const { boards, isLoading, createBoard, updateBoard, deleteBoard } =
    useBoardQueries();

  // Get board info for sidebar
  const boardInfos = boards.map((board) => ({
    id: board.id,
    title: board.title,
    teamId: board.teamId,
  }));

  const handleCreateBoard = () => {
    if (!newBoardData.title.trim() || !newBoardData.teamId) return;

    createBoard({
      title: newBoardData.title,
      teamId: newBoardData.teamId,
    });

    setNewBoardData({ title: "", teamId: "" });
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
        teamId: board.teamId,
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
    if (!editBoardData.title.trim() || !editBoardData.teamId) return;

    updateBoard({
      id: editBoardData.id,
      title: editBoardData.title,
      teamId: editBoardData.teamId,
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
        boardInfos={boardInfos}
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
          <TeamSelector
            label="Select Team"
            value={newBoardData.teamId}
            onChange={(teamId) => setNewBoardData({ ...newBoardData, teamId })}
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
          <TeamSelector
            label="Select Team"
            value={editBoardData.teamId}
            onChange={(teamId) =>
              setEditBoardData({ ...editBoardData, teamId })
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
  boardInfos: { id: string; title: string; teamId: string }[];
}) => {
  // Get selected board data
  const { board: selectedBoard, isLoading: IsBoardDataLoading } = useBoard(
    selectedBoardId || "",
  );
  if (IsBoardDataLoading) return <RateupLoader h={"100dvh"} />;
  if (!selectedBoard || !selectedBoardId)
    return (
      <Flex align="center" justify="center" h="100%" w={"100%"}>
        <Title order={4}>Select a board to start</Title>
      </Flex>
    );
  return (
    <Stack style={{ flexGrow: 1, height: "100%", overflow: "hidden" }} p="md">
      <div style={{ overflowX: "auto", width: "100%", height: "100%" }}>
        <Board initial={selectedBoard} availableBoards={boardInfos} />
      </div>
    </Stack>
  );
};
