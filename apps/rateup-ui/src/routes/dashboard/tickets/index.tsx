import { useMemo, useState } from "react";

import { IconDots, IconEdit, IconTrash } from "@tabler/icons-react";
import {
  createFileRoute,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useTeamsByUser } from "@/backend/team/team.query";
import { useBoardQueries } from "@/backend/tickets/tickets.query";
import { useUserInfo } from "@/backend/user/user.query";
import {
  GenericActionCard,
  GenericCardGrid,
} from "@/components/common/generic-card.tsx";
import { ListPageLayout } from "@/components/common/list-page-layout.tsx";
import { sortData } from "@/components/dashboard/SortDropDown.tsx";
import useDebounce from "@/components/menu/hook/useDebounce.ts";
import { BoardContent } from "@/components/Tickets/BoardContent.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { MultiSelect } from "@/components/ui/multi-select.tsx";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";


export const Route = createFileRoute("/dashboard/tickets/")({
  component: Page,
});

type BoardListEntry = {
  readonly id: string;
  readonly title: string;
  readonly teamIds: string[];
  readonly teamNames: string[];
};

type BoardFormState = {
  readonly id?: string;
  readonly title: string;
  readonly teamIds: string[];
};

type TeamOption = {
  readonly value: string;
  readonly label: string;
};

const EMPTY_BOARD_FORM: BoardFormState = {
  title: "",
  teamIds: [],
};

function Page() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newBoardData, setNewBoardData] =
    useState<BoardFormState>(EMPTY_BOARD_FORM);
  const [editBoardData, setEditBoardData] =
    useState<BoardFormState>(EMPTY_BOARD_FORM);
  const [boardIdToDelete, setBoardIdToDelete] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState("latest");
  const [search, setSearch] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("all");

  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false });
  const selectedBoardId = searchParams.b ?? "";
  const debouncedSearch = useDebounce(search.trim(), 200);
  const { t: translations } = useTranslation();

  const { data: userRes } = useUserInfo() as { data: { data: UserData } };
  const role = userRes?.data?.role;
  const isAdmin = role === "SUPER_ADMIN" || role === "ADMIN";

  const { boards, isLoading, error, createBoard, updateBoard, deleteBoard } =
    useBoardQueries();
  const {
    data: teamRes,
    isPending: teamsLoading,
    isError: isTeamsError,
    refetch: refetchTeams,
  } = useTeamsByUser();

  const teamOptions = useMemo(() => {
    const teams = teamRes?.data ?? [];

    return teams.map((team) => ({
      value: team.id,
      label: team.name,
    }));
  }, [teamRes?.data]);

  const boardInfos = useMemo(() => {
    const teamLookup = new Map(
      teamOptions.map((team) => [team.value, team.label]),
    );

    return boards.map((board) => {
      const teamIds = board.teams.map((team) => team.teamId);

      return {
        id: board.id,
        title: board.title,
        teamIds,
        teamNames: teamIds.map((teamId) => teamLookup.get(teamId) ?? teamId),
      } satisfies BoardListEntry;
    });
  }, [boards, teamOptions]);

  const filteredBoards = useMemo(() => {
    const searchValue = debouncedSearch.toLowerCase();

    const filtered = boardInfos.filter((board) => {
      const matchesSearch =
        !searchValue || board.title.toLowerCase().includes(searchValue);
      const matchesTeam =
        selectedTeamId === "all" || board.teamIds.includes(selectedTeamId);

      return matchesSearch && matchesTeam;
    });

    return sortData(filtered, sortOption) as BoardListEntry[];
  }, [boardInfos, debouncedSearch, selectedTeamId, sortOption]);

  const handleCreateBoard = () => {
    if (!newBoardData.title.trim() || !newBoardData.teamIds.length) {
      return;
    }

    createBoard({
      title: newBoardData.title.trim(),
      teamIds: newBoardData.teamIds,
    });

    setNewBoardData(EMPTY_BOARD_FORM);
    setIsCreateDialogOpen(false);
  };

  const handleOpenEditBoard = (boardId: string) => {
    const board = boardInfos.find((entry) => entry.id === boardId);
    if (!board) {
      return;
    }

    setEditBoardData({
      id: board.id,
      title: board.title,
      teamIds: board.teamIds,
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEditBoard = () => {
    if (
      !editBoardData.id ||
      !editBoardData.title.trim() ||
      !editBoardData.teamIds.length
    ) {
      return;
    }

    updateBoard({
      id: editBoardData.id,
      title: editBoardData.title.trim(),
      teamIds: editBoardData.teamIds,
    });

    setIsEditDialogOpen(false);
  };

  const handleDeleteBoard = (boardId: string) => {
    setBoardIdToDelete(boardId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteBoard = () => {
    if (!isAdmin) {
      toast.warning("Only admin or super admin can delete a board.");
      return;
    }

    if (boardIdToDelete) {
      deleteBoard(boardIdToDelete);

      if (boardIdToDelete === selectedBoardId) {
        navigate({
          to: "/dashboard/tickets",
        });
      }
    }

    setIsDeleteDialogOpen(false);
    setBoardIdToDelete(null);
  };

  const handleBoardSelect = (boardId: string) => {
    navigate({
      to: `?b=${boardId}`,
    });
  };

  const rightControls = (
    <BoardTeamFilter
      disabled={teamsLoading || isTeamsError}
      teamOptions={teamOptions}
      value={selectedTeamId}
      onChange={setSelectedTeamId}
    />
  );

  if (selectedBoardId) {
    return (
      <BoardContent
        selectedBoardId={selectedBoardId}
        teamOptions={teamOptions}
      />
    );
  }

  return (
    <>
      <ListPageLayout
        canCreate
        createLabel={translations("Create Board")}
        createDisabledText={translations("Create Board")}
        docsUrl={"tickets"}
        isLoading={isLoading}
        queryKeys={["boards"]}
        search={search}
        searchPlaceholder={translations("Search boards...")}
        tourSteps={[]}
        onCreate={() => setIsCreateDialogOpen(true)}
        onSearchChange={setSearch}
        sortValue={sortOption}
        onSortChange={setSortOption}
        rightControls={rightControls}
        isError={Boolean(error) || isTeamsError}
        onRetry={() => {
          void refetchTeams();
        }}
        isEmpty={
          !isLoading && !error && !isTeamsError && filteredBoards.length === 0
        }
        emptyTitle={translations("No boards found")}
        emptyDescription={translations(
          "Try changing the team filter or create a new board.",
        )}
      >
        <BoardCardList
          boards={filteredBoards}
          onDelete={handleDeleteBoard}
          onEdit={handleOpenEditBoard}
          onSelect={handleBoardSelect}
        />
      </ListPageLayout>

      <BoardFormDialog
        open={isCreateDialogOpen}
        title={translations("Create New Board")}
        description={translations(
          "Set a board title and choose which teams can access it.",
        )}
        submitLabel={translations("Create")}
        teamOptions={teamOptions}
        value={newBoardData}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) {
            setNewBoardData(EMPTY_BOARD_FORM);
          }
        }}
        onChange={setNewBoardData}
        onSubmit={handleCreateBoard}
      />

      <BoardFormDialog
        open={isEditDialogOpen}
        title={translations("Edit Board")}
        description={translations(
          "Update the board title and the teams assigned to it.",
        )}
        submitLabel={translations("Save")}
        teamOptions={teamOptions}
        value={editBoardData}
        onOpenChange={setIsEditDialogOpen}
        onChange={setEditBoardData}
        onSubmit={handleSaveEditBoard}
      />

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) {
            setBoardIdToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{translations("Delete board?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {translations(
                "This action cannot be undone. The board and its current setup will be removed.",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{translations("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmDeleteBoard}
            >
              {translations("Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

type BoardTeamFilterProps = {
  readonly disabled: boolean;
  readonly teamOptions: TeamOption[];
  readonly value: string;
  readonly onChange: (value: string) => void;
};

function BoardTeamFilter({
  disabled,
  teamOptions,
  value,
  onChange,
}: Readonly<BoardTeamFilterProps>) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="min-w-42">
        <div className="flex items-center gap-2 truncate">
          <div className="flex size-7 items-center justify-center rounded-md bg-muted">
            <Users className="size-4 text-muted-foreground" />
          </div>
          <SelectValue placeholder="Team" />
        </div>
      </SelectTrigger>
      <SelectContent align="end">
        <SelectGroup>
          <SelectItem value="all">All Teams</SelectItem>
          {teamOptions.map((team) => (
            <SelectItem key={team.value} value={team.value}>
              {team.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

type BoardCardListProps = {
  readonly boards: BoardListEntry[];
  readonly onSelect: (boardId: string) => void;
  readonly onEdit: (boardId: string) => void;
  readonly onDelete: (boardId: string) => void;
};

function BoardCardList({
  boards,
  onSelect,
  onEdit,
  onDelete,
}: Readonly<BoardCardListProps>) {
  return (
    <GenericCardGrid
      items={boards}
      getKey={(board) => board.id}
      renderItem={(board) => (
        <BoardListCard
          board={board}
          onDelete={onDelete}
          onEdit={onEdit}
          onSelect={onSelect}
        />
      )}
    />
  );
}

type BoardListCardProps = {
  readonly board: BoardListEntry;
  readonly onSelect: (boardId: string) => void;
  readonly onEdit: (boardId: string) => void;
  readonly onDelete: (boardId: string) => void;
};

function BoardListCard({
  board,
  onSelect,
  onEdit,
  onDelete,
}: Readonly<BoardListCardProps>) {
  const visibleTeamNames = board.teamNames.slice(0, 3);
  const extraTeams = Math.max(
    board.teamNames.length - visibleTeamNames.length,
    0,
  );

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(event) => event.stopPropagation()}
        >
          <IconDots size={20} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onClick={(event) => event.stopPropagation()}
      >
        <DropdownMenuItem onClick={() => onEdit(board.id)}>
          <IconEdit size={16} className="mr-2" />
          Edit board
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onClick={() => onDelete(board.id)}
        >
          <IconTrash size={16} className="mr-2" />
          Delete board
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const content = (
    <div className="flex flex-wrap gap-2">
      {visibleTeamNames.map((teamName) => (
        <Badge key={teamName} variant="secondary" className="text-xs">
          {teamName}
        </Badge>
      ))}
      {extraTeams ? (
        <Badge variant="outline" className="text-xs">
          +{extraTeams} more
        </Badge>
      ) : null}
    </div>
  );

  return (
    <GenericActionCard
      title={board.title}
      titleTooltip={board.title}
      subtitle={
        board.teamNames.length === 1
          ? "1 team assigned"
          : `${board.teamNames.length} teams assigned`
      }
      actions={menu}
      content={content}
      footerLeft={<Badge variant="default">Board</Badge>}
      onClick={() => onSelect(board.id)}
    />
  );
}

type BoardFormDialogProps = {
  readonly open: boolean;
  readonly title: string;
  readonly description: string;
  readonly submitLabel: string;
  readonly teamOptions: TeamOption[];
  readonly value: BoardFormState;
  readonly onOpenChange: (open: boolean) => void;
  readonly onChange: (value: BoardFormState) => void;
  readonly onSubmit: () => void;
};

function BoardFormDialog({
  open,
  title,
  description,
  submitLabel,
  teamOptions,
  value,
  onOpenChange,
  onChange,
  onSubmit,
}: Readonly<BoardFormDialogProps>) {
  const isSubmitDisabled = !value.title.trim() || value.teamIds.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="board-title">Board title</FieldLabel>
            <Input
              id="board-title"
              placeholder="Enter board title"
              value={value.title}
              onChange={(event) =>
                onChange({
                  ...value,
                  title: event.currentTarget.value,
                })
              }
            />
          </Field>

          <Field>
            <FieldLabel>Teams</FieldLabel>
            <MultiSelect
              placeholder="Select teams"
              options={teamOptions}
              value={value.teamIds}
              onValueChange={(teamIds) =>
                onChange({
                  ...value,
                  teamIds,
                })
              }
              searchable
              className="w-full"
              emptyIndicator={
                <p className="text-center text-sm">No teams found</p>
              }
            />
            <FieldDescription>
              Choose the teams that can work inside this board.
            </FieldDescription>
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitDisabled}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
