import { useLoggedInUser } from "@/api/api";
import { CircleUser } from "lucide-react-native";
import { View, Text, TouchableOpacity, ActivityIndicator, useColorScheme } from "react-native";
import { Colors } from "@/constants/colors";
import { useAssignOwner } from "@/api/inbox/messages/message.query";
import AssignToUser from "./AssignToUser";
import { generateInternalMessageId } from "@/utils/chatbox_utils";
import { useChatAssignStatusStore } from "@/utils/store";
import { useContactsStore } from "@/store/inboxStore";
import { Toast } from "@/components/common/Notice";
import { usePermissions } from "@/hooks/usePermissions";
const NotAssigned = ({ contactId }: { contactId: string }) => {
  const { can } = usePermissions();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const setWaAssignStatus = useChatAssignStatusStore((state) => state.setWaAssignStatus);
  const { data: userData, isLoading: loadingUser } = useLoggedInUser();
  const assignMut = useAssignOwner();
  /** Waiting on the user query, or on the assign itself. */
  const busy = loadingUser || assignMut.isPending;

  const handleAssignToMe = async () => {
    const userId = userData?.userId;
    if (!userId) {
      Toast.show({
        type: "error",
        text1: "Can't assign to you",
        text2: "Your account details haven't loaded yet.",
      });
      return;
    }

    // The API picks the team: the chat's own when I am in it, not my first team.
    assignMut.mutate(
      { messageId: generateInternalMessageId(), contactId, userId },
      {
        onSuccess: (result) => {
          setWaAssignStatus("ASSIGNED");

          // The inbox list renders from the contacts store (and its SQLite
          // mirror), not react-query, so it needs telling directly or the row
          // keeps its old status and stays out of the assigned lists.
          useContactsStore.getState().updateContactById(contactId, (c: any) => ({
            ...c,
            waMessageAssignStatus: "ASSIGNED",
            assignedUsers: (result?.assignees ?? []).map((a) => ({
              id: a.userId,
              teamId: a.teamId,
              name: userData?.userName ?? "",
            })),
          }));
        },
        onError: (error: any) => {
          Toast.show({
            type: "error",
            text1: "Could not assign",
            text2: error?.response?.data?.message ?? error?.message ?? "Please try again.",
          });
        },
      },
    );
  };

  if (!can("inbox.assign")) return null;

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
      <TouchableOpacity onPress={handleAssignToMe} disabled={busy}>
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
            // Keeps the button from resizing when the label swaps for a spinner.
            minWidth: 150,
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? (
            <ActivityIndicator size="small" color={Colors.brand.blue} />
          ) : (
            <>
              <CircleUser
                color={isDark ? Colors.dark.textPrimary : Colors.light.textPrimary}
                size={18}
              />
              <Text
                style={{
                  fontFamily: "InstrumentSans_600SemiBold",
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
