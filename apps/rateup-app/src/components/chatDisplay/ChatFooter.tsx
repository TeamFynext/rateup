import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  FlatList,
} from "react-native";
import React, { useState } from "react";
import { IIcon } from "@/src/constants/imageExports";
import { useAssignedContact } from "@/src/api/inbox/contacts/contacts.query";
import NotAssigned from "./chatFooter/NotAssigned";
import MessageSendPanel from "./chatFooter/MessageSendPanel";
import { useAuth } from "@/src/context/AuthContext";
import { useChatAssignStatusStore } from "@/src/utils/store";

const ChatFooter = ({ id }: { id: string }) => {
  const waAssignStatus = useChatAssignStatusStore(
    (state) => state.waAssignStatus
  );
  const { data: assignedData = [] } = useAssignedContact(id);
  const { userId } = useAuth();
  const [isModalVisible, setModalVisible] = useState(false);

  let currentUserAssignment;

  if (assignedData) {
    currentUserAssignment = assignedData.find(
      (entry: any) => entry.assignedUserId === userId
    );
  }

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
        <View className="bg-white rounded-2xl p-4 w-[80%] max-h-[70%]">
          <Text className="text-xl font-bold mb-4 text-center">
            Assigned Members
          </Text>
          <FlatList
            contentContainerStyle={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
            }}
            data={assignedData}
            keyExtractor={(item) => item.assignedUserId}
            renderItem={({ item }) => (
              <Text className="text-base text-black">
                {item.assignedUser?.name}
              </Text>
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

  if (waAssignStatus === "UNASSIGNED" || waAssignStatus === "NEW") {
    return (
      <>
        <View className="bg-black flex-row py-2 px-1 items-center justify-center gap-1">
          <IIcon />
          <Text className="text-white">Please assign to start the chat</Text>
        </View>
        <NotAssigned contactId={id} />
      </>
    );
  } else if (waAssignStatus === "CLOSED") {
    return (
      <View className="bg-black flex-row py-2 px-1 items-center justify-center gap-1">
        <IIcon />
        <Text className="text-white">This chat is Closed</Text>
      </View>
    );
  } else {
    return (
      <>
        <View className="bg-black flex-row py-3 px-1 items-center justify-center gap-1 flex-wrap">
          <IIcon />
          <Text className="text-white">
            {currentUserAssignment
              ? "This chat is assigned to you"
              : "This chat is not assigned to you."}
          </Text>
          {!currentUserAssignment && (
            <TouchableOpacity onPress={toggleModal}>
              <Text className="text-rateUpGreen underline">View Members?</Text>
            </TouchableOpacity>
          )}
        </View>
        {currentUserAssignment && <MessageSendPanel />}
        <AssignedUsersModal />
      </>
    );
  }
};

export default ChatFooter;
