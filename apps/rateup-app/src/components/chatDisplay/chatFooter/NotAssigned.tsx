import { useLoggedInUser } from "@/src/api/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UserCheck, CircleUser } from "lucide-react-native";
import { assignInboxToUser } from "@/src/api/inbox/contacts/contacts.api";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useChatAssignStatusStore } from "@/src/utils/store";

const NotAssigned = ({ contactId }: { contactId: string }) => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: userData, isLoading: loadingUser } = useLoggedInUser();
  const setWaAssignStatus = useChatAssignStatusStore(
    (state) => state.setWaAssignStatus
  );

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
      queryClient.invalidateQueries({
        queryKey: ["assigned-contact", contactId],
      });
      queryClient.invalidateQueries({ queryKey: ["contactCounts"] });
    },
  });

  const handleAssignToMe = () => {
    if (!userData) return;
    mutate();
  };

  return (
    <View className="bg-white flex-row p-3 justify-around">
      <TouchableOpacity
        onPress={handleAssignToMe}
        disabled={assigning || loadingUser}
      >
        <View className="bg-[#00998733] rounded-full w-[40vw] flex-row p-2 justify-around items-center">
          {assigning || loadingUser ? (
            <ActivityIndicator size="small" color="#009987" />
          ) : (
            <>
              <CircleUser color={"#009987"} />
              <Text className="text-rateUpGreen">Assign To Me</Text>
            </>
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() =>
          router.push({
            pathname: "/inbox/contact/AssignToUser",
            params: { contactId: contactId },
          })
        }
      >
        <View className="bg-[#FFFFFF] border border-rateUpGreen rounded-full w-[40vw] flex-row p-2 justify-around items-center">
          <UserCheck color={"#009987"} />
          <Text className="text-rateUpGreen">Assign To Member</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default NotAssigned;
