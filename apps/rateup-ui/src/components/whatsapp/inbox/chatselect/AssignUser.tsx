import { IconLoader2 } from "@tabler/icons-react";
import { chunk } from "lodash";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useTeamsMembersOfOrg } from "@/backend/org/org.query";
import { useTeamsByUser } from "@/backend/team/team.query";
import { useBulkAssignInboxToUser } from "@/backend/whatsapp/inbox/message/wamessage.query";
import { Button } from "@/components/ui/button.tsx";
import { CreativeAvatar } from "@/components/ui/creative-avatar.tsx";
import { Field, FieldTitle } from "@/components/ui/field.tsx";
import { Progress, ProgressLabel } from "@/components/ui/progress.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { useContactsStore } from "@/store/inbox.store.ts";
import { WaMessageAssignStatus } from "@/types/enums.ts";
import { INBOX_BULK_CHUNK_SIZE } from "@/utils/constants.ts";

const BulkAssignUser = ({
  contactIds,
  filterData,
  onSuccess,
}: {
  contactIds: string[];
  filterData: string;
  onSuccess?: () => void;
}) => {
  const { user } = useUser();
  const { data: teamMembers, isLoading: membersLoading } = useTeamsMembersOfOrg();
  const { data: teamsRes, isLoading: teamsLoading } = useTeamsByUser();
  const { updateContactById } = useContactsStore();
  const [actionType, setActionType] = useState<"assign" | "self" | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const { t } = useTranslation();

  const teams = teamsRes?.data ?? [];
  const staffMembers = teamMembers?.data ?? [];

  const bulkAssignMutation = useBulkAssignInboxToUser(filterData);

  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedUser, setSelectedUser] = useState("");

  const teamMembersFiltered = useMemo(() => {
    if (!selectedTeam) return [];

    return staffMembers.filter((member) => member.teams.some((t) => t.team_id === selectedTeam));
  }, [selectedTeam, staffMembers]);

  /**
   * Assign in chunks, marking each chunk's rows assigned as it lands. The
   * server assigns one contact at a time, so a large selection in one request
   * could outlive the client's timeout even though the server finishes it —
   * chunking keeps every request short and gives the progress bar real steps.
   *
   * `conversationStatus` is set alongside the contact-level status: the store
   * judges a row by its ticket's status, so without it the badge and the
   * Mine/New tab membership would not change until a reload.
   */
  const runAssign = async (
    action: "assign" | "self",
    assignee: { userId: string; teamId: string; name: string },
  ) => {
    setActionType(action);
    let done = 0;
    setProgress({ done, total: contactIds.length });
    try {
      for (const ids of chunk(contactIds, INBOX_BULK_CHUNK_SIZE)) {
        await bulkAssignMutation.mutateAsync({
          contactIds: ids,
          assignee: { userId: assignee.userId, teamId: assignee.teamId },
        });
        ids.forEach((contactId) => {
          updateContactById(contactId, (contact) => ({
            ...contact,
            waMessageAssignStatus: WaMessageAssignStatus.ASSIGNED,
            conversationStatus: WaMessageAssignStatus.ASSIGNED,
            assignedUsers: [{ id: assignee.userId, name: assignee.name, teamId: assignee.teamId }],
          }));
        });
        done += ids.length;
        setProgress({ done, total: contactIds.length });
      }
      onSuccess?.();
    } catch {
      // The mutation toasts the failure; the dialog stays open to retry.
    } finally {
      setActionType(null);
      setProgress(null);
    }
  };

  const handleAssign = () => {
    if (!selectedTeam || !selectedUser) return;
    const member = staffMembers.find((m) => m.id === selectedUser);
    void runAssign("assign", {
      userId: selectedUser,
      teamId: selectedTeam,
      name: member?.name ?? "",
    });
  };
  const handleAssignToMe = () => {
    void runAssign("self", {
      userId: user?.userId ?? "",
      teamId: user?.teams?.[0] ?? "",
      name: user?.userName ?? "",
    });
  };

  return (
    <div className="space-y-5 w-full">
      {/* TEAM SELECT */}
      <Field>
        <FieldTitle>{t("Select Team")}</FieldTitle>

        {teamsLoading ? (
          <Skeleton className="h-10 w-full rounded-md" />
        ) : (
          <Select
            value={selectedTeam}
            onValueChange={(val) => {
              setSelectedTeam(val ?? "");
              setSelectedUser("");
            }}
            items={teams.map((team) => ({ value: team.id, label: team.name }))}
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
      </Field>
      {/* MEMBER SELECT */}
      <div className="space-y-2">
        <FieldTitle> {t("Select Member")} </FieldTitle>

        {membersLoading ? (
          <Skeleton className="h-10 w-full rounded-md" />
        ) : (
          <Select
            value={selectedUser}
            onValueChange={(value) => setSelectedUser(value ?? "")}
            disabled={!selectedTeam}
            items={teamMembersFiltered.map((staff) => ({
              value: staff.id,
              label: staff.name,
            }))}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder={t("Select team member")} />
            </SelectTrigger>

            <SelectContent>
              {teamMembersFiltered.map((staff) => (
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
      {progress && (
        <Progress
          value={progress.total ? (progress.done / progress.total) * 100 : 0}
          className="gap-x-3 gap-y-1.5"
        >
          <ProgressLabel className="text-xs">{t("Assigning chats")}…</ProgressLabel>
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            {progress.done} / {progress.total}
          </span>
        </Progress>
      )}
      {/* ASSIGN BUTTON */}
      <div className="flex flex-col gap-3 w-full">
        {/* PRIMARY ACTION */}
        <Button
          onClick={handleAssign}
          disabled={!selectedTeam || !selectedUser || actionType !== null}
          className="w-full h-10 flex items-center justify-center gap-2"
        >
          {actionType === "assign" && <IconLoader2 className="w-4 h-4 animate-spin" />}
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
          disabled={actionType !== null}
          variant="outline"
          className="w-full h-10 flex items-center justify-center gap-2"
        >
          {actionType === "self" && <IconLoader2 className="w-4 h-4 animate-spin" />}
          {t("Assign To Me")}
        </Button>
      </div>
    </div>
  );
};

export default BulkAssignUser;
