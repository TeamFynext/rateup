import { useLoggedInUser } from "@/src/api/api";
import { useQueryClient } from "@tanstack/react-query";
import { CircleUser } from "lucide-react-native";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { useAssignInboxToUser } from "@/src/api/inbox/messages/message.query";
import AssignToUser from "./AssignToUser";
import { generateInternalMessageId } from "@/src/utils/chatbox_utils";
const NotAssigned = ({ contactId }: { contactId: string }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const queryClient = useQueryClient();
  const { data: userData, isLoading: loadingUser } = useLoggedInUser();
  const assignMut = useAssignInboxToUser(contactId);
  const handleAssignToMe = async () => {
    const { teams, userId } = userData;
    const id = generateInternalMessageId();
    assignMut.mutate(
      {
        messageId: id,
        contactId,
        assignees: [
          {
            userId: userId,
            teamId: teams[0],
          },
        ],
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
        },
      }
    );
  };

  return (
    <View className="bg-white dark:bg-gray-900 flex-row p-3 justify-center gap-4">
      <TouchableOpacity onPress={handleAssignToMe} disabled={loadingUser}>
        <View className="rounded-xl flex-row justify-center items-center gap-1 border dark:border-white px-4 py-2">
          {loadingUser ? (
            <ActivityIndicator size="small" color="#009987" />
          ) : (
            <>
              <CircleUser color={isDark ? "white" : "black"} size={18} />
              <Text className="dark:text-white">Assign To Me</Text>
            </>
          )}
        </View>
      </TouchableOpacity>
      <AssignToUser contactId={contactId} color />
    </View>
  );
};

export default NotAssigned;
