import { Toast } from "@/components/common/Notice";
import { usePermissions } from "@/hooks/usePermissions";
import { useLoggedInUser } from "@/api/api";
import { useAssignOwner, useGetAssignedUserForContact } from "@/api/inbox/messages/message.query";
import { useTeamsMembersOfOrg } from "@/api/teams/teams.query";
import { useState } from "react";
import { Pressable, Text, useColorScheme } from "react-native";
import { TeamMembersData } from "@/context/type";
import { generateInternalMessageId } from "@/utils/chatbox_utils";
import { UserCheck } from "lucide-react-native";
import { useChatAssignStatusStore } from "@/utils/store";
import { useContactsStore } from "@/store/inboxStore";
import { Colors } from "@/constants/colors";
import AssigneeSheet, { type AssigneePick } from "./AssigneeSheet";

/**
 * One owner per chat: tap a person and it is done. People are listed once however
 * many teams they are in; a team row hands the chat to one member in turn. Mirrors
 * `AssigneePicker` in rateup-ui.
 */
export default function AssignToUser({
  contactId,
  color,
  iconSize = 16,
  fontSize = 14,
  iconOnly = false,
  iconColor,
  plain = false,
}: {
  contactId: string;
  iconSize?: number;
  color?: boolean;
  fontSize?: number;
  iconOnly?: boolean;
  iconColor?: string;
  /** Borderless row, for use inside menus whose other items are plain rows. */
  plain?: boolean;
}) {
  const { can } = usePermissions();
  const [visible, setVisible] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  // Inline, not a toast: a toast cannot render above this sheet's native Modal.
  const [error, setError] = useState<string | null>(null);
  const assign = useAssignOwner();
  const setWaAssignStatus = useChatAssignStatusStore((state) => state.setWaAssignStatus);
  const { data: me } = useLoggedInUser();
  const { data: teamMembers } = useTeamsMembersOfOrg();
  const { data: assignedUsers } = useGetAssignedUserForContact(contactId);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const buttonBgColor = color ? Colors.brand.blue : isDark ? Colors.dark.surface : "white";
  const textColor = color ? "white" : isDark ? Colors.dark.textPrimary : Colors.light.textPrimary;

  const ownerId: string | undefined = assignedUsers?.[0]?.assignedUserId;
  const hasAssignees = (assignedUsers?.length ?? 0) > 0;

  const nameOf = (userId: string) =>
    (teamMembers?.data as TeamMembersData[] | undefined)?.find((m) => m.id === userId)?.name ?? "";

  function choose(pick: AssigneePick) {
    if (assign.isPending) return;
    let userId: string | null = null;
    let teamId: string | null = null;
    if (pick.kind === "me") userId = me?.userId ?? null;
    if (pick.kind === "person") userId = pick.member.id;
    if (pick.kind === "team") teamId = pick.teamId;
    if (userId && userId === ownerId && assignedUsers?.length === 1) {
      setVisible(false);
      return;
    }

    setError(null);
    setPendingKey(pick.key);
    assign.mutate(
      { contactId, userId, teamId, messageId: generateInternalMessageId() },
      {
        onSuccess: (result) => {
          const owners = (result?.assignees ?? []).map((a) => ({
            id: a.userId,
            teamId: a.teamId,
            name: nameOf(a.userId),
          }));
          setWaAssignStatus(owners.length ? "ASSIGNED" : "UNASSIGNED");
          // The inbox list renders from the contacts store, not react-query.
          useContactsStore.getState().updateContactById(contactId, (c: any) => ({
            ...c,
            waMessageAssignStatus: owners.length ? "ASSIGNED" : "UNASSIGNED",
            assignedUsers: owners,
          }));
          setVisible(false);
          Toast.show({
            type: "success",
            text1: owners.length ? `Assigned to ${owners[0].name}` : "Unassigned",
          });
        },
        onError: (err: any) => {
          setError(err?.response?.data?.message ?? err?.message ?? "Please try again.");
        },
        onSettled: () => setPendingKey(null),
      },
    );
  }

  // Hooks above run unconditionally; only the render is gated.
  if (!can("inbox.assign")) return null;

  return (
    <>
      {iconOnly ? (
        <Pressable onPress={() => setVisible(true)} style={{ padding: 4 }}>
          <UserCheck color={iconColor || textColor} size={iconSize} />
        </Pressable>
      ) : (
        <Pressable
          onPress={() => setVisible(true)}
          style={
            plain
              ? {
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  padding: 12,
                  width: "100%",
                }
              : {
                  backgroundColor: buttonBgColor,
                  borderColor: isDark ? Colors.dark.borderLight : Colors.light.border,
                  borderWidth: color ? 0 : 1,
                  borderRadius: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                }
          }
        >
          <UserCheck color={textColor} size={iconSize} />
          <Text
            style={{
              color: textColor,
              fontSize: fontSize,
              fontFamily: "InstrumentSans_600SemiBold",
            }}
          >
            Assign
          </Text>
        </Pressable>
      )}

      <AssigneeSheet
        visible={visible}
        onClose={() => {
          setVisible(false);
          setError(null);
        }}
        title="Assign chat"
        ownerId={ownerId}
        canUnassign={hasAssignees}
        onChoose={choose}
        pendingKey={pendingKey}
        error={error}
      />
    </>
  );
}
