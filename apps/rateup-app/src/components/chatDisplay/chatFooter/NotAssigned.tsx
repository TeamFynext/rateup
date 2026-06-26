import { useLoggedInUser } from "@/api/api";
import { useQueryClient } from "@tanstack/react-query";
import { CircleUser } from "lucide-react-native";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { Colors } from "@/constants/colors";
import { useAssignInboxToUser } from "@/api/inbox/messages/message.query";
import AssignToUser from "./AssignToUser";
import { generateInternalMessageId } from "@/utils/chatbox_utils";
import { useChatAssignStatusStore } from "@/utils/store";
const NotAssigned = ({ contactId }: { contactId: string }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const setWaAssignStatus = useChatAssignStatusStore(
    (state) => state.setWaAssignStatus
  );
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
          setWaAssignStatus("ASSIGNED")
          queryClient.invalidateQueries({
            queryKey: ["assigned-contact", contactId],
          });
          queryClient.invalidateQueries({
            queryKey: ["wa-messages", contactId],
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
    <View
      style={{
        backgroundColor: isDark ? Colors.dark.surface : Colors.light.card,
        flexDirection: "row",
        padding: 12,
        justifyContent: "center",
        gap: 16,
        borderTopWidth: 1,
        borderTopColor: isDark ? Colors.dark.border : Colors.light.border,
      }}
    >
      <TouchableOpacity onPress={handleAssignToMe} disabled={loadingUser}>
        <View
          style={{
            borderRadius: 12,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: 6,
            borderWidth: 1,
            borderColor: isDark ? Colors.dark.borderLight : Colors.light.border,
            paddingHorizontal: 16,
            paddingVertical: 10,
          }}
        >
          {loadingUser ? (
            <ActivityIndicator size="small" color={Colors.brand.blue} />
          ) : (
            <>
              <CircleUser color={isDark ? Colors.dark.textPrimary : Colors.light.textPrimary} size={18} />
              <Text
                style={{
                  fontFamily: "Nunito_600SemiBold",
                  color: isDark ? Colors.dark.textPrimary : Colors.light.textPrimary,
                  fontSize: 14,
                }}
              >
                Assign To Me
              </Text>
            </>
          )}
        </View>
      </TouchableOpacity>
      <AssignToUser contactId={contactId} color />
    </View>
  );
};

export default NotAssigned;
