import { View, Text } from "react-native";
import React from "react";
import { IIcon } from "@/src/constants/imageExports";
import { useAssignedContact } from "@/src/api/inbox/contacts/contacts.query";
import NotAssigned from "./chatFooter/NotAssigned";
import MessageSendPanel from "./chatFooter/MessageSendPanel";

const ChatFooter = ({
  waAssignStatus,
  id,
  setWaAssignStatus,
}: {
  waAssignStatus: string;
  id: string;
  setWaAssignStatus: React.Dispatch<React.SetStateAction<string>>;
}) => {
  const { data: assignedData } = useAssignedContact(id);
  const assignedUser = assignedData?.[0]?.assignedUser?.name || "";

  if (waAssignStatus === "UNASSIGNED" || waAssignStatus === "NEW") {
    return (
      <>
        <View className="bg-black flex-row py-2 px-1 items-center justify-center gap-1">
          <IIcon />
          <Text className="text-white">Please assign to start the chat</Text>
        </View>
        <NotAssigned contactId={id} setWaAssignStatus={setWaAssignStatus} />
      </>
    );
  } else if (waAssignStatus === "CLOSED") {
    return (
      <View className="bg-black flex-row py-2 px-1 items-center justify-center gap-1">
        <IIcon />
        <Text className="text-white">
          This chat is Closed
        </Text>
      </View>
    );
  } else {
    return (
      <>
      <View className="bg-black flex-row py-2 px-1 items-center justify-center gap-1">
        <IIcon />
        <Text className="text-white">
          This chat is assigned to {assignedUser}
        </Text>
      </View>
      <MessageSendPanel/>
      </>
    );
  }
};

export default ChatFooter;
