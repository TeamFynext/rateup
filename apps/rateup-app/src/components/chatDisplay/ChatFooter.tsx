import { useColorScheme } from "nativewind";
import { useMemo } from "react";
import { View, Text } from "react-native";
import NotAssigned from "./chatFooter/NotAssigned";
import MessageSendPanel from "./chatFooter/MessageSendPanel";
import { useAuth } from "@/context/AuthContext";
import { useChatAssignStatusStore, useSelectedContactStore } from "@/utils/store";
import { Info, UserPlus } from "lucide-react-native";
import { getInboxRowTheme } from "@/constants/inboxDesign";
import { MessagePlatform } from "@/constants/enums";
import { useWaSettings } from "@/api/whatsapp/template/whatsapp.query";
import { WaMessageClosedStatus } from "@/constants/constants";
import { WaMessageAssignStatus } from "@/api/inbox/types";
import { useGetAssignedUserForContact } from "@/api/inbox/messages/message.query";
import { useMessagesStore } from "@/store/inboxStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Skeleton, SkeletonCircle } from "@/components/common/Skeleton";
import { Colors } from "@/constants/colors";
import { findChannelAccount, getContactChannelSource } from "@/utils/chatbox_utils";

const ChatFooter = ({ id }: { id: string }) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const t = getInboxRowTheme(isDark);
  const insets = useSafeAreaInsets();
  const waAssignStatus = useChatAssignStatusStore((state) => state.waAssignStatus);
  const { data: assignedUsers, isLoading: assignmentLoading } = useGetAssignedUserForContact(id);
  const { userId } = useAuth();
  let currentUserAssignment = assignedUsers?.find((entry: any) => entry.assignedUserId == userId);
  const hasAssignedUsers = (assignedUsers?.length ?? 0) > 0;

  const selectedContact = useSelectedContactStore((s) => s.selectedContact);
  // Only this route's contact — the store may still hold the previously opened
  // one, and channel is what decides which business number the reply goes out on.
  const contact = selectedContact?.id === id ? selectedContact : undefined;

  // A chat opened by deep link has no `lastMessage`: `/api/contact/:id` returns
  // the bare contact row. The loaded thread (newest first) carries the same
  // `sourcePlatform`/`sourceIdentifier`, so it stands in. Without it the reply is
  // sent with an empty phoneId — from the wrong number, or not at all.
  const threadMessages = useMessagesStore((s) => s.messagesByKey.get(`${id}_all`)?.messages);
  const { platform, identifier } = useMemo(
    () =>
      getContactChannelSource({
        lastMessage: contact?.lastMessage,
        messages: threadMessages,
        igsId: contact?.igsId,
        psid: contact?.psid,
      }),
    [contact?.lastMessage, contact?.igsId, contact?.psid, threadMessages],
  );
  const { data: waSettings } = useWaSettings();

  /**
   * The account this conversation runs on. The WhatsApp match used to be
   * `s.phone === sourceIdentifier`, which never holds (`+965…` against `965…`),
   * so the reply went out with no phoneId — on the org's default number, which
   * the customer may never have written to, and Meta answered 131047
   * "Re-engagement message". Instagram, Messenger and webchat address the send by
   * the identifier the thread already recorded.
   */
  const whatsappSettingsPhoneId = useMemo(() => {
    if (platform !== MessagePlatform.WHATSAPP) return identifier ?? "";
    return findChannelAccount(waSettings, platform, identifier)?.phoneId ?? "";
  }, [waSettings, platform, identifier]);

  // Until the assignment request answers, we do not know whether this chat is
  // unassigned — `assignedUsers` is undefined while loading, which the check
  // below cannot tell apart from a genuine empty list. Asserting "Unassigned
  // conversation" here was showing a confident wrong answer, most visibly on a
  // notification tap, where the request starts from cold. Hold the space
  // instead and let the real state land.
  //
  // `isLoading`, not `isPending`: the query is disabled without an id, and a
  // disabled query stays pending forever, which would blank the footer for good.
  if (assignmentLoading) {
    return (
      <View
        style={{
          paddingBottom: insets.bottom,
          borderTopWidth: 1,
          borderTopColor: t.border1,
          backgroundColor: isDark ? Colors.dark.surface : Colors.light.card,
        }}
      >
        {/* Shaped like the send panel it is standing in for — a round action, the
            composer, and the send button — so the footer does not resize when
            the real one arrives. */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <SkeletonCircle size={38} />
          <Skeleton height={38} borderRadius={19} style={{ flex: 1 }} />
          <SkeletonCircle size={38} />
        </View>
      </View>
    );
  }

  if (
    !hasAssignedUsers ||
    waAssignStatus === "UNASSIGNED" ||
    waAssignStatus === "NEW" ||
    WaMessageClosedStatus.includes(waAssignStatus as WaMessageAssignStatus)
  ) {
    return (
      <View style={{ paddingBottom: insets.bottom }}>
        {/* Design's unassigned banner: `--bg-warm-soft` with a `--warm-700`
            label and the icon leading. */}
        <View
          style={{
            flexDirection: "row",
            paddingVertical: 10,
            paddingHorizontal: 16,
            alignItems: "center",
            gap: 10,
            backgroundColor: t.warmSoft,
            borderBottomWidth: 1,
            borderBottomColor: t.border1,
          }}
        >
          <UserPlus color={t.warmStrong} size={15} />
          <Text
            style={{
              flex: 1,
              fontFamily: "InstrumentSans_600SemiBold",
              color: t.warmStrong,
              fontSize: 12,
            }}
          >
            Unassigned conversation
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
            gap: 10,
            flexWrap: "wrap",
            backgroundColor: t.surface2,
            borderBottomWidth: 1,
            borderBottomColor: t.border1,
          }}
        >
          <Info color={t.fg4} size={15} />
          <Text
            style={{
              flex: 1,
              fontFamily: "InstrumentSans_600SemiBold",
              color: t.fg3,
              fontSize: 12,
            }}
          >
            This chat is not assigned to you.
          </Text>
        </View>
      )}

      {currentUserAssignment && (
        <MessageSendPanel
          contactId={id}
          platform={platform}
          whatsappSettingsPhoneId={whatsappSettingsPhoneId}
          teamId={currentUserAssignment?.teamId || null}
        />
      )}
    </View>
  );
};

export default ChatFooter;
