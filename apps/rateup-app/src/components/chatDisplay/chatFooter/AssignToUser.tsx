import { Toast } from "toastify-react-native";
import {
  useAssignInboxToUser,
  useGetAssignedUserForContact,
} from "@/api/inbox/messages/message.query";
import { useTeamsByUser, useTeamsMembersOfOrg } from "@/api/teams/teams.query";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  InteractionManager,
  Modal,
  ScrollView,
  useColorScheme,
  Pressable, // Import ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TeamMembersData } from "@/context/type";
import { generateInternalMessageId, namePreview } from "@/utils/chatbox_utils";
import { Check, UserCheck, Users } from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useChatAssignStatusStore } from "@/utils/store";
import { useContactsStore } from "@/store/inboxStore";
import { Colors } from "@/constants/colors";

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
  const [visible, setVisible] = useState(false);
  const assignMut = useAssignInboxToUser(contactId);
  const setWaAssignStatus = useChatAssignStatusStore((state) => state.setWaAssignStatus);
  const { data: teamRes, isPending: teamsLoading } = useTeamsByUser();
  const { data: teamMembers } = useTeamsMembersOfOrg();
  const { data: assignedUsers, isLoading: isAssignedLoading } =
    useGetAssignedUserForContact(contactId);
  const queryClient = useQueryClient();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const buttonBgColor = color ? Colors.brand.blue : isDark ? Colors.dark.surface : "white";
  const textColor = color ? "white" : isDark ? Colors.dark.textPrimary : Colors.light.textPrimary;

  const membersByTeam = useMemo(() => {
    if (!teamMembers?.data) return {};

    const map: Record<string, TeamMembersData[]> = {};

    for (const member of teamMembers.data) {
      for (const team of member.teams) {
        if (!map[team.team_id]) {
          map[team.team_id] = [];
        }
        map[team.team_id].push(member);
      }
    }

    return map;
  }, [teamMembers]);

  const initialAssignees = useMemo(() => {
    if (!assignedUsers) return [];
    return assignedUsers.map((a: any) => ({
      userId: a.assignedUserId,
      teamId: a.teamId,
    }));
  }, [assignedUsers]);

  const [assignedStaff, setAssignedStaff] = useState<Assignee[]>(initialAssignees);

  // Building the team/member tree is the expensive part, and RN's Modal mounts
  // its children only once `visible` flips — so doing it in the same frame as
  // the tap stalls the slide animation. Render the sheet chrome immediately and
  // the list once the animation has settled.
  const [contentReady, setContentReady] = useState(false);

  // Read through a ref so a late-resolving query can't clobber a selection the
  // user is part-way through making.
  const initialAssigneesRef = useRef(initialAssignees);
  initialAssigneesRef.current = initialAssignees;

  useEffect(() => {
    if (!visible) {
      setContentReady(false);
      return;
    }
    // Re-seed from the server each time it opens. `useState(initialAssignees)`
    // only ever saw the first render's value — before the query resolved — so
    // the sheet opened with nothing selected and assigning wiped the existing
    // assignees.
    setAssignedStaff(initialAssigneesRef.current);
    const task = InteractionManager.runAfterInteractions(() => setContentReady(true));
    return () => task.cancel();
  }, [visible]);

  const toggleMember = useCallback((userId: string, teamId: string) => {
    setAssignedStaff((prev) => {
      const exists = prev.find((a) => a.userId === userId);
      if (exists && exists.teamId === teamId) {
        return prev.filter((a) => a.userId !== userId);
      }
      return [...prev.filter((a) => a.userId !== userId), { userId, teamId }];
    });
  }, []);

  const handleAssign = async () => {
    const id = generateInternalMessageId();
    assignMut.mutate(
      {
        contactId: contactId,
        assignees: assignedStaff,
        messageId: id,
      },
      {
        onSuccess: () => {
          // Closed here rather than on tap, so the sheet stays up showing its
          // spinner while the request is in flight.
          setVisible(false);
          setWaAssignStatus("ASSIGNED");
          Toast.show({
            type: "success",
            text1: "Assigned Successfully",
          });

          // Same as "Assign to me": the list reads from the contacts store, so
          // it has to be told directly.
          useContactsStore.getState().updateContactById(contactId, (c: any) => ({
            ...c,
            waMessageAssignStatus: "ASSIGNED",
            assignedUsers: assignedStaff.map((a: any) => ({
              id: a.userId,
              teamId: a.teamId,
              name: a.name ?? "",
            })),
          }));

          queryClient.invalidateQueries({
            queryKey: ["assigned-contact", contactId],
          });
          queryClient.invalidateQueries({
            queryKey: ["wa-messages", contactId],
          });
          queryClient.invalidateQueries({ queryKey: ["contactCounts"] });
          queryClient.invalidateQueries({
            queryKey: ["assignedInboxUser", contactId],
          });
          queryClient.invalidateQueries({ queryKey: ["contacts", "filtered"] });
        },
        onError: (error: any) => {
          Toast.show({
            type: "error",
            text1: "Could not assign",
            text2: error?.response?.data?.message ?? error?.message ?? "Please try again.",
          });
        },
      },
    );
  };

  return (
    <>
      {iconOnly ? (
        <TouchableOpacity onPress={() => setVisible(true)} style={{ padding: 4 }}>
          <UserCheck color={iconColor || textColor} size={iconSize} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
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
              fontFamily: "Nunito_600SemiBold",
            }}
          >
            Assign
          </Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        // Lets the slide run on the Android render thread instead of the JS one.
        hardwareAccelerated
        statusBarTranslucent
        onRequestClose={() => setVisible(false)}
      >
        <Pressable className="flex-1" onPress={() => setVisible(false)}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} />
        </Pressable>

        <SafeAreaView
          style={{
            backgroundColor: isDark ? Colors.dark.surface : "#fff",
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 24,
            maxHeight: "70%",
            borderWidth: 1,
            borderColor: isDark ? Colors.dark.borderLight : Colors.light.border,
          }}
        >
          <View
            style={{
              width: 48,
              height: 6,
              backgroundColor: isDark ? "rgba(255,255,255,0.2)" : "#d1d5db",
              borderRadius: 999,
              alignSelf: "center",
              marginBottom: 16,
            }}
          />

          <Text
            style={{
              fontFamily: "Nunito_700Bold",
              fontSize: 18,
              color: isDark ? "#fff" : Colors.light.textPrimary,
              marginBottom: 16,
            }}
          >
            Assign chat
          </Text>

          {!contentReady ? (
            // Reserves the sheet's height so it doesn't resize a frame later.
            <View
              style={{
                minHeight: 220,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ActivityIndicator size="small" color={Colors.brand.blue} />
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 16 }}
              style={{ minHeight: 220 }}
            >
              {teamRes?.data?.map((team: any) => {
                const teamStaff = membersByTeam[team.id] ?? [];
                if (teamsLoading || isAssignedLoading) {
                  return (
                    <View
                      key={team.id}
                      style={{
                        flex: 1,
                        justifyContent: "center",
                        alignItems: "center",
                        paddingVertical: 20,
                      }}
                    >
                      <ActivityIndicator size="small" color={Colors.brand.blue} />
                    </View>
                  );
                }
                return (
                  <View key={team.id} style={{ marginBottom: 16 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 8,
                      }}
                    >
                      <Users
                        size={14}
                        color={isDark ? Colors.dark.textSubtle : Colors.light.textSubtle}
                      />
                      <Text
                        style={{
                          fontFamily: "Nunito_700Bold",
                          fontSize: 14,
                          color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary,
                        }}
                      >
                        {team.name}
                      </Text>
                    </View>

                    {teamStaff.map((member) => (
                      <MemberRow
                        key={member.id}
                        member={member}
                        teamId={team.id}
                        isDark={isDark}
                        isSelected={assignedStaff.some(
                          (a) => a.userId === member.id && a.teamId === team.id,
                        )}
                        onToggle={toggleMember}
                      />
                    ))}
                  </View>
                );
              })}
            </ScrollView>
          )}

          <TouchableOpacity
            onPress={handleAssign}
            disabled={assignMut.isPending}
            style={{
              marginTop: 16,
              backgroundColor: Colors.brand.blue,
              paddingVertical: 12,
              borderRadius: 12,
              minHeight: 45,
              alignItems: "center",
              justifyContent: "center",
              opacity: assignMut.isPending ? 0.7 : 1,
              shadowColor: Colors.brand.blue,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isDark ? 0.4 : 0.2,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            {assignMut.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text
                style={{
                  color: "#fff",
                  textAlign: "center",
                  fontFamily: "Nunito_700Bold",
                  fontSize: 15,
                }}
              >
                Assign
              </Text>
            )}
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </>
  );
}

type Assignee = {
  userId: string;
  teamId: string;
};

/**
 * Memoised so toggling one teammate re-renders that row instead of every row in
 * every team — the whole tree used to re-render on each tap.
 */
const MemberRow = memo(function MemberRow({
  member,
  teamId,
  isDark,
  isSelected,
  onToggle,
}: Readonly<{
  member: any;
  teamId: string;
  isDark: boolean;
  isSelected: boolean;
  onToggle: (userId: string, teamId: string) => void;
}>) {
  return (
    <Pressable
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 8,
      }}
      onPress={() => onToggle(member.id, teamId)}
    >
      <View style={{ marginLeft: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: Colors.brand.blue,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: 12,
                fontFamily: "Nunito_700Bold",
              }}
            >
              {namePreview(member?.name)}
            </Text>
          </View>
          <View>
            <Text
              style={{
                fontFamily: "Nunito_600SemiBold",
                fontSize: 14,
                color: isDark ? "#fff" : Colors.light.textPrimary,
              }}
            >
              {member.name}
            </Text>
            <Text
              style={{
                fontFamily: "Nunito_400Regular",
                fontSize: 11,
                color: isDark ? Colors.dark.textMuted : Colors.light.textMuted,
              }}
            >
              {member.status === "online" ? "Online" : "Offline"}
            </Text>
          </View>
        </View>
      </View>

      {isSelected && <Check size={16} color={isDark ? Colors.accent.cyan : Colors.brand.blue} />}
    </Pressable>
  );
});
