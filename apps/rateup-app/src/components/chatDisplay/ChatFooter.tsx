import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import React from "react";
import { assignInboxToUser } from "@/src/api/inbox/contacts.api";
import { IIcon } from "@/src/constants/imageExports";
import { UserCheck, CircleUser } from "lucide-react-native";
import { useAssignedContact } from "@/src/api/inbox/contacts.query";
import { useLoggedInUser } from "@/src/api/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const NotAssigned = ({
  contactId,
  setWaAssignStatus,
}: {
  contactId: string;
  setWaAssignStatus: React.Dispatch<React.SetStateAction<string>>;
}) => {
  const queryClient = useQueryClient();
  const { data: userData, isLoading: loadingUser } = useLoggedInUser();

  const { mutate, isPending: assigning } = useMutation({
    mutationFn: async () => {
      const { teams, userId } = userData;
      return assignInboxToUser({
        contactId,
        assignedUserIds: [userId],
        teamId: teams[0],
      });
    },
    onSuccess: () => {
      setWaAssignStatus("ASSIGNED");
      queryClient.invalidateQueries({ queryKey: ["assigned-contact", contactId] });
      queryClient.invalidateQueries({queryKey:["contactCounts"]});
    },
  });

  const handleAssignToMe = () => {
    if (!userData) return;
    mutate();
  };

  return (
    <View className="bg-white flex-row p-3 justify-around">
      <TouchableOpacity onPress={handleAssignToMe} disabled={assigning || loadingUser}>
        <View className="bg-[#00998733] rounded-full w-[40vw] flex-row p-2 justify-around items-center">
          {assigning || loadingUser ? (
            <ActivityIndicator size="small" color="#009987" />
          ) : (
            <>
              <CircleUser color={"#009987"} />
              <Text className="text-[#009987]">Assign To Me</Text>
            </>
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity disabled>
        <View className="bg-[#FFFFFF] border border-[#009987] rounded-full w-[40vw] flex-row p-2 justify-around items-center">
          <UserCheck color={"#009987"} />
          <Text className="text-[#009987]">Assign To Member</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

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

  return (
    <View className="border">
      {waAssignStatus === "UNASSIGNED" || waAssignStatus === "NEW" ? (
        <>
          <View className="bg-black flex-row py-2 px-1 items-center justify-center gap-1">
            <IIcon />
            <Text className="text-white">Please assign to start the chat</Text>
          </View>
          <NotAssigned contactId={id} setWaAssignStatus={setWaAssignStatus} />
        </>
      ) : (
        <View className="bg-black flex-row py-2 px-1 items-center justify-center gap-1">
          <IIcon />
          <Text className="text-white">This chat is assigned to {assignedUser}</Text>
        </View>
      )}
    </View>
  );
};

export default ChatFooter;
