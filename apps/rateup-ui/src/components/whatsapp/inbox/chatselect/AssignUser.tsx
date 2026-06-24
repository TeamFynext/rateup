import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useTeamsMembersOfOrg } from "@/backend/org/org.query";
import { useTeamsByUser } from "@/backend/team/team.query";
import { useBulkAssignInboxToUser } from "@/backend/whatsapp/inbox/message/wamessage.query";
import { useContactsStore } from "@/components/dashboard/inbox/store.ts";
import { Button } from "@/components/ui/button.tsx";
import { CreativeAvatar } from "@/components/ui/creative-avatar.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { WaMessageAssignStatus } from "@/types/enums.ts";

const BulkAssignUser = ({ contactIds, filterData, onSuccess }) => {
  const { user } = useUser();
  const { data: teamMembers, isLoading: membersLoading } = useTeamsMembersOfOrg();
  const { data: teamsRes, isLoading: teamsLoading } = useTeamsByUser();
  const { updateContactById } = useContactsStore();
  const [actionType, setActionType] = useState<"assign" | "self" | null>(null);
  const { t } = useTranslation();

  const teams = teamsRes?.data ?? [];
  const staffMembers = teamMembers?.data ?? [];

  const bulkAssignMutation = useBulkAssignInboxToUser(filterData);

  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedUser, setSelectedUser] = useState("");

  const teamMembersFiltered = useMemo(() => {
    if (!selectedTeam) return [];

    return staffMembers.filter((member) =>
      member.teams.some((t: any) => t.team_id === selectedTeam),
    );
  }, [selectedTeam, staffMembers]);

  const handleAssign = () => {
    if (!selectedTeam || !selectedUser) return;
    setActionType("assign");
    bulkAssignMutation.mutate(
      {
        contactIds,
        assignee: {
          userId: selectedUser,
          teamId: selectedTeam,
        },
      },
      {
        onSuccess: () => {
          const user = staffMembers.find((m) => m.id === selectedUser);
          contactIds.forEach((contactId) => {
            updateContactById(contactId, (contact) => ({
              ...contact,
              waMessageAssignStatus: WaMessageAssignStatus.ASSIGNED,
              assignedUsers: [
                {
                  id: user?.id,
                  name: user?.name,
                  teamId: selectedTeam,
                },
              ],
            }));
          });
          onSuccess?.();
          setActionType(null);
        },
        onError: () => {
          setActionType(null);
        },
      },
    );
  };
  const handleAssignToMe = () => {
    setActionType("self");
    bulkAssignMutation.mutate(
      {
        contactIds,
        assignee: {
          userId: user.userId,
          teamId: user.teams?.[0],
        },
      },
      {
        onSuccess: () => {
          contactIds.forEach((contactId) => {
            updateContactById(contactId, (contact) => ({
              ...contact,
              waMessageAssignStatus: WaMessageAssignStatus.ASSIGNED,
              assignedUsers: [
                {
                  id: user?.userId,
                  name: user?.userName,
                  teamId: user.teams?.[0],
                },
              ],
            }));
          });
          onSuccess?.();
          setActionType(null);
        },
        onError: () => {
          setActionType(null);
        },
      },
    );
  };

  return (
    <div className="space-y-5 w-full">
      {/* TEAM SELECT */}
      <div className="space-y-2">
        <Label>{t("Select Team")}</Label>

        {teamsLoading ? (
          <Skeleton className="h-10 w-full rounded-md" />
        ) : (
          <Select
            value={selectedTeam}
            onValueChange={(val) => {
              setSelectedTeam(val);
              setSelectedUser("");
            }}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder={t("Select Team")} />
            </SelectTrigger>

            <SelectContent>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      {/* MEMBER SELECT */}
      <div className="space-y-2">
        <Label> {t("Select Member")} </Label>

        {membersLoading ? (
          <Skeleton className="h-10 w-full rounded-md" />
        ) : (
          <Select value={selectedUser} onValueChange={setSelectedUser} disabled={!selectedTeam}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder={t("Select team member")} />
            </SelectTrigger>

            <SelectContent>
              {teamMembersFiltered.map((staff: any) => (
                <SelectItem key={staff.id} value={staff.id}>
                  <div className="flex items-center gap-2 py-1">
                    <CreativeAvatar
                      name={staff.name}
                      size="xs"
                      showOnlineStatus
                      isOnline={staff.status === "online"}
                    />
                    <span>{staff.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      {/* ASSIGN BUTTON */}
      <div className="flex flex-col gap-3 w-full">
        {/* PRIMARY ACTION */}
        <Button
          onClick={handleAssign}
          disabled={!selectedTeam || !selectedUser || bulkAssignMutation.isPending}
          className="w-full h-10 flex items-center justify-center gap-2"
        >
          {bulkAssignMutation.isPending && actionType === "assign" && (
            <Loader2 className="w-4 h-4 animate-spin" />
          )}
          {t("Assign Chats")}
        </Button>

        {/* DIVIDER */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex-1 h-px bg-border" />
          OR
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* SECONDARY ACTION */}
        <Button
          onClick={handleAssignToMe}
          disabled={bulkAssignMutation.isPending}
          variant="outline"
          className="w-full h-10 flex items-center justify-center gap-2"
        >
          {bulkAssignMutation.isPending && actionType === "self" && (
            <Loader2 className="w-4 h-4 animate-spin" />
          )}
          {t("Assign To Me")}
        </Button>
      </div>
    </div>
  );
};

export default BulkAssignUser;
