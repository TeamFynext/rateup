import { useState } from "react";
import { useRouter } from "next/router";

import {
  Container,
  Flex,
  Group,
  Modal,
  MultiSelect,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";

import { useTeamsByUser } from "@/backend/team/team.query";
import { useBoardQueries } from "@/backend/tickets/tickets.query";
import { useUserInfo } from "@/backend/user/user.query";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import { ContainedTextField } from "@/components/input/ContainedInput/ContainedInput";
import { TeamSelector } from "@/components/input/TeamSelector";
import RateupLoader from "@/components/Loaders/RateupLoader";
import { BoardCard } from "@/components/Tickets/BoardCard";
import { BoardContent } from "@/components/Tickets/BoardContent";
import useTranslations from "@/dictionaries/useTranslation";
import { showWarnToast } from "@/utils/notifications";

export default function Page() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newBoardData, setNewBoardData] = useState({ title: "", teamIds: [] });
  const [editBoardData, setEditBoardData] = useState({
    id: "",
    title: "",
    teamIds: [],
  });
  const [selectedTeamId, setSelectedTeamId] = useState<string>("all");
  const router = useRouter();
  const selectedBoardId = router.query?.b as string;
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [boardIdToDelete, setBoardIdToDelete] = useState<string | null>(null);
  // get userInformation for checking the role
  const { data: userRes } = useUserInfo() as { data: { data: UserData } };
  const role = userRes?.data?.role;
  const isAdmin = role === "SUPER_ADMIN" || role === "ADMIN";

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

  // Get board info for cards
  const boardInfos = boards.map((board) => ({
    id: board.id,
    title: board.title,
    teamIds: board.teams.map((team) => team.teamId),
  }));

  // Filter boards by selected team
  const filteredBoards =
    selectedTeamId === "all"
      ? boardInfos
      : boardInfos.filter((board) => board.teamIds.includes(selectedTeamId));

  const handleCreateBoard = () => {
    if (!newBoardData.title.trim() || !newBoardData.teamIds?.length) return;

    createBoard({
      title: newBoardData.title,
      teamIds: newBoardData.teamIds,
    });

    setNewBoardData({ title: "", teamIds: [] });
    setIsCreateModalOpen(false);
  };

  const handleOpenEditBoard = (boardId: string) => {
    const board = boardInfos.find((b) => b.id === boardId);
    if (board) {
      setEditBoardData({
        id: board.id,
        title: board.title,
        teamIds: board.teamIds,
      });

      setTimeout(() => {
        setIsEditModalOpen(true);
      }, 0);
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
    setBoardIdToDelete(boardId);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteBoard = () => {
    if (!isAdmin) {
      showWarnToast("Only admin or super admin can delete a board.");
      return;
    }

    if (boardIdToDelete) {
      deleteBoard(boardIdToDelete);

      if (boardIdToDelete === selectedBoardId) {
        router.push({ query: {} });
      }
    }

    setIsDeleteModalOpen(false);
    setBoardIdToDelete(null);
  };

  const handleBoardSelect = (boardId: string) => {
    router.push({
      query: { b: boardId },
    });
  };

  if (isLoading) return <RateupLoader h={"100dvh"} />;

  return (
    <Container size="2xl" py="xl">
      {/* Header with team filter and create button */}
      {!selectedBoardId && (
        <Group mb="xl">
          <Title order={3}>Boards</Title>
          <Group>
            <TeamSelector
              value={selectedTeamId}
              onChange={(value) => setSelectedTeamId(value)}
              enableAll
            />
            <RateupButtonPrimary
              onClick={() => setIsCreateModalOpen(true)}
              title="Create Board"
              leftIcon={<IconPlus size={16} />}
            />
          </Group>
        </Group>
      )}

      {/* Board Cards Grid */}
      {selectedBoardId ? (
        <BoardContent selectedBoardId={selectedBoardId} />
      ) : (
        <>
          {filteredBoards.length > 0 ? (
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
              {filteredBoards.map((board) => (
                <BoardCard
                  key={board.id}
                  board={board}
                  isSelected={board.id === selectedBoardId}
                  onSelect={handleBoardSelect}
                  onEdit={handleOpenEditBoard}
                  onDelete={handleDeleteBoard}
                />
              ))}
            </SimpleGrid>
          ) : (
            <Flex align="center" justify="center" h="60vh">
              <Text c="dimmed">
                No boards found. Create a new board to get started.
              </Text>
            </Flex>
          )}
        </>
      )}

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

      {/* Edit Board Modal */}
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

      <Modal
        opened={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setBoardIdToDelete(null);
        }}
        title="Confirm Deletion"
        centered
      >
        <Stack>
          <Text>
            Are you sure you want to delete this board? This action cannot be
            undone.
          </Text>
          <Group justify="right">
            <RateupButtonPrimary
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setBoardIdToDelete(null);
              }}
              title="Cancel"
            />
            <RateupButtonPrimary
              color="red"
              onClick={confirmDeleteBoard}
              title="Delete"
            />
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
