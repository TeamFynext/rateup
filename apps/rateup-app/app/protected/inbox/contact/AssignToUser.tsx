import React, { useState } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Modal,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator, // Import ActivityIndicator
} from "react-native";
import { BackIcon } from "@/src/constants/imageExports";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTeamsByUser, useUserByTeam } from "@/src/api/teams/teams.query";
import { assignInboxToUser } from "@/src/api/inbox/contacts/contacts.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleX } from "lucide-react-native";
import { useChatAssignStatusStore } from "@/src/utils/store";
import { useToast } from "react-native-toast-notifications";
import { useAssignedContact } from "@/src/api/inbox/contacts/contacts.query";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const AssignToUser = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const teams = useTeamsByUser();
  const setWaAssignStatus = useChatAssignStatusStore(
    (state) => state.setWaAssignStatus
  );

  const { contactId } = useLocalSearchParams();
  const toast = useToast();
  //@ts-ignore
  const { data: assignedData = [], isLoading: Loading } = useAssignedContact(contactId);
  const [teamModalVisible, setTeamModalVisible] = useState(false);
  const [selectedTeamName, setSelectedTeamName] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [membersModalVisible, setMembersModalVisible] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  React.useEffect(() => {
    if (assignedData?.length > 0) {
      const assignedIds = assignedData.map((item: any) => item.assignedUserId);
      setSelectedMemberIds(assignedIds);
      // Optionally also set the team if they all belong to same team
      const firstTeamId = assignedData[0]?.teamId;
      setSelectedTeamId(firstTeamId);
      const selectedTeam = teams.data?.data?.find(
        (t: any) => t.id === firstTeamId
      );
      if (selectedTeam) {
        setSelectedTeamName(selectedTeam.name);
      }
    }
  }, [assignedData]);
  const { data: membersData, isLoading } = useUserByTeam(selectedTeamId);
  const filteredMembers =
    membersData?.data?.filter((member: any) =>
      member.teams.some((team: any) => team.team_id === selectedTeamId)
    ) || [];

  const handleTeamSelect = (team: any) => {
    setSelectedTeamName(team.name);
    setSelectedTeamId(team.id);
    setTeamModalVisible(false);
  };

  const {
    mutate,
    isPending: assigning,
    isError,
  } = useMutation({
    mutationFn: async () => {
      return assignInboxToUser({
        //@ts-ignore
        contactId,
        assignedUserIds: [...selectedMemberIds],
        teamId: selectedTeamId,
      });
    },
    onSuccess: () => {
      toast.show("Assigned successfully", {
        type: "success",
      });
      setWaAssignStatus("ASSIGNED");
      queryClient.invalidateQueries({
        queryKey: ["assigned-contact", contactId],
      });
      queryClient.invalidateQueries({ queryKey: ["contactCounts"] });
      router.back();
    },
  });

  if (Loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text className="text-black mt-4 text-[4vw]">
          Loading assigned users...
        </Text>
      </View>
    );
  }

  if (isError) {
    toast.show("Could not Assign", {
      type: "danger",
    });
  }

  return (
    <SafeAreaView className="bg-white flex-grow">
      <View
        className="flex-1 px-[5%] pt-[5%] pb-10"
        style={{ minHeight: screenHeight }}
      >
        {/* Header */}
        <View className="flex-row items-center mb-8 gap-3">
          <Pressable onPress={() => router.back()}>
            <BackIcon height={25} width={25} />
          </Pressable>
          <Text className="text-black text-[6vw] font-bold">
            Assign To Member
          </Text>
        </View>

        {/* Team Picker */}
        <View className="mb-6">
          <Text className="text-rateUpTextGray mb-2 text-[4vw]">
            Team <Text className="text-[#CC292C]">*</Text>
          </Text>
          <Pressable
            onPress={() => setTeamModalVisible(true)}
            className="border border-[#E2E5ED] rounded-lg px-4 py-4"
          >
            <Text className="text-black text-[4.5vw]">
              {selectedTeamName || "Select a team"}
            </Text>
          </Pressable>
        </View>

        {/* Members Input */}
        <Text className="text-rateUpTextGray mb-2 text-[4vw]">
          Members <Text className="text-[#CC292C]">*</Text>
        </Text>
        <Pressable
          className="border border-[#E2E5ED] rounded-lg px-4 py-4"
          onPress={() => setMembersModalVisible(true)}
        >
          {selectedMemberIds.length > 0 ? (
            <View className="flex-row flex-wrap gap-2">
              {filteredMembers
                .filter((member: any) => selectedMemberIds.includes(member.id))
                .map((member: any) => (
                  <View
                    key={member.id}
                    className="flex-row items-center bg-[#F0F0F0] rounded-full px-3 py-1"
                  >
                    <Text className="text-black mr-2">{member.name}</Text>
                    <Pressable
                      onPress={() =>
                        setSelectedMemberIds((prev) =>
                          prev.filter((id) => id !== member.id)
                        )
                      }
                    >
                      <Text className="text-black font-bold">
                        <CircleX
                          fill={"black"}
                          color={"white"}
                          height={30}
                          width={30}
                        />
                      </Text>
                    </Pressable>
                  </View>
                ))}
            </View>
          ) : (
            <Text className="text-black text-[4.5vw]">Select Members</Text>
          )}
        </Pressable>

        {/* Add flexGrow here to push the button down */}
        <View style={{ flexGrow: 1 }} />

        {/* Done Button with Loading Indicator */}
        <View className="mb-8">
          <Pressable
            onPress={() => mutate()}
            className="bg-rateUpGreen rounded-xl py-4 items-center justify-center"
            disabled={assigning} // Disable the button while assigning
          >
            {assigning ? (
              <ActivityIndicator color="white" size="small" /> // Show spinner
            ) : (
              <Text className="text-white font-bold text-[4.5vw]">Done</Text>
            )}
          </Pressable>
        </View>
      </View>

      {/* Team Modal */}
      <Modal
        visible={teamModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setTeamModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          className="flex-1 bg-black/30 justify-end items-center"
          onPressOut={() => setTeamModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            className="bg-white w-full rounded-t-3xl p-5"
            style={{ height: screenHeight * 0.5 }}
          >
            <Text className="text-xl font-bold mb-3">Select a Team</Text>
            <FlatList
              data={teams.data?.data || []}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 10 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleTeamSelect(item)}
                  className="py-3 px-3"
                >
                  <Text className="text-lg text-rateUpTextGray">
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* MemberModal  */}
      <Modal
        visible={membersModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setMembersModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          className="flex-1 bg-black/30 justify-end items-center"
          onPressOut={() => setMembersModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            className="bg-white w-full rounded-t-3xl p-5"
            style={{ height: screenHeight * 0.5 }}
          >
            <Text className="text-xl font-bold mb-3">Select Members</Text>
            <FlatList
              data={filteredMembers}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{
                padding: 3,
                display: "flex",
                gap: 3,
                justifyContent: "center",
              }}
              renderItem={({ item }) => {
                const isSelected = selectedMemberIds.includes(item.id);
                return (
                  <TouchableOpacity
                    onPress={() => {
                      if (isSelected) {
                        setSelectedMemberIds((prev) =>
                          prev.filter((id) => id !== item.id)
                        );
                      } else {
                        setSelectedMemberIds((prev) => [...prev, item.id]);
                      }
                    }}
                    className={`py-3 px-3 rounded-lg ${
                      isSelected ? "bg-[#F5F5F5]" : "bg-white"
                    }`}
                  >
                    <Text
                      className={`text-lg ${
                        isSelected
                          ? "text-black font-bold"
                          : "text-rateUpTextGray"
                      }`}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

export default AssignToUser;
