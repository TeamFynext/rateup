import { useMemo, useState } from "react";

import { IconDots, IconEdit, IconTrash } from "@tabler/icons-react";
import {
  createFileRoute,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { Calendar, LayoutPanelTop, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useTeamsByUser } from "@/backend/team/team.query";
import { useBoardQueries } from "@/backend/tickets/tickets.query";
import { useUserInfo } from "@/backend/user/user.query";
import { GenericCardGrid } from "@/components/common/generic-card.tsx";
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
import { Input } from "@/components/ui/input.tsx";
import { MultiSelect } from "@/components/ui/multi-select.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
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
  readonly description?: string | null;
  readonly createdAt?: string;
  readonly totalTickets: number;
  readonly columnStats: Array<{ title: string; count: number }>;
  readonly teamIds: string[];
  readonly teamNames: string[];
};

type BoardFormState = {
  readonly id?: string;
  readonly title: string;
  readonly description: string;
  readonly teamIds: string[];
};

type TeamOption = {
  readonly value: string;
  readonly label: string;
};

const EMPTY_BOARD_FORM: BoardFormState = {
  title: "",
  description: "",
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

      let totalTickets = 0;
      const columnStats: Array<{ title: string; count: number }> = [];
      if (board.ticketColumns) {
        for (const col of board.ticketColumns) {
          const count = col._count?.ticketCards || 0;
          totalTickets += count;
          if (count > 0) {
            columnStats.push({ title: col.title, count });
          }
        }
      }

      return {
        id: board.id,
        title: board.title,
        description: board.description,
        createdAt: board.createdAt,
        totalTickets,
        columnStats: columnStats.slice(0, 2),
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
      description: newBoardData.description.trim(),
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
      description: board.description || "",
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
      description: editBoardData.description.trim(),
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
      toast.warning(
        translations("Only admin or super admin can delete a board."),
      );
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
  const { t } = useTranslation();

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="min-w-42">
        <div className="flex items-center gap-2 truncate">
          <div className="flex size-7 items-center justify-center rounded-md bg-muted">
            <Users className="size-4 text-muted-foreground" />
          </div>
          <SelectValue placeholder={t("Team")} />
        </div>
      </SelectTrigger>
      <SelectContent align="end">
        <SelectGroup>
          <SelectItem value="all">{t("All Teams")}</SelectItem>
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
  const [hovered, setHovered] = useState(false);
  const { t } = useTranslation();

  return (
    <div
      onClick={() => onSelect(board.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="bg-card rounded-xl p-5 cursor-pointer border transition-all duration-150 flex flex-col h-full hover:shadow-md hover:-translate-y-0.5"
    >
      <div className="flex items-start gap-2.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <div className="font-bold text-lg tracking-[-0.01em] leading-tight truncate">
              {board.title}
            </div>
            {board.teamNames.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <span className="text-[10px] text-muted-foreground font-normal cursor-pointer hover:text-foreground shrink-0 mt-1">
                    ({board.teamNames.slice(0, 2).join(", ")}
                    {board.teamNames.length > 2 ? ", ..." : ""})
                  </span>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-3">
                  <div className="text-xs font-bold mb-2">
                    {t("Assigned Teams")}
                  </div>
                  <ul className="text-sm space-y-1">
                    {board.teamNames.map((name, i) => (
                      <li key={i}>{name}</li>
                    ))}
                  </ul>
                </PopoverContent>
              </Popover>
            )}
          </div>
          <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {board.description || t("No description")}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 -mt-1 rounded-md shrink-0"
              onClick={(event) => event.stopPropagation()}
            >
              <IconDots size={18} stroke={2} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            onClick={(event) => event.stopPropagation()}
          >
            <DropdownMenuItem onClick={() => onEdit(board.id)}>
              <IconEdit size={16} className="mr-2" />
              {t("Edit")}
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(board.id)}
            >
              <IconTrash size={16} className="mr-2" />
              {t("Delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-2 mt-4 flex-wrap">
        <span className="font-semibold text-sm">
          {board.totalTickets}{" "}
          {board.totalTickets !== 1 ? t("tickets") : t("ticket")}
        </span>
        {board.columnStats.map((stat, i) => {
          const colors =
            i % 2 === 0
              ? "bg-red-50 text-red-600 border-red-100"
              : "bg-orange-50 text-orange-600 border-orange-100";
          return (
            <span
              key={i}
              className={`text-[10px] h-[22px] px-2 flex items-center font-medium rounded-full border ${colors}`}
            >
              {stat.count} {stat.title.toLowerCase()}
            </span>
          );
        })}
      </div>

      <div className="flex-1" />

      <div className="h-px bg-border my-4" />

      <div className="flex items-center justify-between mt-auto">
        <Badge variant="secondary" className="text-xs">
          {t("Active")}
        </Badge>
        {board.createdAt && (
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <Calendar className="w-3.5 h-3.5" />
            {t("Created")}{" "}
            {formatDistanceToNow(new Date(board.createdAt), {
              addSuffix: true,
            })}
          </div>
        )}
      </div>
    </div>
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
  title: modalTitle,
  description: modalDescription,
  submitLabel,
  teamOptions,
  value,
  onOpenChange,
  onChange,
  onSubmit,
}: Readonly<BoardFormDialogProps>) {
  const isSubmitDisabled = !value.title.trim() || value.teamIds.length === 0;
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        {/* We use visually hidden elements for accessibility if we don't want the default DialogTitle/DialogDescription to break our layout. 
            However, DialogTitle is required for screen readers, so we include it visually hidden if needed, or wrap our visual title. */}
        <DialogHeader className="hidden">
          <DialogTitle>{modalTitle}</DialogTitle>
          <DialogDescription>{modalDescription}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <LayoutPanelTop className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="font-bold text-xl">{modalTitle}</div>
            <div className="text-sm text-muted-foreground">
              {modalDescription}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <div className="text-xs font-bold text-muted-foreground tracking-wider uppercase mb-1.5">
              {t("Board Name")} *
            </div>
            <Input
              id="board-title"
              placeholder={t("e.g. Customer Support, Bug Tracker…")}
              value={value.title}
              onChange={(event) =>
                onChange({
                  ...value,
                  title: event.currentTarget.value,
                })
              }
              className="text-sm shadow-none focus-visible:ring-0 focus-visible:border-primary transition-colors"
            />
          </div>

          <div>
            <div className="text-xs font-bold text-muted-foreground tracking-wider uppercase mb-1.5">
              {t("Description")}
            </div>
            <Input
              placeholder={t("What kind of work lives here?")}
              value={value.description || ""}
              onChange={(event) =>
                onChange({
                  ...value,
                  description: event.currentTarget.value,
                })
              }
              className="text-sm shadow-none focus-visible:ring-0 focus-visible:border-primary transition-colors"
            />
          </div>

          <div>
            <div className="text-xs font-bold text-muted-foreground tracking-wider uppercase mb-1.5">
              {t("Teams")}
            </div>
            <MultiSelect
              placeholder={t("Select teams")}
              options={teamOptions}
              value={value.teamIds}
              onValueChange={(teamIds) =>
                onChange({
                  ...value,
                  teamIds,
                })
              }
              searchable
              className="w-full text-sm shadow-none"
              emptyIndicator={
                <p className="text-center text-sm">{t("No teams found")}</p>
              }
            />
            <div className="text-xs text-muted-foreground mt-2">
              {t("Choose the teams that can work inside this board.")}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6 flex gap-2 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground"
          >
            {t("Cancel")}
          </Button>
          <Button size="sm" onClick={onSubmit} disabled={isSubmitDisabled}>
            <LayoutPanelTop className="w-4 h-4 mr-2" />
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
