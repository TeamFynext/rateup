"use client";

import { group } from "console";
import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Flex, TextInput } from "@mantine/core";
import { useDebouncedState } from "@mantine/hooks";
import { IconSearch } from "@tabler/icons-react";
import { ColumnFiltersState, SortingState } from "@tanstack/react-table";
import {
  Edit,
  Eye,
  Folder,
  MoreVertical,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { ContactGroupType } from "@/types/enums";
import {
  useContactGroup,
  useDeleteGroupMutation,
} from "@/backend/campaign/contactGroup/contactGroup.query";
import CreateGroupModal from "@/components/Contacts/CreateGroupModal";
import { TeamSelector } from "@/components/input/TeamSelector";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import ContactTable from "@/components/Table/ContactTable";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import CustomAlertDialog from "@/components/ui/custom/CustomAlertDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { getStringColor } from "@/components/ui/utils";
import { formatDate, formateDate2 } from "@/utils/dateTime";
import { getFileUrlFromKey } from "@/utils/file-upload/upload";

const GroupPage = () => {
  const [selectedTeamID, setSelectedTeamID] = useState("");
  const [searchTerm, setSearchTerm] = useDebouncedState("", 200);
  const {
    isLoading: isLoadingContactgroup,
    data: contactGroupData,
    refetch: refetchGroups,
    isRefetching: isRefetchingGroups,
    isError: isErrorGroup,
  } = useContactGroup();
  const translations = useTranslations();
  const contactGroups =
    selectedTeamID == "all" || !selectedTeamID
      ? contactGroupData?.filter(
          (group) =>
            !searchTerm ||
            group?.name?.toLowerCase().includes(searchTerm.toLowerCase()),
        ) || []
      : contactGroupData
          ?.filter((group) => group?.teamId === selectedTeamID)
          ?.filter(
            (group) =>
              !searchTerm ||
              group?.name?.toLowerCase().includes(searchTerm.toLowerCase()),
          ) || [];
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isDeleteGroupOpen, setIsDeleteGroupOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);

  function handleEditGroup(group) {
    setSelectedGroup(group);
    setIsCreateGroupOpen(true);
  }

  function handleDeleteGroup(group) {
    setSelectedGroup(group);
    setIsDeleteGroupOpen(true);
  }
  const deleteGroupMutation = useDeleteGroupMutation();
  function onDeleteGroupConfirm(selectedGroup) {
    deleteGroupMutation.mutate(selectedGroup.id, {
      onSuccess: () => {
        toast.success("Group deleted successfully");
      },
      onError: (error) => {
        toast.error(error?.message || "Error in deleting group");
      },
    });
  }

  if (isLoadingContactgroup) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spinner className="w-10 h-10 text-rateup-blue" />
        <span className="text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-5">
      <Card className="p-2">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={translations("Search contact groups")}
              onChange={(event) => setSearchTerm(event.currentTarget.value)}
              className="pl-10 placeholder:text-sm bg-gray-100 border-none"
              value={searchTerm}
            />
          </div>

          <TeamSelector
            value={selectedTeamID}
            onChange={setSelectedTeamID}
            enableAll={true}
          />
          <Button
            size="sm"
            onClick={() => {
              setSelectedGroup(null);
              setIsCreateGroupOpen(true);
            }}
            className="bg-rateup-blue"
          >
            <Plus />
            <span className="text-sm font-normal">
              {translations("Create Group")}
            </span>
          </Button>
        </div>
      </Card>
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-1">
          {contactGroups.map((group) => {
            return (
              <ContactGroupCard
                group={group}
                handleEdit={handleEditGroup}
                handleDelete={handleDeleteGroup}
                key={group?.id}
              />
            );
          })}
        </div>

        {contactGroups.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Folder className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="mb-2">No groups found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm
                ? "Try a different search term"
                : "Create your first group to organize contacts"}
            </p>
            {!searchTerm && (
              <Button
                onClick={() => setIsCreateGroupOpen(true)}
                className="bg-rateup-blue"
              >
                <Plus className="w-4 h-4 mr-2" />
                <span className="text-sm font-normal">Create Group</span>
              </Button>
            )}
          </div>
        )}
      </div>
      <CreateGroupModal
        opened={isCreateGroupOpen}
        setOpened={setIsCreateGroupOpen}
        type={ContactGroupType.NORMAL}
        isEdit={!!selectedGroup}
        groupDetails={selectedGroup}
      />
      <CustomAlertDialog
        opened={isDeleteGroupOpen}
        buttonTitle="Delete"
        description="Are you sure you want to delete this group?"
        title="Delete Group"
        setOpened={setIsDeleteGroupOpen}
        buttonColor="bg-red-500"
        onAction={() => onDeleteGroupConfirm(selectedGroup)}
      />
    </div>
  );
};

const ContactGroupCard = ({ group, handleEdit, handleDelete }) => {
  const getColorClass = (str: string) => {
    const colors = [
      "bg-blue-100 text-blue-700 border-blue-300",
      "bg-green-100 text-green-700 border-green-300",
      "bg-purple-100 text-purple-700 border-purple-300",
      "bg-pink-100 text-pink-700 border-pink-300",
      "bg-orange-100 text-orange-700 border-orange-300",
      "bg-emerald-100 text-emerald-700 border-emerald-300",
      "bg-indigo-100 text-indigo-700 border-indigo-300",
      "bg-red-100 text-red-700 border-red-300",
    ];

    // Simple deterministic hash
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Convert hash to an index
    const index = Math.abs(hash) % colors.length;

    return colors[index];
  };
  const router = useRouter();
  return (
    <Card
      key={group.id}
      className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={(e) => {
        router.push(`/dashboard/contacts/groups/${group.id}`);
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${getColorClass(group.name)}`}>
          {group.icon ? (
            <Avatar className="w-5 h-5">
              <AvatarImage src={getFileUrlFromKey(group.icon)} />
            </Avatar>
          ) : (
            <Folder className="w-5 h-5" />
          )}
        </div>
        <GroupCardMenu
          group={group}
          handleEdit={handleEdit}
          handleDelete={handleDelete}
        />
      </div>

      <div className="space-y-2">
        <h3 className="truncate">{group.name}</h3>
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">
            {group.team.name}
          </Badge>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {group._count.contacts}
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Created {formatDate(group.createdAt)}
        </p>
      </div>
    </Card>
  );
};

const GroupCardMenu = ({ group, handleEdit, handleDelete }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            handleEdit(group);
          }}
        >
          <Edit className="w-4 h-4 mr-2" />
          Edit Group
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            handleDelete(group);
          }}
          className="text-red-600"
        >
          <Trash2 className="w-4 h-4 mr-2 text-red-500" />
          Delete Group
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default GroupPage;
