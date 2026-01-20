import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  FlatList,
} from "react-native";
import React, { useEffect, useState } from "react";
import { IIcon } from "@/src/constants/imageExports";
import NotAssigned from "./chatFooter/NotAssigned";
import MessageSendPanel from "./chatFooter/MessageSendPanel";
import { useAuth } from "@/src/context/AuthContext";
import { useChatAssignStatusStore } from "@/src/utils/store";
import { UserCheck } from "lucide-react-native";
import { WaMessageClosedStatus } from "@/src/constants/constants";
import { WaMessageAssignStatus } from "@/src/api/inbox/types";
import { useGetAssignedUserForContact } from "@/src/api/inbox/messages/message.query";

const ChatFooter = ({ id }: { id: string }) => {
  const waAssignStatus = useChatAssignStatusStore(
    (state) => state.waAssignStatus
  );
  const { data: assignedUsers } = useGetAssignedUserForContact(id);
  const { userId } = useAuth();
  const [isModalVisible, setModalVisible] = useState(false);
  let currentUserAssignment = assignedUsers?.find(
    (entry: any) => entry.assignedUserId == userId
  );
  const hasAssignedUsers = (assignedUsers?.length ?? 0) > 0;
  const toggleModal = () => setModalVisible(!isModalVisible);
  const AssignedUsersModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isModalVisible}
      onRequestClose={toggleModal}
    >
      <Pressable
        className="flex-1 justify-center items-center bg-black/50"
        onPress={toggleModal}
      >
        <View className=" rounded-2xl p-4 w-[80%] max-h-[50%] min-h-[50%]">
          <Text className="text-xl font-bold mb-4">Assigned Members</Text>
          <FlatList
            contentContainerStyle={{
              display: "flex",
              justifyContent: "center",
              gap: 5,
            }}
            data={assignedUsers}
            keyExtractor={(item) => item.assignedUserId}
            renderItem={({ item }) => (
              <View className="flex-row gap-1 justify-start items-center px-6 bg-rateUpGreen20 rounded-lg">
                <UserCheck color="#7A8289" width={20} height={20} />
                <Text className="text-lg text-gray-500">
                  {item.assignedUser?.name}
                </Text>
              </View>
            )}
            ListEmptyComponent={
              <Text className="text-gray-500 text-center">
                No assigned users
              </Text>
            }
          />
        </View>
      </Pressable>
    </Modal>
  );

  if (
    (!currentUserAssignment) ||
    waAssignStatus === "UNASSIGNED" ||
    waAssignStatus === "NEW" ||
    WaMessageClosedStatus.includes(waAssignStatus as WaMessageAssignStatus)
  ) {
    return (
      <View>
        <View className="bg-black flex-row py-2 px-1 items-center justify-center gap-1">
          <IIcon />
          <Text className="text-white">Please assign to start the chat</Text>
        </View>
        <NotAssigned contactId={id} />
      </View>
    );
  }

  return (
    <View>
      {!currentUserAssignment && hasAssignedUsers && (
        <View className="bg-black flex-row py-3 px-1 items-center justify-center gap-1 flex-wrap">
          <IIcon />
          <Text className="text-white">This chat is not assigned to you.</Text>
          {assignedUsers && (
            <TouchableOpacity onPress={toggleModal}>
              <Text className="text-rateUpGreen underline">View Members?</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {currentUserAssignment && <MessageSendPanel />}
      <AssignedUsersModal />
    </View>
  );
};

export default ChatFooter;
