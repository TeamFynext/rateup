import { Toast } from "toastify-react-native";
import {
  useAssignInboxToUser,
  useGetAssignedUserForContact,
} from "@/api/inbox/messages/message.query";
import {
  useTeamsByUser,
  useTeamsMembersOfOrg,
} from "@/api/teams/teams.query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  useColorScheme,
  Pressable, // Import ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import lodash from "lodash";
import { TeamMembersData } from "@/context/type";
import {
  generateInternalMessageId,
  namePreview,
} from "@/utils/chatbox_utils";
import { Check, UserCheck, Users } from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";
import { colors } from "@/constants/constants";
import { useChatAssignStatusStore } from "@/utils/store";

export default function AssignToUser({
  contactId,
  color,
  iconSize = 16,
  fontSize = 14,
}: {
  contactId: string;
  iconSize?: number;
  color?: boolean;
  fontSize?: number;
}) {
  const [visible, setVisible] = useState(false);
  const assignMut = useAssignInboxToUser(contactId);
  const setWaAssignStatus = useChatAssignStatusStore(
    (state) => state.setWaAssignStatus
  );
  const { data: teamRes, isPending: teamsLoading } = useTeamsByUser();
  const { data: teamMembers, isLoading } = useTeamsMembersOfOrg();
  const { data: assignedUsers, isLoading: isAssignedLoading } =
    useGetAssignedUserForContact(contactId);
  const queryClient = useQueryClient();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const buttonBgColor = color
    ? colors["primary-blue"]
    : isDark
    ? colors["gray-900"]
    : "white";
  const textColor = color ? "white" : isDark ? "white" : "black";

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

  const { assignedStaff, setAssignedStaff } = useAssignees(initialAssignees);

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
          setWaAssignStatus("ASSIGNED")
          Toast.show({
            type: "success",
            text1: "Assigned Successfully"
          });

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
        },
      }
    );
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setVisible(true)}
        style={{
          backgroundColor: buttonBgColor,
        }}
        className="py-1 px-4 rounded-xl flex-row items-center justify-center gap-1"
      >
        <UserCheck color={textColor} size={iconSize} />
        <Text
          style={{ color: textColor, fontSize: fontSize }}
          className={`font-semibold`}
        >
          Assign
        </Text>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable className="flex-1" onPress={() => setVisible(false)}>
          <View className="flex-1 bg-black/40" />
        </Pressable>

        <SafeAreaView className="bg-white dark:bg-slate-900 rounded-t-2xl px-4 pt-4 pb-6 max-h-[70%]">
          <View className="w-12 h-1.5 bg-gray-300 rounded-full self-center mb-4" />

          <Text className="text-lg font-semibold mb-4 dark:text-white">
            Assign chat
          </Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 16 }}
          >
            {teamRes?.data?.map((team: any) => {
              const teamStaff = membersByTeam[team.id] ?? [];
              if (teamsLoading || isAssignedLoading) {
                return (
                  <SafeAreaView className="flex-1 justify-center items-center">
                    <ActivityIndicator />
                  </SafeAreaView>
                );
              }
              return (
                <View key={team.id} className="mb-4">
                  <View className="flex-row items-center gap-1 mb-2">
                    <Users size={14} color={isDark ? "white" : "black"} />
                    <Text className="font-medium dark:text-white">
                      {team.name}
                    </Text>
                  </View>

                  {teamStaff.map((member) => {
                    const isSelected = assignedStaff.some(
                      (a) => a.userId === member.id && a.teamId === team.id
                    );

                    return (
                      <Pressable
                        key={member.id}
                        className="flex-row items-center justify-between"
                        onPress={() => {
                          setAssignedStaff((prev) => {
                            const exists = prev.find(
                              (a) => a.userId === member.id
                            );

                            if (exists && exists.teamId === team.id) {
                              return prev.filter((a) => a.userId !== member.id);
                            }

                            return [
                              ...prev.filter((a) => a.userId !== member.id),
                              { userId: member.id, teamId: team.id },
                            ];
                          });
                        }}
                      >
                        <View className="ml-2 mt-2">
                          <View className="flex-row items-center gap-1">
                            <View className="w-8 h-8 rounded-full bg-chatAvatarBlue flex items-center justify-center">
                              <Text className="text-white text-sm font-bold">
                                {namePreview(member?.name)}
                              </Text>
                            </View>
                            <View>
                              <Text className="dark:text-white">
                                {member.name}
                              </Text>
                              <Text className="text-xs text-gray-500">
                                {member.status === "online"
                                  ? "Online"
                                  : "Offline"}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {isSelected && (
                          <Check size={18} color={isDark ? "white" : "black"} />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            onPress={() => {
              handleAssign();
              setVisible(false);
            }}
            className="mt-4 bg-primaryBlue py-3 rounded-lg"
          >
            <Text className="text-white text-center font-semibold">Assign</Text>
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

function useAssignees(initial: Assignee[]) {
  const [assignedStaff, setAssignedStaff] = useState<Assignee[]>(initial);
  const prevRef = useRef<Assignee[]>(initial);

  useEffect(() => {
    if (!lodash.isEqual(prevRef.current, assignedStaff)) {
      prevRef.current = assignedStaff;
    }
  }, [assignedStaff]);

  return { assignedStaff, setAssignedStaff };
}
