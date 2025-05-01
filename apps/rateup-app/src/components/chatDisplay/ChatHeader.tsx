import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Modal,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import React, { useState } from "react";
import { BackIcon, DotsIcon } from "@/src/constants/imageExports";
import { useRouter } from "expo-router";
import { namePreview } from "../../utils/chatbox_utils";
import { closeChat } from "@/src/api/inbox/contacts.api";
import { useQueryClient } from "@tanstack/react-query";

const { width: screenWidth } = Dimensions.get("window");
let userId: string;

const MoreOptions = ({
  visible,
  onClose,
  onCloseChatPress,
}: {
  visible: boolean;
  onClose: () => void;
  onCloseChatPress: () => void;
}) => {
  const router = useRouter();
  const modalWidth = screenWidth * 0.4;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1" onPress={onClose}>
        <View
          className="absolute right-[10px] top-[55px] rounded-md p-2 bg-white shadow-md z-50"
          style={{ width: modalWidth }}
        >
          <TouchableOpacity
            className="p-3"
            onPress={() => {
              onClose();
              router.push({ pathname: "/inbox/contact/Edit", params: { userId } });
            }}
          >
            <Text className="text-gray-800 text-lg">Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity className="p-3" onPress={onClose}>
            <Text className="text-gray-800 text-lg">Assign</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="p-3"
            onPress={() => {
              onClose();
              onCloseChatPress();
            }}
          >
            <Text className="text-gray-800 text-lg">Close Chat</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
};

const ConfirmationModal = ({
  visible,
  onCancel,
  onProceed,
  isLoading,
}: {
  visible: boolean;
  onCancel: () => void;
  onProceed: () => void;
  isLoading: boolean;
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 justify-center items-center bg-black/50">
        <View className="bg-white p-6 rounded-xl w-[80vw] h-[18vh] flex gap-3">
          <Text className="text-xl font-semibold">Close This Chat?</Text>
          <Text className="text-md">This chat will be moved to Closed</Text>
          <View className="flex-row items-center justify-end gap-6 mt-4">
            <TouchableOpacity className="border py-2 px-6 rounded-full" onPress={onCancel}>
              <Text className="text-gray-800 font-semibold">Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`py-2 px-6 rounded-full ${
                isLoading ? "bg-gray-400" : "bg-[#009987]"
              }`}
              onPress={isLoading ? undefined : onProceed}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-white font-semibold">Proceed</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const ChatHeader = ({ id, name, phone }: { id: string; name: string; phone: number }) => {
  const router = useRouter();
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  userId = id;

  const handleProceedCloseChat = async () => {
    setIsLoading(true);
    try {
      await closeChat(userId, { waMessageAssignStatus: "CLOSED" });
      setConfirmModalVisible(false);
      queryClient.invalidateQueries({ queryKey: ["contactCounts"] });
      router.back();
    } catch (error) {
      console.error("Error closing chat:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-row items-center justify-between px-6 py-4 bg-white gap-3">
      <View className="flex-row items-center gap-3">
        <TouchableOpacity onPress={() => router.back()}>
          <BackIcon width={24} height={22} />
        </TouchableOpacity>

        <View className="w-12 h-12 rounded-full bg-[#00998733] flex items-center justify-center">
          <Text className="text-[#009987] font-bold text-xl">{namePreview(name)}</Text>
        </View>

        <View>
          <Text className="text-xl text-[#343A40] font-medium">{name}</Text>
          <Text className="text-[#7A8289]">{phone}</Text>
        </View>
      </View>

      <TouchableOpacity
        className="bg-[#00998733] h-5 w-5 flex justify-center items-center p-4 rounded-md"
        onPress={() => setOptionsVisible(true)}
      >
        <DotsIcon />
      </TouchableOpacity>

      <MoreOptions
        visible={optionsVisible}
        onClose={() => setOptionsVisible(false)}
        onCloseChatPress={() => setConfirmModalVisible(true)}
      />

      <ConfirmationModal
        visible={confirmModalVisible}
        onCancel={() => setConfirmModalVisible(false)}
        onProceed={handleProceedCloseChat}
        isLoading={isLoading}
      />
    </View>
  );
};

export default ChatHeader;
