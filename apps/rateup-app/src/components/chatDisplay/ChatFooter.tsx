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

const ChatFooter = ({ id }: { id: string }) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const t = getInboxRowTheme(isDark);
  const insets = useSafeAreaInsets();
  const waAssignStatus = useChatAssignStatusStore((state) => state.waAssignStatus);
  const { data: assignedUsers } = useGetAssignedUserForContact(id);
  const { userId } = useAuth();
  let currentUserAssignment = assignedUsers?.find((entry: any) => entry.assignedUserId == userId);
  const hasAssignedUsers = (assignedUsers?.length ?? 0) > 0;

  const selectedContact = useSelectedContactStore((s) => s.selectedContact);
  // Only this route's contact — the store may still hold the previously opened
  // one, and channel is what decides which business number the reply goes out on.
  const contact = selectedContact?.id === id ? selectedContact : undefined;

  // A chat opened by deep link has no `lastMessage`: `/api/contact/:id` returns
  // the bare contact row. The newest loaded message carries the same
  // `sourcePlatform`/`sourceIdentifier`, so it stands in. Without it the reply is
  // sent with an empty phoneId — from the wrong number, or not at all.
  const latestMessage = useMessagesStore((s) => s.messagesByKey.get(`${id}_all`)?.messages?.[0]);
  const sourceMessage = contact?.lastMessage ?? latestMessage;

  const platform = sourceMessage?.sourcePlatform || MessagePlatform.WHATSAPP;
  const { data: waSettings } = useWaSettings();

  const whatsappSettingsPhoneId = useMemo(() => {
    if (
      platform === MessagePlatform.INSTAGRAM ||
      platform === MessagePlatform.FACEBOOK ||
      platform === MessagePlatform.WEBCHAT
    ) {
      return sourceMessage?.sourceIdentifier;
    }
    // WhatsApp default
    return (
      waSettings?.find((s: any) => s?.phone === sourceMessage?.sourceIdentifier)?.phoneId || ""
    );
  }, [waSettings, platform, sourceMessage]);

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
              fontFamily: "Nunito_600SemiBold",
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
              fontFamily: "Nunito_600SemiBold",
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
