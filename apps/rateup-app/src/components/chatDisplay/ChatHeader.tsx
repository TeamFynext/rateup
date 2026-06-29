import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Modal,
  Dimensions,
  useColorScheme,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import {
  generateInternalMessageId,
  namePreview,
} from "../../utils/chatbox_utils";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useChatAssignStatusStore, useSelectedContactStore } from "@/utils/store";
import AssignToUser from "./chatFooter/AssignToUser";
import LinearGradient from "react-native-linear-gradient";
import {
  ArrowLeft,
  CircleCheckBig,
  MoreVertical,
  Pencil,
  Clock,
} from "lucide-react-native";
import { Colors } from "@/constants/colors";
import { getClosedIcon } from "@/util";
import { MessagePlatform } from "@/constants/enums";
import { FontAwesome } from "@expo/vector-icons";
import { useEditContactMutation } from "@/api/inbox/contacts/contacts.query";
import { WaMessageAssignStatus } from "@/api/inbox/types";

const { width: screenWidth } = Dimensions.get("window");

const MoreOptions = ({
  visible,
  onClose,
  onCloseChatPress,
  contactId,
}: {
  visible: boolean;
  onClose: () => void;
  onCloseChatPress: () => void;
  contactId: string;
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
          style={{
            position: "absolute",
            right: 10,
            top: 55,
            borderRadius: 12,
            padding: 8,
            backgroundColor: isDark ? Colors.dark.surface : "#fff",
            borderWidth: 1,
            borderColor: isDark ? Colors.dark.borderLight : Colors.light.border,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.3 : 0.1,
            shadowRadius: 8,
            elevation: 5,
            width: modalWidth,
            alignItems: "flex-start",
          }}
        >
          <TouchableOpacity
            style={{ padding: 12, width: "100%" }}
            onPress={() => {
              onClose();
              router.push({
                pathname: "/protected/chat/Edit",
                params: { contactId },
              });
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Pencil color={isDark ? Colors.dark.textPrimary : Colors.light.textPrimary} size={18} />
              <Text
                style={{
                  fontFamily: "Nunito_600SemiBold",
                  color: isDark ? "#fff" : Colors.light.textPrimary,
                  fontSize: 15,
                }}
              >
                Edit
              </Text>
            </View>
          </TouchableOpacity>

          <AssignToUser contactId={contactId} iconSize={18} fontSize={15} />

          {waAssignStatus !== "CLOSED" ? (
            <TouchableOpacity
              style={{ padding: 12, width: "100%" }}
              onPress={() => {
                onClose();
                onCloseChatPress();
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <CircleCheckBig color={isDark ? Colors.dark.textPrimary : Colors.light.textPrimary} size={18} />
                <Text
                  style={{
                    fontFamily: "Nunito_600SemiBold",
                    color: isDark ? "#fff" : Colors.light.textPrimary,
                    fontSize: 15,
                  }}
                >
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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
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
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40, backgroundColor: "rgba(0,0,0,0.4)" }}>
        <View
          style={{
            width: "100%",
            maxWidth: 320,
            borderRadius: 16,
            backgroundColor: isDark ? Colors.dark.surface : "#fff",
            padding: 20,
            borderWidth: 1,
            borderColor: isDark ? Colors.dark.borderLight : Colors.light.border,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.4 : 0.15,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <Text
            style={{
              fontFamily: "Nunito_700Bold",
              fontSize: 18,
              color: isDark ? "#fff" : Colors.light.textPrimary,
              textAlign: "center",
              marginBottom: 16,
            }}
          >
            Close Chat
          </Text>
          <View style={{ alignItems: "center", justifyContent: "center" }}>
            <TouchableOpacity
              onPress={() => handleCloseChat(WaMessageAssignStatus.RESOLVED)}
              style={{ paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, width: "100%" }}
            >
              {getClosedIcon(WaMessageAssignStatus.RESOLVED)}
              <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 16, color: "#22c55e" }}>
                Mark as Resolved
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleCloseChat(WaMessageAssignStatus.CLOSED)}
              style={{ paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, width: "100%" }}
            >
              {getClosedIcon(WaMessageAssignStatus.CLOSED)}
              <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 16, color: Colors.brand.blue }}>
                Mark as Closed
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleCloseChat(WaMessageAssignStatus.SPAM)}
              style={{ paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, width: "100%" }}
            >
              {getClosedIcon(WaMessageAssignStatus.SPAM)}
              <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 16, color: "#ef4444" }}>
                Mark as Spam
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleCloseChat(WaMessageAssignStatus.UNRESOLVED)}
              style={{ paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, width: "100%" }}
            >
              {getClosedIcon(WaMessageAssignStatus.UNRESOLVED)}
              <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 16, color: "#f97316" }}>
                Mark as Unresolved
              </Text>
            </TouchableOpacity>
          </View>
          {/* Cancel */}
          <TouchableOpacity
            onPress={onCancel}
            style={{
              marginTop: 16,
              paddingVertical: 12,
              borderRadius: 12,
              backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#f3f4f6",
              width: "100%",
            }}
          >
            <Text style={{ textAlign: "center", fontFamily: "Nunito_700Bold", color: isDark ? "#fff" : "#4b5563" }}>
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
  const contactId = id;
  const sessionExpiry = dayjs(lastReceivedMessageTimeStamp).add(24, "hour");
  const now = dayjs();
  const diffInMinutes = sessionExpiry.diff(now, "minute");
  const isSessionActive = diffInMinutes > 0;
  const selectedContact = useSelectedContactStore((state) => state.selectedContact);
  const platform = selectedContact?.sourcePlatform || selectedContact?.lastMessage?.sourcePlatform || MessagePlatform.WHATSAPP;

  const renderPlatformIcon = () => {
    switch (platform) {
      case MessagePlatform.INSTAGRAM:
        return <FontAwesome name="instagram" size={14} color="#E1306C" />;
      case MessagePlatform.FACEBOOK:
        return <FontAwesome name="facebook-square" size={14} color="#1877F2" />;
      case MessagePlatform.WHATSAPP:
      default:
        return <FontAwesome name="whatsapp" size={14} color="#25D366" />;
    }
  };
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const hoursLeft = Math.floor(diffInMinutes / 60);
  const minutesLeft = diffInMinutes % 60;

  return (
    <View
      style={{
        backgroundColor: isDark
          ? Colors.brand.navyDeep
          : Colors.brand.blue,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 14,
        borderBottomWidth: isDark ? 1 : 0,
        borderBottomColor: Colors.dark.borderLight,
      }}
    >
      <View
        style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <ArrowLeft size={20} color="#fff" />
        </TouchableOpacity>

        <LinearGradient
          colors={[Colors.brand.blueLight, Colors.brand.blue] as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Text
            style={{
              fontFamily: "Nunito_900Black",
              fontSize: 15,
              color: "#fff",
            }}
          >
            {namePreview(name)}
          </Text>
        </LinearGradient>

        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text
              numberOfLines={1}
              style={{
                fontSize: 15,
                fontFamily: "Nunito_700Bold",
                color: "#fff",
                letterSpacing: -0.1,
                flexShrink: 1,
              }}
            >
              {formatName(name) || phone}
            </Text>
            {renderPlatformIcon()}
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              marginTop: 2,
            }}
          >
            <Clock
              size={11}
              color={
                isSessionActive
                  ? isDark
                    ? Colors.accent.orange
                    : "rgba(255,216,140,0.95)"
                  : "#ef4444"
              }
            />
            <Text
              style={{
                fontSize: 11,
                color: isSessionActive
                  ? isDark
                    ? Colors.accent.orange
                    : "rgba(255,216,140,0.95)"
                  : "#ef4444",
                fontFamily: "Nunito_600SemiBold",
              }}
            >
              {isSessionActive
                ? `Session expires in ${hoursLeft}h ${minutesLeft}m`
                : "Session expired"}
            </Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
          }}
        >
          <AssignToUser
            contactId={id}
            iconOnly
            iconSize={18}
            iconColor={
              isDark
                ? "rgba(255,255,255,0.5)"
                : "rgba(255,255,255,0.65)"
            }
          />
          <TouchableOpacity onPress={() => setOptionsVisible(true)} style={{ padding: 4 }}>
            <MoreVertical
              size={18}
              color={
                isDark
                  ? "rgba(255,255,255,0.5)"
                  : "rgba(255,255,255,0.65)"
              }
            />
          </TouchableOpacity>
        </View>
      </View>

      <MoreOptions
        visible={optionsVisible}
        onClose={() => setOptionsVisible(false)}
        onCloseChatPress={() => setConfirmModalVisible(true)}
        contactId={contactId}
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

function formatName(name: string) {
  return name.length > 20 ? name.slice(0, 20) + "..." : name;
}

