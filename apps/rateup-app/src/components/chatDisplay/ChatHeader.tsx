import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Modal,
  Dimensions,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import React, { useState } from "react";
import { useRouter } from "expo-router";
import {
  generateInternalMessageId,
  namePreview,
} from "../../utils/chatbox_utils";
import { closeChat } from "@/src/api/inbox/contacts/contacts.api";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useChatAssignStatusStore } from "@/src/utils/store";
import { useToast } from "react-native-toast-notifications";
import AssignToUser from "./chatFooter/AssignToUser";
import {
  ArrowLeft,
  CircleCheckBig,
  MoreVertical,
  Pencil,
} from "lucide-react-native";
import { useEditContactMutation } from "@/src/api/inbox/contacts/contacts.query";
import { WaMessageClosedStatus } from "@/src/constants/constants";
import { WaMessageAssignStatus } from "@/src/api/inbox/types";
import { getClosedIcon } from "@/src/util";

const { width: screenWidth } = Dimensions.get("window");
let contactId: string;

const MoreOptions = ({
  visible,
  onClose,
  onCloseChatPress,
}: {
  visible: boolean;
  onClose: () => void;
  onCloseChatPress: () => void;
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const modalWidth = screenWidth * 0.4;
  const waAssignStatus = useChatAssignStatusStore(
    (state) => state.waAssignStatus
  );
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1" onPress={onClose}>
        <View
          className="absolute right-[10px] top-[55px] rounded-md p-2 bg-white dark:bg-slate-900 shadow-md z-50 flex items-start"
          style={{ width: modalWidth }}
        >
          <TouchableOpacity
            className="p-3 w-full"
            onPress={() => {
              onClose();
              router.push({
                pathname: "/protected/inbox/contact/Edit",
                params: { contactId },
              });
            }}
          >
            <View className="flex-row items-center gap-1">
              <Pencil color={isDark ? "white" : "black"} size={18} />
              <Text className="dark:text-white font-semibold" style={{fontSize:16}}>
                Edit
              </Text>
            </View>
          </TouchableOpacity>

          <AssignToUser contactId={contactId} iconSize={18} fontSize={16} />

          {waAssignStatus !== "CLOSED" ? (
            <TouchableOpacity
              className="p-3 w-full"
              onPress={() => {
                onClose();
                onCloseChatPress();
              }}
            >
              <View className="flex-row items-center gap-1">
                <CircleCheckBig color={isDark ? "white" : "black"} size={18} />
                <Text className="dark:text-white font-semibold" style={{fontSize:16}}>
                  Close
                </Text>
              </View>
            </TouchableOpacity>
          ) : null}
        </View>
      </Pressable>
    </Modal>
  );
};

const ConfirmationModal = ({
  visible,
  onCancel,
  contactId,
}: {
  visible: boolean;
  onCancel: () => void;
  contactId: string;
}) => {
  const queryClient = useQueryClient();
  const editContactMutation = useEditContactMutation();

  const handleCloseChat = (status: string) => {
    const id = generateInternalMessageId();

    editContactMutation.mutate(
      {
        contactId,
        data: { waMessageAssignStatus: status, messageId: id },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: ["assigned-contact", contactId],
          });
          queryClient.invalidateQueries({
            queryKey: ["wa-messages", contactId]
          });
          queryClient.invalidateQueries({ queryKey: ["contactCounts"] });
          queryClient.invalidateQueries({
            queryKey: ["assignedInboxUser", contactId],
          });
          onCancel();
        },
      }
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      {/* Center Container */}
      <View className="flex-1 justify-center items-center px-16">
        <View className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 px-5 py-6">
          <Text className="text-lg font-semibold mb-4 dark:text-white text-center">
            Close Chat
          </Text>
          <View className="flex items-center justify-center">
            <TouchableOpacity
              onPress={() => handleCloseChat(WaMessageAssignStatus.RESOLVED)}
              className="py-3 flex-row items-center justify-center gap-2 w-full"
            >
              {getClosedIcon(WaMessageAssignStatus.RESOLVED)}
              <Text className="text-lg font-semibold text-green-500">
                Mark as Resolved
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleCloseChat(WaMessageAssignStatus.CLOSED)}
              className="py-3 flex-row items-center justify-center gap-2 w-full"
            >
              {getClosedIcon(WaMessageAssignStatus.CLOSED)}
              <Text className="text-lg font-semibold text-blue-500">
                Mark as Closed
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleCloseChat(WaMessageAssignStatus.SPAM)}
              className="py-3 flex-row items-center justify-center gap-2 w-full"
            >
              {getClosedIcon(WaMessageAssignStatus.SPAM)}
              <Text className="text-lg font-semibold text-red-500">
                Mark as Spam
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleCloseChat(WaMessageAssignStatus.UNRESOLVED)}
              className="py-3 flex-row items-center justify-center gap-2 w-full"
            >
              {getClosedIcon(WaMessageAssignStatus.UNRESOLVED)}
              <Text className="text-lg font-semibold text-orange-500">
                Mark as Unresolved
              </Text>
            </TouchableOpacity>
          </View>
          {/* Cancel */}
          <TouchableOpacity
            onPress={onCancel}
            className="mt-4 py-3 rounded-lg bg-slate-800"
          >
            <Text className="text-center font-semibold text-white">
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const ChatHeader = ({
  id,
  name,
  phone,
  lastReceivedMessageTimeStamp,
}: {
  id: string;
  name: string;
  phone: number;
  lastReceivedMessageTimeStamp: any;
}) => {
  const router = useRouter();
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  contactId = id;
  const sessionExpiry = dayjs(lastReceivedMessageTimeStamp).add(24, "hour");
  const now = dayjs();
  const diffInMinutes = sessionExpiry.diff(now, "minute");
  const isSessionActive = diffInMinutes > 0;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const hoursLeft = Math.floor(diffInMinutes / 60);
  const minutesLeft = diffInMinutes % 60;

  return (
    <View className="flex-row items-center justify-between px-6 py-4 bg-white dark:bg-slate-950 shadow-md gap-3">
      <View className="flex-row items-center gap-3">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <ArrowLeft color={isDark ? "white" : "black"} />
        </TouchableOpacity>

        <View className="w-12 h-12 rounded-full bg-chatAvatarBlue flex items-center justify-center">
          <Text className="text-white font-bold text-xl">
            {namePreview(name)}
          </Text>
        </View>

        <View>
          <Text className="text-xl dark:text-white font-medium">{name}</Text>
          <Text className="text-gray-500">{phone}</Text>
          {isSessionActive ? (
            <View className="mt-1 w-fit px-2 py-0.5 rounded-md">
              <Text className="text-primaryBlue text-sm text-center">
                Session expires in {hoursLeft}h {minutesLeft}m
              </Text>
            </View>
          ) : (
            <View className="mt-1 bg-red-100 w-fit px-2 py-0.5 rounded-md">
              <Text className="text-red-600 text-sm text-center">
                Session expired
              </Text>
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity
        className="h-5 w-5 flex justify-center items-center p-4"
        onPress={() => setOptionsVisible(true)}
      >
        <MoreVertical color={isDark ? "white" : "black"} />
      </TouchableOpacity>

      <MoreOptions
        visible={optionsVisible}
        onClose={() => setOptionsVisible(false)}
        onCloseChatPress={() => setConfirmModalVisible(true)}
      />

      <ConfirmationModal
        contactId={contactId}
        visible={confirmModalVisible}
        onCancel={() => setConfirmModalVisible(false)}
      />
    </View>
  );
};

export default ChatHeader;
