import { useColorScheme } from "nativewind";
import { useMemo } from "react";
import { View, Text } from "react-native";
import NotAssigned from "./chatFooter/NotAssigned";
import MessageSendPanel from "./chatFooter/MessageSendPanel";
import { useAuth } from "@/context/AuthContext";
import {
  useChatAssignStatusStore,
  useSelectedContactStore,
} from "@/utils/store";
import { Info, UserPlus } from "lucide-react-native";
import { getInboxRowTheme } from "@/constants/inboxDesign";
import { MessagePlatform } from "@/constants/enums";
import { useWaSettings } from "@/api/whatsapp/template/whatsapp.query";
import { WaMessageClosedStatus } from "@/constants/constants";
import { WaMessageAssignStatus } from "@/api/inbox/types";
import { useGetAssignedUserForContact } from "@/api/inbox/messages/message.query";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ChatFooter = ({ id }: { id: string }) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const t = getInboxRowTheme(isDark);
  const insets = useSafeAreaInsets();
  const waAssignStatus = useChatAssignStatusStore(
    (state) => state.waAssignStatus,
  );
  const { data: assignedUsers } = useGetAssignedUserForContact(id);
  const { userId } = useAuth();
  let currentUserAssignment = assignedUsers?.find(
    (entry: any) => entry.assignedUserId == userId,
  );
  const hasAssignedUsers = (assignedUsers?.length ?? 0) > 0;

  const selectedContact = useSelectedContactStore((s) => s.selectedContact);
  const platform =
    selectedContact?.lastMessage?.sourcePlatform || MessagePlatform.WHATSAPP;
  const { data: waSettings } = useWaSettings();

  const whatsappSettingsPhoneId = useMemo(() => {
    if (
      platform === MessagePlatform.INSTAGRAM ||
      platform === MessagePlatform.FACEBOOK ||
      platform === MessagePlatform.WEBCHAT
    ) {
      return selectedContact?.lastMessage?.sourceIdentifier;
    }
    // WhatsApp default
    return (
      waSettings?.find(
        (s: any) => s?.phone === selectedContact?.lastMessage?.sourceIdentifier,
      )?.phoneId || ""
    );
  }, [waSettings, platform, selectedContact]);

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
          platform={platform}
          whatsappSettingsPhoneId={whatsappSettingsPhoneId}
          teamId={currentUserAssignment?.teamId || null}
        />
      )}
    </View>
  );
};

export default ChatFooter;
