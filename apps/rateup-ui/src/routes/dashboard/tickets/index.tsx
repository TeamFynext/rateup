import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { LayoutPanelTop, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useTeamsByUser } from "@/backend/team/team.query";
import { useBoardQueries } from "@/backend/tickets/tickets.query";
import { useUserInfo } from "@/backend/user/user.query";
import InfoButton from "@/components/Button/InfoButton.tsx";
import RefreshButton from "@/components/Button/RefreshButton.tsx";
import { CardGrid } from "@/components/common/generic-card.tsx";
import {
  ListPage,
  ListPageContent,
  ListPageHeader,
  ListPageHeaderSection,
  ListPageSearchInput,
  ListPageSortDropdown,
} from "@/components/common/list-page-layout.tsx";
import { sortData } from "@/components/dashboard/SortDropDown.tsx";
import useDebounce from "@/components/menu/hook/useDebounce.ts";
import { BoardCard } from "@/components/Tickets/BoardCard.tsx";
import { BoardContent } from "@/components/Tickets/BoardContent.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
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
import { useConfirm } from "@/context/confirm-provider.tsx";
import { docsPath } from "@/utils/constants.ts";

dayjs.extend(relativeTime);

export const Route = createFileRoute("/dashboard/tickets/")({
  component: Page,
});

interface BoardListEntry {
  readonly id: string;
  readonly title: string;
  readonly description?: string | null;
  readonly createdAt?: string | Date;
  readonly totalTickets: number;
  readonly columnStats: Array<{ title: string; count: number }>;
  readonly teamIds: string[];
  readonly teamNames: string[];
}

interface BoardFormState {
  readonly id?: string;
  readonly title: string;
  readonly description: string;
  readonly teamIds: string[];
}

interface TeamOption {
  readonly value: string;
  readonly label: string;
}

const EMPTY_BOARD_FORM: BoardFormState = {
  title: "",
  description: "",
  teamIds: [],
};

function Page() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newBoardData, setNewBoardData] = useState<BoardFormState>(EMPTY_BOARD_FORM);
  const [editBoardData, setEditBoardData] = useState<BoardFormState>(EMPTY_BOARD_FORM);
  const [sortOption, setSortOption] = useState("latest");
  const [search, setSearch] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("all");

  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false });
  const selectedBoardId = searchParams.b ?? "";
  const debouncedSearch = useDebounce(search.trim(), 200);
  const { t: translations } = useTranslation();
  const confirm = useConfirm();

  const { data: userRes } = useUserInfo() as { data: { data: UserData } };
  const role = userRes?.data?.role;
  const isAdmin = role === "SUPER_ADMIN" || role === "ADMIN";

  const { boards, isLoading, error, createBoard, updateBoard, deleteBoard } = useBoardQueries();
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
    const teamLookup = new Map(teamOptions.map((team) => [team.value, team.label]));

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
      const matchesSearch = !searchValue || board.title.toLowerCase().includes(searchValue);
      const matchesTeam = selectedTeamId === "all" || board.teamIds.includes(selectedTeamId);

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
    if (!editBoardData.id || !editBoardData.title.trim() || !editBoardData.teamIds.length) {
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

  const handleDeleteBoard = async (boardId: string) => {
    if (!isAdmin) {
      toast.warning(translations("Only admin or super admin can delete a board."));
      return;
    }

    const shouldDelete = await confirm({
      title: translations("Delete board?"),
      description: translations(
        "This action cannot be undone. The board and its current setup will be removed.",
      ),
      confirmText: translations("Delete"),
      cancelText: translations("Cancel"),
    });

    if (!shouldDelete) return;

    deleteBoard(boardId);

    if (boardId === selectedBoardId) {
      navigate({
        to: "/dashboard/tickets",
      });
    }
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
    return <BoardContent selectedBoardId={selectedBoardId} teamOptions={teamOptions} />;
  }

  return (
    <>
      <ListPage>
        <ListPageHeader>
          <ListPageHeaderSection className="gap-3">
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              {translations("Create Board")}
            </Button>
            <InfoButton docUrl={`${docsPath}/tickets`} />
            <RefreshButton queryKeys={["boards"]} />
          </ListPageHeaderSection>

          <ListPageHeaderSection>
            <ListPageSearchInput
              placeholder={translations("Search boards...")}
              value={search}
              onChange={setSearch}
            />
            <ListPageSortDropdown value={sortOption} onChange={setSortOption} />
            {rightControls}
          </ListPageHeaderSection>
        </ListPageHeader>

        <ListPageContent
          isLoading={isLoading}
          isError={Boolean(error) || isTeamsError}
          isEmpty={!isLoading && !error && !isTeamsError && filteredBoards.length === 0}
          emptyTitle={translations("No boards found")}
          emptyDescription={translations("Try changing the team filter or create a new board.")}
          onRetry={() => {
            void refetchTeams();
          }}
        >
          <CardGrid
            items={filteredBoards}
            getKey={(board) => board.id}
            renderItem={(board) => (
              <BoardCard
                board={board}
                onSelect={handleBoardSelect}
                onEdit={handleOpenEditBoard}
                onDelete={handleDeleteBoard}
              />
            )}
          />
        </ListPageContent>
      </ListPage>
      <BoardFormDialog
        open={isCreateDialogOpen}
        title={translations("Create New Board")}
        description={translations("Set a board title and choose which teams can access it.")}
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
        description={translations("Update the board title and the teams assigned to it.")}
        submitLabel={translations("Save")}
        teamOptions={teamOptions}
        value={editBoardData}
        onOpenChange={setIsEditDialogOpen}
        onChange={setEditBoardData}
        onSubmit={handleSaveEditBoard}
      />
    </>
  );
}

interface BoardTeamFilterProps {
  readonly disabled: boolean;
  readonly teamOptions: TeamOption[];
  readonly value: string;
  readonly onChange: (value: string) => void;
}

function BoardTeamFilter({
  disabled,
  teamOptions,
  value,
  onChange,
}: Readonly<BoardTeamFilterProps>) {
  const { t } = useTranslation();

  return (
    <Select
      value={value}
      onValueChange={(value) => onChange(value ?? "")}
      disabled={disabled}
      items={[{ value: "all", label: t("All Teams") }, ...teamOptions]}
    >
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

interface BoardFormDialogProps {
  readonly open: boolean;
  readonly title: string;
  readonly description: string;
  readonly submitLabel: string;
  readonly teamOptions: TeamOption[];
  readonly value: BoardFormState;
  readonly onOpenChange: (open: boolean) => void;
  readonly onChange: (value: BoardFormState) => void;
  readonly onSubmit: () => void;
}

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
            <div className="text-sm text-muted-foreground">{modalDescription}</div>
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
              options={teamOptions}
              value={value.teamIds ?? []}
              onValueChange={(teamIds) =>
                onChange({
                  ...value,
                  teamIds,
                })
              }
              className="w-full text-sm shadow-none"
              placeholder={t("Select teams")}
              emptyIndicator={t("No teams found")}
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
