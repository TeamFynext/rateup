// Extracted verbatim from the `/dashboard/contacts/groups/` route so the route file carries routing
// config only. Behaviour is unchanged.

import {
  IconDotsVertical,
  IconEdit,
  IconFolder,
  IconPlus,
  IconTrash,
  IconUsers,
} from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  useContactGroup,
  useDeleteGroupMutation,
} from "@/backend/campaign/contactGroup/contactGroup.query";
import { ActionCard } from "@/components/common/action-card.tsx";
import { CardGrid } from "@/components/common/generic-card.tsx";
import {
  ListPage,
  ListPageContent,
  ListPageHeader,
  ListPageHeaderSection,
  ListPageSearchInput,
  ListPageSortDropdown,
} from "@/components/common/list-page-layout.tsx";
import CreateGroupModal from "@/components/Contacts/CreateGroupModal.tsx";
import { sortData } from "@/components/dashboard/SortDropDown.tsx";
import { TeamSelector } from "@/components/input/TeamSelector.tsx";
import useDebounce from "@/components/menu/hook/useDebounce.ts";
import { Avatar, AvatarImage } from "@/components/ui/avatar.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { ContactGroupType } from "@/types/enums.ts";
import { getFileUrlFromKey } from "@/utils/file-upload/upload.ts";

export function GroupPage() {
  const [selectedTeamID, setSelectedTeamID] = useState("all");
  const [search, setSearch] = useState("");
  const [sortOption, setSortOption] = useState("latest");
  const { isLoading, data: contactGroupData, isError, refetch } = useContactGroup();
  const { t: translations } = useTranslation();
  const debouncedSearch = useDebounce(search.trim(), 200);

  const contactGroups = useMemo(() => {
    const searchValue = debouncedSearch.toLowerCase();
    const filtered = (contactGroupData ?? []).filter((group) => {
      const matchesSearch = !searchValue || group?.name?.toLowerCase().includes(searchValue);
      const matchesTeam = selectedTeamID === "all" || group?.teamId === selectedTeamID;
      return matchesSearch && matchesTeam;
    });
    return sortData(filtered, sortOption);
  }, [contactGroupData, debouncedSearch, selectedTeamID, sortOption]);

  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<ContactGroup | null>(null);
  const confirm = useConfirm();

  function handleEditGroup(group: ContactGroup) {
    setSelectedGroup(group);
    setIsCreateGroupOpen(true);
  }

  const deleteGroupMutation = useDeleteGroupMutation();

  async function handleDeleteGroup(group: ContactGroup) {
    const shouldDelete = await confirm({
      title: translations("Delete Group"),
      description: translations("Are you sure you want to delete this group?"),
      confirmText: translations("Delete"),
      cancelText: translations("Cancel"),
    });

    if (!shouldDelete) return;

    deleteGroupMutation.mutate(group.id, {
      onSuccess: () => {
        toast.success("Group deleted successfully");
      },
      onError: (error) => {
        toast.error(error?.message || "Error in deleting group");
      },
    });
  }

  return (
    <>
      <ListPage>
        <ListPageHeader>
          <ListPageHeaderSection className="gap-3">
            <Button
              onClick={() => {
                setSelectedGroup(null);
                setIsCreateGroupOpen(true);
              }}
            >
              <IconPlus className="size-4" />
              {translations("Create Group")}
            </Button>
          </ListPageHeaderSection>

          <ListPageHeaderSection>
            <ListPageSearchInput
              placeholder={translations("Search contact groups...")}
              value={search}
              onChange={setSearch}
            />
            <ListPageSortDropdown value={sortOption} onChange={setSortOption} />
            <TeamSelector value={selectedTeamID} onChange={setSelectedTeamID} enableAll={true} />
          </ListPageHeaderSection>
        </ListPageHeader>

        <ListPageContent
          isLoading={isLoading}
          isError={isError}
          isEmpty={!isLoading && !isError && contactGroups.length === 0}
          emptyTitle={translations("No groups found")}
          emptyDescription={
            debouncedSearch
              ? translations("Try a different search term")
              : translations("Create your first group to organize contacts")
          }
          onRetry={() => void refetch()}
        >
          <CardGrid
            items={contactGroups}
            getKey={(group) => group.id}
            renderItem={(group) => (
              <ContactGroupCard
                group={group}
                handleEdit={handleEditGroup}
                handleDelete={handleDeleteGroup}
              />
            )}
          />
        </ListPageContent>
      </ListPage>

      <CreateGroupModal
        opened={isCreateGroupOpen}
        setOpened={setIsCreateGroupOpen}
        type={ContactGroupType.NORMAL}
        isEdit={!!selectedGroup}
        groupDetails={selectedGroup ?? undefined}
      />
    </>
  );
}

const GROUP_COLORS = [
  "bg-ru-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-300",
  "bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-green-300",
  "bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 border-purple-300",
  "bg-pink-100 dark:bg-pink-950/50 text-pink-700 dark:text-pink-400 border-pink-300",
  "bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400 border-orange-300",
  "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-300",
  "bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border-indigo-300",
  "bg-destructive/10 text-destructive border-destructive/40",
];

function getColorClass(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (str.codePointAt(i) ?? 0) + ((hash << 5) - hash);
  }
  return GROUP_COLORS[Math.abs(hash) % GROUP_COLORS.length];
}

interface ContactGroupCardProps {
  group: ContactGroup;
  handleEdit: (group: ContactGroup) => void;
  handleDelete: (group: ContactGroup) => void;
}

function ContactGroupCard({ group, handleEdit, handleDelete }: ContactGroupCardProps) {
  const navigate = useNavigate();
  return (
    <ActionCard
      title={
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${getColorClass(group.name)}`}>
            {group.icon ? (
              <Avatar className="w-5 h-5">
                <AvatarImage src={getFileUrlFromKey(group.icon)} />
              </Avatar>
            ) : (
              <IconFolder className="w-5 h-5" />
            )}
          </div>
          {group.name}
        </div>
      }
      actions={<GroupCardMenu group={group} handleEdit={handleEdit} handleDelete={handleDelete} />}
      content={
        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-1">
            <IconUsers className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{group._count.contacts}</span>
          </div>
        </div>
      }
      createdAt={group.createdAt}
      footer={
        <Badge variant="outline" className="text-xs">
          {group.team.name}
        </Badge>
      }
      onClick={() => navigate({ to: `/dashboard/contacts/groups/${group.id}` })}
    />
  );
}

function GroupCardMenu({ group, handleEdit, handleDelete }: ContactGroupCardProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()} />}
      >
        <IconDotsVertical className="w-4 h-4" />
      </DropdownMenuTrigger>
      {/* Anchored to a small icon button, and the popup defaults to `w-(--anchor-width)` — without
          a width of its own "Edit Group" and "Delete Group" wrap onto two lines each. */}
      <DropdownMenuContent align="end" className="w-auto min-w-40">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(group);
            }}
          >
            <IconEdit className="w-4 h-4 mr-2" />
            Edit Group
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(group);
            }}
            className="text-destructive"
          >
            <IconTrash className="w-4 h-4 mr-2 text-destructive" />
            Delete Group
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
