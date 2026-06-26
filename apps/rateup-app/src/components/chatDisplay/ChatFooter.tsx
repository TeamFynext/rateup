import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  FlatList,
  useColorScheme,
} from "react-native";
import React, { useState } from "react";
import NotAssigned from "./chatFooter/NotAssigned";
import MessageSendPanel from "./chatFooter/MessageSendPanel";
import { useAuth } from "@/context/AuthContext";
import { useChatAssignStatusStore } from "@/utils/store";
import { Info, UserCheck } from "lucide-react-native";
import { WaMessageClosedStatus } from "@/constants/constants";
import { WaMessageAssignStatus } from "@/api/inbox/types";
import { useGetAssignedUserForContact } from "@/api/inbox/messages/message.query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";

const ChatFooter = ({ id }: { id: string }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const waAssignStatus = useChatAssignStatusStore(
    (state) => state.waAssignStatus,
  );
  const { data: assignedUsers } = useGetAssignedUserForContact(id);
  const { userId } = useAuth();
  const [isModalVisible, setModalVisible] = useState(false);
  let currentUserAssignment = assignedUsers?.find(
    (entry: any) => entry.assignedUserId == userId,
  );
  const hasAssignedUsers = (assignedUsers?.length ?? 0) > 0;
  const toggleModal = () => setModalVisible(!isModalVisible);

  if (
    !hasAssignedUsers ||
    waAssignStatus === "UNASSIGNED" ||
    waAssignStatus === "NEW" ||
    WaMessageClosedStatus.includes(waAssignStatus as WaMessageAssignStatus)
  ) {
    return (
      <View style={{ paddingBottom: insets.bottom }}>
        <View
          style={{
            flexDirection: "row",
            paddingVertical: 10,
            paddingHorizontal: 16,
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface,
            borderBottomWidth: 1,
            borderBottomColor: isDark ? Colors.dark.border : Colors.light.border,
          }}
        >
          <Info color={isDark ? Colors.accent.cyan : Colors.brand.blue} size={16} />
          <Text
            style={{
              fontFamily: "Nunito_600SemiBold",
              color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary,
              fontSize: 13,
            }}
          >
            Please assign to start the chat
          </Text>
        </View>
        <NotAssigned contactId={id} />
      </View>
    );
  }

  return (
    <View style={{ paddingBottom: insets.bottom }}>
      {!currentUserAssignment && hasAssignedUsers && (
        <View
          style={{
            flexDirection: "row",
            paddingVertical: 10,
            paddingHorizontal: 16,
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            flexWrap: "wrap",
            backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface,
            borderBottomWidth: 1,
            borderBottomColor: isDark ? Colors.dark.border : Colors.light.border,
          }}
        >
          <Info color={isDark ? Colors.accent.cyan : Colors.brand.blue} size={16} />
          <Text
            style={{
              fontFamily: "Nunito_600SemiBold",
              color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary,
              fontSize: 13,
            }}
          >
            This chat is not assigned to you.
          </Text>
        </View>
      )}

      {currentUserAssignment && <MessageSendPanel />}

    </View>
  );
};

export default ChatFooter;
