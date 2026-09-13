import { useLoggedInUser } from "@/api/api";
import { useQueryClient } from "@tanstack/react-query";
import { CircleUser } from "lucide-react-native";
import { View, Text, TouchableOpacity, ActivityIndicator, useColorScheme } from "react-native";
import { Colors } from "@/constants/colors";
import { useAssignInboxToUser } from "@/api/inbox/messages/message.query";
import AssignToUser from "./AssignToUser";
import { generateInternalMessageId } from "@/utils/chatbox_utils";
import { useChatAssignStatusStore } from "@/utils/store";
import { useContactsStore } from "@/store/inboxStore";
import { Toast } from "@/components/common/Notice";
const NotAssigned = ({ contactId }: { contactId: string }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const setWaAssignStatus = useChatAssignStatusStore((state) => state.setWaAssignStatus);
  const queryClient = useQueryClient();
  const { data: userData, isLoading: loadingUser } = useLoggedInUser();
  const assignMut = useAssignInboxToUser(contactId);
  /** Waiting on the user query, or on the assign itself. */
  const busy = loadingUser || assignMut.isPending;

  const handleAssignToMe = async () => {
    const userId = userData?.userId;
    const teamId = userData?.teams?.[0];

    // The assign endpoint requires a teamId (`z.string()`, not optional), so a
    // user with no team membership used to send `teamId: undefined` and get a
    // silent 400 — and a missing `userData` threw on destructuring before the
    // request was even made.
    if (!userId || !teamId) {
      Toast.show({
        type: "error",
        text1: "Can't assign to you",
        text2: !userId
          ? "Your account details haven't loaded yet."
          : "You're not a member of any team.",
      });
      return;
    }

    const id = generateInternalMessageId();
    assignMut.mutate(
      {
        messageId: id,
        contactId,
        assignees: [{ userId, teamId }],
      },
      {
        onSuccess: () => {
          setWaAssignStatus("ASSIGNED");

          // The inbox list renders from the contacts store (and its SQLite
          // mirror), not react-query, so it needs telling directly or the row
          // keeps its old status and stays out of the assigned lists.
          useContactsStore.getState().updateContactById(contactId, (c: any) => ({
            ...c,
            waMessageAssignStatus: "ASSIGNED",
            assignedUsers: [{ id: userId, teamId, name: userData?.userName ?? "" }],
          }));

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
          queryClient.invalidateQueries({ queryKey: ["contacts", "filtered"] });
        },
        onError: (error: any) => {
          // This used to fail silently, which is most of why it looked broken.
          Toast.show({
            type: "error",
            text1: "Could not assign",
            text2: error?.response?.data?.message ?? error?.message ?? "Please try again.",
          });
        },
      },
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
