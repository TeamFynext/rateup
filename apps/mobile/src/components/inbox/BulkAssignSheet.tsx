import { useLoggedInUser } from "@/api/api";
import { bulkAssign } from "@/api/inbox/messages/message.api";
import { useTeamsByUser, useTeamsMembersOfOrg } from "@/api/teams/teams.query";
import AssigneeSheet, {
  type AssigneePick,
} from "@/components/chatDisplay/chatFooter/AssigneeSheet";
import { Toast } from "@/components/common/Notice";
import { getInboxRowTheme } from "@/constants/inboxDesign";
import { TeamMembersData } from "@/context/type";
import { useContactsStore } from "@/store/inboxStore";
import { useQueryClient } from "@tanstack/react-query";
import { chunk } from "lodash";
import { useState } from "react";
import { Text, useColorScheme, View } from "react-native";

/** Same size as the web's `INBOX_BULK_CHUNK_SIZE`: short requests, real progress steps. */
const CHUNK_SIZE = 25;

export default function BulkAssignSheet({
  visible,
  onClose,
  contactIds,
  onDone,
}: Readonly<{
  visible: boolean;
  onClose: () => void;
  contactIds: string[];
  onDone: () => void;
}>) {
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const { data: me } = useLoggedInUser();
  const { data: teamRes } = useTeamsByUser();
  const { data: teamMembers } = useTeamsMembersOfOrg();
  const queryClient = useQueryClient();
  const isDark = useColorScheme() === "dark";
  const t = getInboxRowTheme(isDark);

  const members = (teamMembers?.data ?? []) as TeamMembersData[];
  const visibleTeamIds = new Set<string>(
    (teamRes?.data ?? []).map((team: { id: string }) => team.id),
  );
  /** The bulk endpoint takes a team per assignee; one of theirs that this user can see. */
  const teamOf = (member?: TeamMembersData) =>
    member?.teams.find((team) => visibleTeamIds.has(team.team_id))?.team_id ?? me?.teams?.[0] ?? "";
  const nameOf = (userId: string) => members.find((m) => m.id === userId)?.name ?? "";

  async function choose(pick: AssigneePick) {
    if (progress || pick.kind === "unassign") return;
    let target: { assignee: { userId: string; teamId: string } } | { teamId: string };
    if (pick.kind === "team") {
      target = { teamId: pick.teamId };
    } else {
      const userId = pick.kind === "person" ? pick.member.id : (me?.userId ?? "");
      target = { assignee: { userId, teamId: teamOf(members.find((m) => m.id === userId)) } };
    }

    setError(null);
    setPendingKey(pick.key);
    let done = 0;
    let assigned = 0;
    setProgress({ done, total: contactIds.length });
    try {
      for (const ids of chunk(contactIds, CHUNK_SIZE)) {
        const { results } = await bulkAssign({ contactIds: ids, ...target });
        for (const { contactId, success, result } of results ?? []) {
          // A team hands each chat to a different member, so the owner comes from the result.
          const owner = result?.assignees?.[0];
          if (!success || !owner) continue;
          assigned += 1;
          useContactsStore.getState().updateContactById(contactId, (c: any) => ({
            ...c,
            waMessageAssignStatus: "ASSIGNED",
            conversationStatus: "ASSIGNED",
            assignedUsers: [{ id: owner.userId, teamId: owner.teamId, name: nameOf(owner.userId) }],
          }));
        }
        done += ids.length;
        setProgress({ done, total: contactIds.length });
      }
      queryClient.invalidateQueries({ queryKey: ["assignedInboxUser"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contactCounts"] });
      Toast.show({
        type: assigned === contactIds.length ? "success" : "info",
        text1:
          assigned === contactIds.length
            ? `Assigned ${assigned} chat${assigned === 1 ? "" : "s"}`
            : `Assigned ${assigned} of ${contactIds.length} chats`,
      });
      onDone();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? "Please try again.");
    } finally {
      setPendingKey(null);
      setProgress(null);
    }
  }

  return (
    <AssigneeSheet
      visible={visible}
      onClose={() => {
        if (progress) return;
        setError(null);
        onClose();
      }}
      title={`Assign ${contactIds.length} chat${contactIds.length === 1 ? "" : "s"}`}
      canUnassign={false}
      onChoose={choose}
      pendingKey={pendingKey}
      error={error}
      busy={
        progress ? (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: t.fg2, fontFamily: "InstrumentSans_600SemiBold" }}>
                Assigning chats…
              </Text>
              <Text style={{ color: t.fg3, fontFamily: "InstrumentSans_400Regular" }}>
                {progress.done} / {progress.total}
              </Text>
            </View>
            <View
              style={{
                height: 6,
                borderRadius: 3,
                backgroundColor: t.surface2,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  height: 6,
                  width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
                  backgroundColor: t.brand,
                }}
              />
            </View>
          </View>
        ) : undefined
      }
    />
  );
}
