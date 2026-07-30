import { useQueryClient } from "@tanstack/react-query";
import { isEqual } from "lodash";
import {
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleDashed,
  UserRoundCheck,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useTeamsMembersOfOrg } from "@/backend/org/org.query";
import { useTeamsByUser } from "@/backend/team/team.query";
import { getRowKey } from "@/backend/whatsapp/inbox/message/wamessage.api";
import {
  useAssignInboxToUer,
  useGetAssignedUserForContact,
} from "@/backend/whatsapp/inbox/message/wamessage.query";
import useContactStore, {
  useContactsStore,
  useMessagesStore,
} from "@/components/dashboard/inbox/store.ts";
import { Button } from "@/components/ui/button.tsx";
import { CreativeAvatar } from "@/components/ui/creative-avatar.tsx";
import CustomTooltip from "@/components/ui/custom/CustomTooltip.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Loader } from "@/components/ui/loader.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { WaMessageAssignStatus } from "@/types/enums.ts";

import { generateInternalMessageId } from "../../util.tsx";
import type { OptimisticMessage } from "../chatdisplayFooter/index.tsx";

/** An assignment row, as either the API or the local selection shape. */
interface AssignedUserRow {
  id?: string;
  userId?: string;
  name?: string;
  teamId?: string;
  contactId?: string;
  assignedUserId?: string;
  assignedUser?: { id?: string; name?: string };
}

const AssignUser = ({
  contactId,
  variant = "ghost",
}: {
  contactId: string;
  variant?: "ghost" | "link" | "default" | "destructive" | "outline" | "secondary";
}) => {
  const { data: teamMembers, isLoading } = useTeamsMembersOfOrg();
  const { data: teamRes, isPending: teamsLoading } = useTeamsByUser();
  const queryClient = useQueryClient();
  const { filterData } = useContactStore();
  const { t: translations } = useTranslation();
  const prevAssignedRef = useRef<{ userId: string; teamId: string }[]>([]);
  const { user } = useUser();
  const { data: assignedUsers, isLoading: isAssignedLoading } =
    useGetAssignedUserForContact(contactId);
  const assignMut = useAssignInboxToUer(contactId, filterData);
  const messagesStore = useMessagesStore();
  const [assignedStaff, setAssignedStaff] = useState<
    { userId: string; teamId: string; contactId: string }[]
  >([]);
  const [debouncedAssignedStaff, setDebouncedAssignedStaff] = useState<any[]>([]);
  const { updateContactById, selectedContact } = useContactsStore();
  const isDefault = variant === "default";
  // Land the optimistic assign note in the open ticket's message bucket. AssignUser
  // only receives contactId, so derive the conversation row key from the open row.
  const rowKey = selectedContact?.id === contactId ? getRowKey(selectedContact) : contactId;

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedAssignedStaff(assignedStaff);
    }, 500);

    return () => clearTimeout(handler);
  }, [assignedStaff, contactId]);

  useEffect(() => {
    if (!assignedUsers) {
      setAssignedStaff([]);
      return;
    }
    const assignees = assignedUsers
      ? assignedUsers?.map((a: AssignedUserRow) => ({
          userId: a.assignedUserId,
          teamId: a.teamId,
          contactId: a.contactId,
          name: a.assignedUser.name,
        }))
      : [];
    setAssignedStaff(assignees);
    prevAssignedRef.current = assignees.map((a: AssignedUserRow) => ({
      userId: a.userId,
      teamId: a.teamId,
    }));
  }, [assignedUsers, contactId]);

  useEffect(() => {
    if (!debouncedAssignedStaff.length || debouncedAssignedStaff[0].contactId !== contactId) return;
    const assignees = debouncedAssignedStaff.map((a) => ({
      userId: a.userId,
      teamId: a.teamId,
    }));
    if (
      assignees.length &&
      !isEqual(
        assignees,
        assignedUsers?.map((a: AssignedUserRow) => ({
          userId: a.assignedUserId,
          teamId: a.teamId,
        })),
      )
    ) {
      const prevAssigned = prevAssignedRef.current;
      const nextAssigned = debouncedAssignedStaff.map((a) => ({
        userId: a.userId,
        teamId: a.teamId,
      }));

      const newlyAssigned = nextAssigned.filter(
        (next) =>
          !prevAssigned.some((prev) => prev.userId === next.userId && prev.teamId === next.teamId),
      );
      const unassigned = prevAssigned.filter(
        (prev) =>
          !nextAssigned.some((next) => next.userId === prev.userId && next.teamId === prev.teamId),
      );

      if (!newlyAssigned.length && !unassigned.length) {
        return;
      }

      let assignStatus: WaMessageAssignStatus | "REASSIGNED";

      if (newlyAssigned.length && unassigned.length) {
        assignStatus = "REASSIGNED";
      } else if (newlyAssigned.length) {
        assignStatus = WaMessageAssignStatus.ASSIGNED;
      } else if (unassigned.length) {
        assignStatus = WaMessageAssignStatus.UNASSIGNED;
      } else {
        return;
      }

      const assignedNames = newlyAssigned
        .map((a) => staffMembers.find((s) => s.id === a.userId)?.name)
        .filter(Boolean)
        .join(", ");

      const unassignedNames = unassigned
        .map((a) => staffMembers.find((s) => s.id === a.userId)?.name)
        .filter(Boolean)
        .join(", ");

      let message = "";

      if (assignStatus === "REASSIGNED") {
        message = `Chat reassigned${
          unassignedNames ? ` from ${unassignedNames}` : ""
        }${assignedNames ? ` to ${assignedNames}` : ""}`;
      } else if (assignStatus === WaMessageAssignStatus.ASSIGNED) {
        message = `Chat assigned to ${assignedNames}`;
      } else if (assignStatus === WaMessageAssignStatus.UNASSIGNED) {
        message = `Chat revoked from ${unassignedNames}`;
      }

      const id = generateInternalMessageId();
      const newMessage: OptimisticMessage = {
        id: id,
        contactId: contactId,
        waCreatedAt: new Date().toISOString(),
        messageBody: {
          send: null,
          receive: null,
          internal: {
            text: {
              body: message,
            },
            assignedUsers: [],
            assignStatus: assignStatus,
            triggeredByUser: {
              id: user.userId,
              name: user.userName,
            },
          },
          exchangeProcess: "internal",
        },
        sourcePlatform: "INTERNAL",
        sourceIdentifier: null,
        sendBy: user.userId,
        sender: {
          name: user.userName,
          profilePhoto: user?.profilePhoto,
        },
        stats: {
          read: "",
          sent: "",
          failed: "",
          delivered: "",
        },
        messageId: id,
      };
      prevAssignedRef.current = assignees;
      assignMut.mutate(
        { contactId, assignees, messageId: id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["teamsDataUserQuery"] });
            messagesStore.addMessage(`${rowKey}_all`, newMessage as any);
            messagesStore.addMessage(`${rowKey}_internal`, newMessage as any);
            updateContactById(contactId, (contact) => ({
              ...contact,
              waMessageAssignStatus: WaMessageAssignStatus.ASSIGNED,
              assignedUsers: assignees.map((a) => {
                const user = staffMembers?.find((m) => m.id === a.userId);
                return { id: user?.id, name: user?.name, teamId: a?.teamId };
              }),
            }));
          },
          onError: async (_error) => {
            setAssignedStaff(
              prevAssignedRef.current.map((a) => ({
                userId: a.userId,
                teamId: a.teamId,
                contactId,
              })),
            );

            await queryClient.refetchQueries({
              queryKey: ["assignedInboxUser", contactId],
              exact: true,
            });

            await queryClient.refetchQueries({
              queryKey: ["teamsDataUserQuery"],
            });
          },
        },
      );
    }
  }, [debouncedAssignedStaff, contactId]);

  const staffMembers = teamMembers?.data ?? [];
  const teams = teamRes?.data ?? [];
  const [openTeams, setOpenTeams] = useState<string[]>([]);

  const toggleTeamOpen = (teamId: string) => {
    setOpenTeams((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId],
    );
  };

  const updateStaffAssignment = (staff: any, teamId: string) => {
    const existing = assignedStaff.find((s) => s.userId === staff.id);

    if (existing && existing.teamId === teamId) {
      setAssignedStaff(assignedStaff.filter((s) => s.userId !== staff.id));
    } else {
      const filtered = assignedStaff.filter((s) => s.userId !== staff.id);
      setAssignedStaff([...filtered, { userId: staff.id, teamId, contactId }]);
    }
  };

  const handleSelectTeam = (team: any) => {
    const teamStaff = staffMembers.filter((m) => m.teams.some((t) => t.team_id === team.id));
    const allSelected = teamStaff.every((m) =>
      assignedStaff.some((a) => a.userId === m.id && a.teamId === team.id),
    );

    if (allSelected) {
      setAssignedStaff(assignedStaff.filter((s) => s.teamId !== team.id));
    } else {
      const updated = [...assignedStaff];
      for (const member of teamStaff) {
        const index = updated.findIndex((s) => s.userId === member.id);
        if (index !== -1) {
          updated[index] = { ...updated[index], teamId: team.id };
        } else {
          updated.push({ userId: member.id, teamId: team.id, contactId });
        }
      }
      setAssignedStaff(updated);
    }
  };

  const isSelectedForTeam = (staffId: string, teamId: string) => {
    const s = assignedStaff.find((a) => a.userId === staffId);
    return s ? s.teamId === teamId : false;
  };

  if (teamsLoading || isAssignedLoading || isLoading) return <Loader />;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        render={<Button variant={variant} size="sm" className="h-8 px-2 gap-1.5" />}
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center gap-1">
            <div className="flex -space-x-1 relative">
              {assignedStaff.slice(0, 3).map((a) => {
                const staff = staffMembers.find((s) => s.id === a.userId);
                return (
                  <div key={a.userId} className="relative">
                    <CreativeAvatar
                      name={staff?.name}
                      showOnlineStatus
                      isOnline={staff?.status === "online"}
                      size="xs"
                    />
                  </div>
                );
              })}
              {assignedStaff.length > 3 && (
                <div className="w-5 h-5 rounded-full bg-muted text-[10px] flex items-center justify-center border border-white">
                  +{assignedStaff.length - 3}
                </div>
              )}
            </div>
            <div className="flex items-center justify-center">
              {assignedStaff.slice(0, 1).map((a) => {
                const staff = staffMembers.find((s) => s.id === a.userId);
                return (
                  <div key={a.userId} className="relative">
                    <p className="text-sm font-semibold">
                      {(staff?.name?.length ?? 0) > 10 ? staff?.name?.slice(0, 10) : staff?.name}
                    </p>
                  </div>
                );
              })}
              {assignedStaff.length > 1 && <p className="text-sm font-semibold">...</p>}
            </div>
          </div>

          <CustomTooltip
            trigger={
              !assignedStaff.length ? (
                <div className="flex items-center gap-1">
                  <UserRoundCheck className={`w-4 h-4 ${isDefault ? "" : "text-primary"}`} />
                  <span className={`${isDefault ? "" : "text-primary"} pr-2`}>Assign</span>
                </div>
              ) : (
                <ChevronDown className={`w-3 h-3 ${isDefault ? "" : "text-muted-foreground"}`} />
              )
            }
            side="bottom"
            content={
              <span className="text-xs max-w-[90px] truncate">
                {assignedStaff.length
                  ? `Assigned ${assignedStaff.length} staff`
                  : "Assign staff / team"}
              </span>
            }
          />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 max-h-80 overflow-y-auto">
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          Assign to team or individual
        </div>
        <DropdownMenuSeparator />

        {teams?.map((team) => {
          const teamStaff = staffMembers.filter((s) => s.teams.some((t) => t.team_id === team.id));
          const allSelected = teamStaff.every((s) => isSelectedForTeam(s.id, team.id));
          const hasOtherTeamsSelected = assignedStaff.some((a) => a.teamId !== team.id);
          const partiallySelected =
            !allSelected &&
            teamStaff.some((s) =>
              assignedStaff.some((a) => a.userId === s.id && a.teamId === team.id),
            );
          return (
            <div key={team.id}>
              <DropdownMenuItem
                closeOnClick={false}
                onSelect={(e) => e.preventDefault()}
                onClick={() => toggleTeamOpen(team.id)}
                className="gap-2 items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <div className="text-sm">{team.name}</div>
                </div>
                <div className="flex items-center gap-1">
                  {partiallySelected && !allSelected && (
                    <CircleDashed className="w-4 h-4 text-green-600" />
                  )}
                  {allSelected && <Check className="w-4 h-4 text-green-600" />}
                  {openTeams.includes(team.id) ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                </div>
              </DropdownMenuItem>
              {openTeams.includes(team.id) && (
                <div className="ml-5 mt-1 mb-1 border-l pl-2 space-y-1">
                  <DropdownMenuItem
                    closeOnClick={false}
                    onSelect={(e) => e.preventDefault()}
                    onClick={() => handleSelectTeam(team)}
                    className="text-xs text-muted-foreground cursor-pointer"
                    disabled={allSelected && !hasOtherTeamsSelected}
                  >
                    {allSelected ? "Unassign entire team" : "Assign entire team"}
                  </DropdownMenuItem>

                  {teamStaff?.map((staff) => {
                    const isSelected = isSelectedForTeam(staff.id, team.id);
                    const globalAssigned = assignedStaff.find((a) => a.userId === staff.id);

                    const isAssignedToOtherTeam =
                      globalAssigned && globalAssigned.teamId !== team.id;
                    const assignedTeamName = isAssignedToOtherTeam
                      ? teams.find((t) => t.id === globalAssigned.teamId)?.name
                      : null;

                    return (
                      <DropdownMenuItem
                        closeOnClick={false}
                        onSelect={(e) => e.preventDefault()}
                        key={staff.id}
                        onClick={() => updateStaffAssignment(staff, team.id)}
                        className={`gap-2 group ${isSelected ? "bg-muted/50" : ""} cursor-pointer`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2 flex-1">
                            <CreativeAvatar
                              name={staff?.name}
                              key={staff?.id}
                              showOnlineStatus={true}
                              isOnline={staff?.status === "online"}
                              size="xs"
                            />
                            <div>
                              <div className="text-sm">
                                {staff.name}
                                {staff.id === user.userId && (
                                  <span className="ml-1">( {translations("You")} )</span>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                {staff.status === "online" ? "Online" : "Offline"}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {assignedTeamName && (
                              <CustomTooltip
                                trigger={
                                  <div
                                    className={
                                      "px-2 py-0.5 text-[11px] rounded-sm font-medium bg-muted text-muted-foreground"
                                    }
                                  >
                                    {assignedTeamName}
                                  </div>
                                }
                                content={
                                  <div className="text-xs">
                                    Assigned under <b>{assignedTeamName}</b>
                                  </div>
                                }
                                side="right"
                              />
                            )}
                            {isSelected && <Check className="w-4 h-4 text-green-600" />}
                          </div>
                        </div>
                      </DropdownMenuItem>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AssignUser;
