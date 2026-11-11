import { useColorScheme } from "nativewind";
import { ActivityIndicator, Alert, Pressable, View, Text } from "react-native";
import NotAssigned from "./chatFooter/NotAssigned";
import MessageSendPanel from "./chatFooter/MessageSendPanel";
import { useChatChannel } from "./useChatChannel";
import { useTicketRow } from "./useTicketRow";
import { Archive, Ban, Info, ShieldAlert, UserPlus, type LucideIcon } from "lucide-react-native";
import { WaMessageAssignStatus } from "@/api/inbox/types";
import { getInboxRowTheme } from "@/constants/inboxDesign";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Skeleton, SkeletonCircle } from "@/components/common/Skeleton";
import { Colors } from "@/constants/colors";
import { MessagePlatform } from "@/constants/enums";
import { usePermissions } from "@/hooks/usePermissions";
import {
  useReopenTicket,
  useSetContactSpam,
  useSetWhatsAppBlocked,
} from "@/api/inbox/tickets/tickets.query";

/** The closed-chat banner's text: how it was closed. */
function closedLabel(status: string) {
  return status === WaMessageAssignStatus.SPAM
    ? "Marked as spam"
    : status === WaMessageAssignStatus.RESOLVED
      ? "Conversation resolved"
      : status === WaMessageAssignStatus.UNRESOLVED
        ? "Closed as unresolved"
        : "Conversation closed";
}

/** A footer banner with an icon, a line of text and an optional action on the right. */
function FooterBanner({
  Icon,
  text,
  tone,
  action,
}: {
  Icon: LucideIcon;
  text: string;
  tone: { bg: string; fg: string };
  action?: { label: string; onPress: () => void; pending?: boolean };
}) {
  const t = getInboxRowTheme(useColorScheme().colorScheme === "dark");
  return (
    <View
      style={{
        flexDirection: "row",
        paddingVertical: 10,
        paddingHorizontal: 16,
        alignItems: "center",
        gap: 10,
        backgroundColor: tone.bg,
        borderBottomWidth: 1,
        borderBottomColor: t.border1,
      }}
    >
      <Icon color={tone.fg} size={15} />
      <Text
        style={{ flex: 1, fontFamily: "InstrumentSans_600SemiBold", color: tone.fg, fontSize: 12 }}
      >
        {text}
      </Text>
      {action ? (
        <Pressable
          onPress={action.onPress}
          disabled={action.pending}
          accessibilityRole="button"
          hitSlop={8}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 8,
            backgroundColor: Colors.brand.blue,
            minWidth: 64,
            alignItems: "center",
          }}
        >
          {action.pending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontSize: 12, fontFamily: "InstrumentSans_700Bold" }}>
              {action.label}
            </Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const ChatFooter = ({ id }: { id: string }) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const t = getInboxRowTheme(isDark);
  const insets = useSafeAreaInsets();
  const {
    platform,
    whatsappSettingsPhoneId,
    teamId,
    assignmentLoading,
    hasAssignedUsers,
    currentUserAssignment,
    isOpen,
    isClosed,
    waAssignStatus,
  } = useChatChannel(id);
  const row = useTicketRow(id);
  const { can } = usePermissions();
  const reopen = useReopenTicket();
  const setSpam = useSetContactSpam();
  const setBlocked = useSetWhatsAppBlocked();
  const neutral = { bg: t.surface2, fg: t.fg3 };

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

  const waAddress = row?.phone || row?.bsuid || "";
  if (row?.blockedOnWhatsApp && platform === MessagePlatform.WHATSAPP) {
    return (
      <View style={{ paddingBottom: insets.bottom }}>
        <FooterBanner
          Icon={Ban}
          text="You blocked this contact on WhatsApp. Neither of you can message the other."
          tone={neutral}
          action={
            can("inbox.manage") && waAddress
              ? {
                  label: "Unblock",
                  pending: setBlocked.isPending,
                  onPress: () =>
                    Alert.alert(
                      "Unblock this contact?",
                      "They will be able to message you again.",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Unblock",
                          onPress: () =>
                            setBlocked.mutate({
                              contactId: id,
                              address: waAddress,
                              blocked: false,
                            }),
                        },
                      ],
                    ),
                }
              : undefined
          }
        />
      </View>
    );
  }

  if (row?.isSpam) {
    return (
      <View style={{ paddingBottom: insets.bottom }}>
        <FooterBanner
          Icon={ShieldAlert}
          text="This contact is marked as spam."
          tone={neutral}
          action={
            can("inbox.manage")
              ? {
                  label: "Not spam",
                  pending: setSpam.isPending,
                  onPress: () => setSpam.mutate({ contactId: id, isSpam: false }),
                }
              : undefined
          }
        />
      </View>
    );
  }

  if (!isOpen) {
    return (
      <View style={{ paddingBottom: insets.bottom }}>
        {/* Design's unassigned banner: `--bg-warm-soft` with a `--warm-700`
            label and the icon leading. A closed chat gets a neutral one that says
            how it was closed, with Reopen; assigning it (below) reopens it too. */}
        {isClosed ? (
          <FooterBanner
            Icon={Archive}
            text={closedLabel(waAssignStatus)}
            tone={neutral}
            action={{
              label: "Reopen",
              pending: reopen.isPending,
              onPress: () => reopen.mutate({ contactId: id, conversationId: row?.conversationId }),
            }}
          />
        ) : (
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
        )}
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
          teamId={teamId}
        />
      )}
    </View>
  );
};

export default ChatFooter;
