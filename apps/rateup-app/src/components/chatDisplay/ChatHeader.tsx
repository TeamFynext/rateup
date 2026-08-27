import { useColorScheme } from "nativewind";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Modal,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { generateInternalMessageId, namePreview } from "../../utils/chatbox_utils";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useChatAssignStatusStore, useSelectedContactStore } from "@/utils/store";
import AssignToUser from "./chatFooter/AssignToUser";
import { useContactsStore } from "@/store/inboxStore";
import {
  getInboxHeaderBg,
  getInboxRowTheme,
  inboxAvatarColors,
  inboxChannelColors,
  paletteIndex,
} from "@/constants/inboxDesign";
import {
  AlertCircle,
  Archive,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Circle,
  CircleCheckBig,
  MoreVertical,
  Pencil,
  Clock,
  Star,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { MessagePlatform } from "@/constants/enums";
import { FontAwesome } from "@expo/vector-icons";
import { useEditContactMutation, useToggleFavorite } from "@/api/inbox/contacts/contacts.query";
import { WaMessageAssignStatus } from "@/api/inbox/types";

const { width: screenWidth } = Dimensions.get("window");

const MoreOptions = ({
  visible,
  onClose,
  onCloseChatPress,
  contactId,
}: {
  visible: boolean;
  onClose: () => void;
  onCloseChatPress: () => void;
  contactId: string;
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const modalWidth = screenWidth * 0.4;
  const waAssignStatus = useChatAssignStatusStore((state) => state.waAssignStatus);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1" onPress={onClose}>
        <View
          style={{
            position: "absolute",
            right: 10,
            top: 55,
            borderRadius: 12,
            padding: 8,
            backgroundColor: isDark ? Colors.dark.surface : "#fff",
            borderWidth: 1,
            borderColor: isDark ? Colors.dark.borderLight : Colors.light.border,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.3 : 0.1,
            shadowRadius: 8,
            elevation: 5,
            width: modalWidth,
            alignItems: "flex-start",
          }}
        >
          <TouchableOpacity
            style={{ padding: 12, width: "100%" }}
            onPress={() => {
              onClose();
              router.push({
                pathname: "/protected/chat/Edit",
                params: { contactId },
              });
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Pencil
                color={isDark ? Colors.dark.textPrimary : Colors.light.textPrimary}
                size={18}
              />
              <Text
                style={{
                  fontFamily: "Nunito_600SemiBold",
                  color: isDark ? "#fff" : Colors.light.textPrimary,
                  fontSize: 15,
                }}
              >
                Edit
              </Text>
            </View>
          </TouchableOpacity>

          <AssignToUser contactId={contactId} iconSize={18} fontSize={15} plain />

          {waAssignStatus !== "CLOSED" ? (
            <TouchableOpacity
              style={{ padding: 12, width: "100%" }}
              onPress={() => {
                onClose();
                onCloseChatPress();
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <CircleCheckBig
                  color={isDark ? Colors.dark.textPrimary : Colors.light.textPrimary}
                  size={18}
                />
                <Text
                  style={{
                    fontFamily: "Nunito_600SemiBold",
                    color: isDark ? "#fff" : Colors.light.textPrimary,
                    fontSize: 15,
                  }}
                >
                  Close
                </Text>
              </View>
            </TouchableOpacity>
          ) : null}
        </View>
      </Pressable>
    </Modal>
  );
};

/**
 * The design's `RESULTS` sheet rows, mapped onto this inbox's real close
 * statuses. Icons are the app's existing status glyphs; the colours are the
 * design's status palette.
 */
const CLOSE_RESULTS = [
  {
    status: WaMessageAssignStatus.RESOLVED,
    label: "Resolved",
    Icon: CheckCircle2,
    color: "#16A34A",
  },
  {
    status: WaMessageAssignStatus.CLOSED,
    label: "Closed",
    Icon: Archive,
    color: Colors.brand.blue,
  },
  {
    status: WaMessageAssignStatus.UNRESOLVED,
    label: "Unresolved",
    Icon: Circle,
    color: "#F8951D",
  },
  {
    status: WaMessageAssignStatus.SPAM,
    label: "Spam",
    Icon: AlertCircle,
    color: "#DC2626",
  },
] as const;

const ConfirmationModal = ({
  visible,
  onCancel,
  contactId,
}: {
  visible: boolean;
  onCancel: () => void;
  contactId: string;
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const editContactMutation = useEditContactMutation();
  const setWaAssignStatus = useChatAssignStatusStore((state) => state.setWaAssignStatus);
  const selectedContact = useSelectedContactStore((state) => state.selectedContact);
  const setSelectedContact = useSelectedContactStore((state) => state.setSelectedContact);

  /** Which outcome is in flight, so only that row shows a spinner. */
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  const handleCloseChat = (status: string) => {
    const id = generateInternalMessageId();
    setPendingStatus(status);

    editContactMutation.mutate(
      {
        contactId,
        data: { waMessageAssignStatus: status, messageId: id },
      },
      {
        onSuccess: () => {
          // The inbox list reads from the contacts store (and its SQLite
          // mirror), not from react-query, so invalidating alone leaves the row
          // sitting in Open with its old status. Pushing the change through the
          // store rewrites the cached filter lists, moves the row to Closed and
          // persists both the contact and the lists.
          useContactsStore.getState().updateContactById(contactId, (c: any) => ({
            ...c,
            waMessageAssignStatus: status,
          }));
          // Keep the thread's own chrome in step — the footer and this menu both
          // branch on it.
          setWaAssignStatus(status);
          setSelectedContact(
            selectedContact && selectedContact.id === contactId
              ? { ...selectedContact, waMessageAssignStatus: status }
              : selectedContact,
          );

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
          // Cold store (deep link, or a tab never opened this session): nothing
          // to patch locally, so refetch the list instead.
          queryClient.invalidateQueries({ queryKey: ["contacts", "filtered"] });
          onCancel();
        },
        onSettled: () => setPendingStatus(null),
      },
    );
  };

  const t = getInboxRowTheme(isDark);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      {/* Design's bottom-sheet host: `rgba(8,28,63,0.5)` scrim over a panel
          rounded 22px at the top. */}
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable style={{ flex: 1 }} onPress={onCancel}>
          <View style={{ flex: 1, backgroundColor: "rgba(8,28,63,0.5)" }} />
        </Pressable>

        <View
          style={{
            backgroundColor: getInboxHeaderBg(isDark),
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            paddingBottom: insets.bottom,
            shadowColor: "#0B1F48",
            shadowOffset: { width: 0, height: -12 },
            shadowOpacity: 0.22,
            shadowRadius: 40,
            elevation: 16,
          }}
        >
          {/* Grabber */}
          <View
            style={{
              alignItems: "center",
              paddingTop: 10,
              paddingBottom: 4,
            }}
          >
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 9999,
                backgroundColor: isDark ? "rgba(255,255,255,0.24)" : "#D9DAD7",
              }}
            />
          </View>

          <Text
            style={{
              paddingTop: 8,
              paddingHorizontal: 20,
              paddingBottom: 4,
              fontFamily: "Nunito_800ExtraBold",
              fontSize: 17,
              color: t.fg1,
            }}
          >
            Close with result
          </Text>
          <Text
            style={{
              paddingHorizontal: 20,
              paddingBottom: 8,
              fontSize: 12,
              fontFamily: "Nunito_400Regular",
              color: t.fg3,
            }}
          >
            Pick an outcome — it&apos;s saved to the ticket.
          </Text>

          <View style={{ paddingTop: 8, paddingHorizontal: 12, paddingBottom: 22 }}>
            {CLOSE_RESULTS.map((r) => (
              <TouchableOpacity
                key={r.status}
                onPress={() => handleCloseChat(r.status)}
                disabled={editContactMutation.isPending}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingVertical: 13,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: t.border1,
                  marginBottom: 8,
                  // Dim the outcomes that aren't being submitted; the one that
                  // is keeps full opacity and shows its spinner.
                  opacity: editContactMutation.isPending && pendingStatus !== r.status ? 0.4 : 1,
                }}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    backgroundColor: t.surface2,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <r.Icon size={17} color={r.color} />
                </View>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 14,
                    fontFamily: "Nunito_700Bold",
                    color: t.fg1,
                  }}
                >
                  {r.label}
                </Text>
                {pendingStatus === r.status ? (
                  <ActivityIndicator size="small" color={r.color} />
                ) : (
                  <ChevronRight size={17} color={t.fg4} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const ChatHeader = ({
  id,
  name,
  phone,
  lastReceivedMessageTimeStamp,
}: {
  id: string;
  name: string;
  phone: number;
  lastReceivedMessageTimeStamp: any;
}) => {
  const router = useRouter();
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const contactId = id;
  const sessionExpiry = dayjs(lastReceivedMessageTimeStamp).add(24, "hour");
  const now = dayjs();
  const diffInMinutes = sessionExpiry.diff(now, "minute");
  const isSessionActive = diffInMinutes > 0;
  const selectedContact = useSelectedContactStore((state) => state.selectedContact);
  // Only trust the store while it describes this route's contact. It is global
  // and written only when an inbox row is tapped, so a chat reached any other way
  // (a notification deep link, a cold start) finds the *previous* contact there —
  // and `conversationId` below addresses the ticket the star is written to.
  const contact = selectedContact?.id === id ? selectedContact : undefined;
  // The star lives on the ticket, so read both from the row we opened. Prefer
  // the contacts store, which is what the toggle patches.
  const storedContact = useContactsStore((state) => state.contactsById.get(id));
  const conversationId = storedContact?.conversationId ?? contact?.conversationId;
  const isFavorite = storedContact?.isFavorite ?? contact?.isFavorite;
  const toggleFavorite = useToggleFavorite();
  const platform = contact?.lastMessage?.sourcePlatform || MessagePlatform.WHATSAPP;

  // Design: 8px white glyph inside the 15px channel dot.
  const renderPlatformIcon = () => {
    switch (platform) {
      case MessagePlatform.INSTAGRAM:
        return <FontAwesome name="instagram" size={9} color="#fff" />;
      case MessagePlatform.FACEBOOK:
        return <FontAwesome name="facebook" size={8} color="#fff" />;
      case MessagePlatform.WHATSAPP:
      default:
        return <FontAwesome name="whatsapp" size={9} color="#fff" />;
    }
  };
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const hoursLeft = Math.floor(diffInMinutes / 60);
  const minutesLeft = diffInMinutes % 60;

  const t = getInboxRowTheme(isDark);
  const avatarColor = inboxAvatarColors[paletteIndex(id, inboxAvatarColors.length)];
  const channelColor = inboxChannelColors[platform] ?? Colors.brand.blue;
  const sessionColor = isSessionActive ? t.warmStrong : t.danger;

  return (
    <View
      style={{
        backgroundColor: getInboxHeaderBg(isDark),
        borderBottomWidth: 1,
        borderBottomColor: t.border1,
      }}
    >
      {/* Design: `align-items:center; gap:10px; padding:8px 12px` */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingVertical: 8,
          paddingHorizontal: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 34,
            height: 34,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowLeft size={21} color={t.fg1} />
        </TouchableOpacity>

        {/* Avatar + name open the contact screen, matching the WhatsApp gesture
            of tapping the thread header. Wrapped together rather than made two
            separate targets so the whole block is one comfortable hit area. */}
        <TouchableOpacity
          activeOpacity={0.6}
          accessibilityRole="button"
          accessibilityLabel="Open contact info"
          onPress={() =>
            router.push({
              pathname: "/protected/chat/ContactInfo",
              params: { id: contactId },
            } as never)
          }
          style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, minWidth: 0 }}
        >
          {/* 36px avatar with the 15px channel dot */}
          <View style={{ position: "relative", alignSelf: "center" }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: avatarColor,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: "Nunito_800ExtraBold",
                  fontSize: 14,
                  color: "#fff",
                }}
              >
                {namePreview(name)}
              </Text>
            </View>
            <View
              style={{
                position: "absolute",
                bottom: -2,
                right: -2,
                width: 15,
                height: 15,
                borderRadius: 7.5,
                backgroundColor: channelColor,
                borderWidth: 2,
                borderColor: getInboxHeaderBg(isDark),
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {renderPlatformIcon()}
            </View>
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              numberOfLines={1}
              style={{
                fontSize: 15,
                fontFamily: "Nunito_800ExtraBold",
                color: t.fg1,
              }}
            >
              {formatName(name) || phone}
            </Text>
            <Text
              numberOfLines={1}
              style={{
                fontSize: 11,
                fontFamily: "Nunito_400Regular",
                color: t.fg4,
                marginTop: 1,
              }}
            >
              {platformLabel(platform)} · {phone}
            </Text>
          </View>
        </TouchableOpacity>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          {/* Design: 34x34 target, 19px star, `--warm-500` when starred and
              `--fg-4` when not. Hidden on rows that arrived without a ticket —
              the flag lives on the conversation, so there is nothing to set. */}
          {conversationId ? (
            <TouchableOpacity
              onPress={() =>
                toggleFavorite.mutate({
                  contactId: id,
                  conversationId,
                  isFavorite: !isFavorite,
                })
              }
              disabled={toggleFavorite.isPending}
              accessibilityRole="button"
              accessibilityState={{ selected: !!isFavorite }}
              accessibilityLabel={isFavorite ? "Remove from favourites" : "Add to favourites"}
              style={{
                width: 34,
                height: 34,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {toggleFavorite.isPending ? (
                <ActivityIndicator size="small" color={t.warm} />
              ) : (
                <Star
                  size={19}
                  color={isFavorite ? t.warm : t.fg4}
                  fill={isFavorite ? t.warm : "transparent"}
                />
              )}
            </TouchableOpacity>
          ) : null}
          <AssignToUser contactId={id} iconOnly iconSize={19} iconColor={t.fg3} />
          <TouchableOpacity
            onPress={() => setOptionsVisible(true)}
            style={{
              width: 34,
              height: 34,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MoreVertical size={19} color={t.fg3} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Ticket bar. The design carries the ticket code and subject here; this
          inbox surfaces the 24h session window, which is the equivalent
          at-a-glance state for the thread. */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingVertical: 8,
          paddingHorizontal: 16,
          backgroundColor: t.surface2,
          borderTopWidth: 1,
          borderTopColor: t.border1,
        }}
      >
        <Clock size={14} color={sessionColor} />
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontSize: 12.5,
            fontFamily: "Nunito_700Bold",
            color: sessionColor,
          }}
        >
          {isSessionActive ? `Session expires in ${hoursLeft}h ${minutesLeft}m` : "Session expired"}
        </Text>
      </View>

      <MoreOptions
        visible={optionsVisible}
        onClose={() => setOptionsVisible(false)}
        onCloseChatPress={() => setConfirmModalVisible(true)}
        contactId={contactId}
      />

      <ConfirmationModal
        contactId={contactId}
        visible={confirmModalVisible}
        onCancel={() => setConfirmModalVisible(false)}
      />
    </View>
  );
};

export default ChatHeader;

function formatName(name: string) {
  return name.length > 20 ? name.slice(0, 20) + "..." : name;
}

/** The design's `channelLabel`, shown beside the phone number. */
function platformLabel(platform: string) {
  switch (platform) {
    case MessagePlatform.INSTAGRAM:
      return "Instagram";
    case MessagePlatform.FACEBOOK:
      return "Facebook";
    case MessagePlatform.WEBCHAT:
      return "Web chat";
    default:
      return "WhatsApp";
  }
}
