import { IconDotsVertical, IconEdit, IconFolder, IconPlus, IconTrash } from "@tabler/icons-react";
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

interface ContactGroupCardProps {
  group: ContactGroup;
  handleEdit: (group: ContactGroup) => void;
  handleDelete: (group: ContactGroup) => void;
}

function ContactGroupCard({ group, handleEdit, handleDelete }: ContactGroupCardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <ActionCard
      title={
        <div className="flex min-w-0 items-center gap-2.5">
          <GroupIconTile icon={group.icon} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{group.name}</span>
            <span className="text-xs font-normal text-muted-foreground">
              {t("{count, plural, one {# member} other {# members}}", {
                count: group._count.contacts,
              })}
            </span>
          </div>
        </div>
      }
      titleTooltip={group.name}
      actions={<GroupCardMenu group={group} handleEdit={handleEdit} handleDelete={handleDelete} />}
      createdAt={group.createdAt}
      footerLeft={
        group.team?.name ? (
          <Badge variant="secondary" className="max-w-40 truncate">
            {group.team.name}
          </Badge>
        ) : null
      }
      onClick={() => navigate({ to: `/dashboard/contacts/groups/${group.id}` })}
    />
  );
}

/** The group's uploaded icon, or a folder glyph on the brand tint. Shared with the detail page. */
export function GroupIconTile({
  icon,
  className = "size-9 rounded-xl",
}: {
  icon?: string | null;
  className?: string;
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden bg-primary/10 text-primary ${className}`}
    >
      {icon ? (
        <Avatar className="size-full rounded-none">
          <AvatarImage src={getFileUrlFromKey(icon)} className="object-cover" />
        </Avatar>
      ) : (
        <IconFolder className="size-1/2" />
      )}
    </div>
  );
}

function GroupCardMenu({ group, handleEdit, handleDelete }: ContactGroupCardProps) {
  const { t } = useTranslation();
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
          <DropdownMenuLabel>{t("Actions")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(group);
            }}
          >
            <IconEdit className="w-4 h-4 mr-2" />
            {t("Edit Group")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(group);
            }}
            variant="destructive"
          >
            <IconTrash className="w-4 h-4 mr-2" />
            {t("Delete Group")}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
