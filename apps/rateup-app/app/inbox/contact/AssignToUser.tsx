import React, { useState } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  Modal,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { BackIcon } from "@/src/constants/imageExports";
import { useRouter } from "expo-router";

const AssignToUser = () => {
  const router = useRouter();

  const teams = [
    "Sales Team",
    "Customer Success Team",
    "Marketing Team",
    "Operations Team",
    "Finance Team",
    "IT Support Team",
    "Design Team",
  ];

  const [teamModalVisible, setTeamModalVisible] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState("");

  const handleTeamSelect = (team: string) => {
    setSelectedTeam(team);
    setTeamModalVisible(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      style={{ flex: 1, backgroundColor: "white" }}
    >
      <View className="flex-1 p-4">
        {/* Header */}
        <View className="flex-row items-center mb-8 gap-2">
          <Pressable onPress={() => router.back()}>
            <BackIcon height={25} width={25} />
          </Pressable>
          <Text className="text-black text-2xl font-bold">
            Assign To Member
          </Text>
        </View>

        {/* Team Picker */}
        <View className="mb-6">
          <Text className="text-[#7A8289] mb-2 text-base">
            Team <Text className="text-[#CC292C]">*</Text>
          </Text>
          <Pressable
            onPress={() => setTeamModalVisible(true)}
            className="border border-[#E2E5ED] rounded-lg px-4 py-4"
          >
            <Text className="text-black text-base">
              {selectedTeam || "Select a team"}
            </Text>
          </Pressable>
        </View>

        {/* Members Input */}
        <View className="mb-6">
          <Text className="text-[#7A8289] mb-2 text-base">
            Members <Text className="text-[#CC292C]">*</Text>
          </Text>
          <View className="border border-[#E2E5ED] rounded-lg px-4 py-4 flex-row gap-2 items-center">
            <TextInput
              className="text-black text-base flex-1"
              placeholder="Enter contact name"
              placeholderTextColor="#E2E5ED"
            />
          </View>
        </View>

        {/* Done Button */}
        <View className="mt-8">
          <Pressable className="bg-rateUpGreen rounded-xl py-4 flex items-center justify-center">
            <Text className="text-white font-bold text-lg">Done</Text>
          </Pressable>
        </View>

        {/* Team Modal */}
        <Modal
          visible={teamModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setTeamModalVisible(false)}
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => setTeamModalVisible(false)}
          >
            <View className="flex-1 justify-end bg-black/30">
              <View className="bg-white p-5 rounded-t-xl max-h-[60%]">
                <Text className="text-lg font-semibold mb-4">Teams</Text>
                <FlatList
                  data={teams}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => handleTeamSelect(item)}
                      className="py-3"
                    >
                      <Text className="text-base">{item}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
};

export default AssignToUser;
