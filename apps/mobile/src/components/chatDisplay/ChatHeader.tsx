import { useColorScheme } from "nativewind";
import { View, Text, Pressable, Modal, Dimensions, ActivityIndicator, Alert } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  generateInternalMessageId,
  getContactChannelSource,
  namePreview,
} from "../../utils/chatbox_utils";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useChatAssignStatusStore, useSelectedContactStore } from "@/utils/store";
import AssignToUser from "./chatFooter/AssignToUser";
import CallContactButton from "@/components/calling/CallContactButton";
import { selectRowForContact, useContactsStore, useMessagesStore } from "@/store/inboxStore";
import {
  getInboxHeaderBg,
  getInboxRowTheme,
  inboxAvatarColors,
  inboxChannelColors,
  paletteIndex,
} from "@/constants/inboxDesign";
import {
  Ban,
  History,
  LockOpen,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
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
import { Skeleton, SkeletonCircle } from "@/components/common/Skeleton";
import { MessagePlatform } from "@/constants/enums";
import { FontAwesome } from "@expo/vector-icons";
import { useEditContactMutation, useToggleFavorite } from "@/api/inbox/contacts/contacts.query";
import { WaMessageAssignStatus } from "@/api/inbox/types";
import { WaMessageClosedStatus } from "@/constants/constants";
import { useModerateInstagramContact } from "@/api/inbox/messages/message.query";
import { contactMessagingWindow, messagingWindowLabel } from "@/utils/messagingWindow";
import MetaAgentThreadBadge from "./MetaAgentThreadBadge";
import OtherConversationsSheet from "./OtherConversationsSheet";
import { usePermissions } from "@/hooks/usePermissions";
import { Toast } from "@/components/common/Notice";
import {
  useClearMentions,
  useDeleteConversation,
  useReopenTicket,
  useSetContactSpam,
  useSetWhatsAppBlocked,
} from "@/api/inbox/tickets/tickets.query";

const { width: screenWidth } = Dimensions.get("window");

/** Instagram's own block and spam folder for this person (Moderate Conversations API). */
const InstagramModerationItems = ({
  contactId,
  blocked,
  isSpam,
  onClose,
}: {
  contactId: string;
  blocked: boolean;
  isSpam: boolean;
  onClose: () => void;
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const moderate = useModerateInstagramContact();
  const textColor = isDark ? "#fff" : Colors.light.textPrimary;
  const iconColor = isDark ? Colors.dark.textPrimary : Colors.light.textPrimary;

  const confirmThen = (title: string, message: string, label: string, run: () => void) =>
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: label, style: "destructive", onPress: run },
    ]);

  const row = (label: string, Icon: typeof Ban, onPress: () => void, color = textColor) => (
    <Pressable
      key={label}
      style={{ padding: 12, width: "100%" }}
      onPress={() => {
        onClose();
        onPress();
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Icon color={color === textColor ? iconColor : color} size={18} />
        <Text style={{ fontFamily: "InstrumentSans_600SemiBold", color, fontSize: 15 }}>
          {label}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <>
      {blocked
        ? row("Unblock", LockOpen, () => moderate.mutate({ contactId, action: "unblock" }))
        : row(
            "Block",
            Ban,
            () =>
              confirmThen(
                "Block on Instagram?",
                "They won't be able to message your Instagram account, and you won't be able to message them until you unblock them.",
                "Block",
                () => moderate.mutate({ contactId, action: "block" }),
              ),
            "#DC2626",
          )}
      {!isSpam &&
        row("Spam", ShieldAlert, () =>
          confirmThen(
            "Move to spam?",
            "The conversation moves to the spam folder on Instagram, and the contact is marked as spam here.",
            "Move to spam",
            () => moderate.mutate({ contactId, action: "spam" }),
          ),
        )}
    </>
  );
};

type MenuItem = {
  key: string;
  label: string;
  Icon: typeof Ban;
  onPress: () => void;
  destructive?: boolean;
};

const MoreOptions = ({
  visible,
  onClose,
  onCloseChatPress,
  contactId,
  instagram,
  items = [],
  canClose = true,
}: {
  visible: boolean;
  onClose: () => void;
  onCloseChatPress: () => void;
  contactId: string;
  /** Set on an Instagram thread: adds Block / Unblock and Spam. */
  instagram?: { blocked: boolean; isSpam: boolean };
  /** Ticket actions: reopen, spam, block, delete. */
  items?: MenuItem[];
  /** Closing needs `contacts.manage` on the server. */
  canClose?: boolean;
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const modalWidth = Math.min(260, screenWidth * 0.62);
  const insets = useSafeAreaInsets();
  const waAssignStatus = useChatAssignStatusStore((state) => state.waAssignStatus);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1" onPress={onClose}>
        <View
          style={{
            position: "absolute",
            right: 10,
            // Below the status bar or notch, whose height differs on every phone.
            top: insets.top + 40,
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
          <Pressable
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
                  fontFamily: "InstrumentSans_600SemiBold",
                  color: isDark ? "#fff" : Colors.light.textPrimary,
                  fontSize: 15,
                }}
              >
                Edit
              </Text>
            </View>
          </Pressable>

          <AssignToUser contactId={contactId} iconSize={18} fontSize={15} plain />

          {instagram && (
            <InstagramModerationItems
              contactId={contactId}
              blocked={instagram.blocked}
              isSpam={instagram.isSpam}
              onClose={onClose}
            />
          )}

          {items.map((item) => (
            <Pressable
              key={item.key}
              style={{ padding: 12, width: "100%" }}
              onPress={() => {
                onClose();
                item.onPress();
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <item.Icon
                  color={
                    item.destructive
                      ? "#DC2626"
                      : isDark
                        ? Colors.dark.textPrimary
                        : Colors.light.textPrimary
                  }
                  size={18}
                />
                <Text
                  style={{
                    fontFamily: "InstrumentSans_600SemiBold",
                    color: item.destructive
                      ? "#DC2626"
                      : isDark
                        ? "#fff"
                        : Colors.light.textPrimary,
                    fontSize: 15,
                  }}
                >
                  {item.label}
                </Text>
              </View>
            </Pressable>
          ))}

          {canClose && !WaMessageClosedStatus.includes(waAssignStatus as WaMessageAssignStatus) ? (
            <Pressable
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
                    fontFamily: "InstrumentSans_600SemiBold",
                    color: isDark ? "#fff" : Colors.light.textPrimary,
                    fontSize: 15,
                  }}
                >
                  Close
                </Text>
              </View>
            </Pressable>
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
// The web's two outcomes. Spam is its own action (it is contact-wide and closes every
// ticket), so it is in the menu, not here.
const CLOSE_RESULTS = [
  {
    status: WaMessageAssignStatus.RESOLVED,
    label: "Resolved",
    Icon: CheckCircle2,
    color: "#16A34A",
  },
  {
    status: WaMessageAssignStatus.UNRESOLVED,
    label: "Unresolved",
    Icon: Circle,
    color: "#F8951D",
  },
] as const;

const ConfirmationModal = ({
  visible,
  onCancel,
  contactId,
  conversationId,
}: {
  visible: boolean;
  onCancel: () => void;
  contactId: string;
  /** The ticket to close. Without it the server closes the contact's newest ticket. */
  conversationId?: string | null;
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
        data: {
          waMessageAssignStatus: status,
          resolutionResult: null,
          messageId: id,
          ...(conversationId ? { conversationId } : {}),
        },
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
        onError: (err: any) =>
          Toast.error(
            err?.response?.status === 403
              ? "You don't have permission to close tickets."
              : "Couldn't close the ticket.",
          ),
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
              fontFamily: "Figtree_800ExtraBold",
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
              fontFamily: "InstrumentSans_400Regular",
              color: t.fg3,
            }}
          >
            Pick an outcome — it&apos;s saved to the ticket.
          </Text>

          <View style={{ paddingTop: 8, paddingHorizontal: 12, paddingBottom: 22 }}>
            {CLOSE_RESULTS.map((r) => (
              <Pressable
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
                    fontFamily: "InstrumentSans_700Bold",
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
              </Pressable>
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
  loading = false,
}: {
  id: string;
  name: string;
  phone: number;
  lastReceivedMessageTimeStamp: any;
  /** No contact yet: neither the cache nor the request has answered. */
  loading?: boolean;
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
  const storedContact = useContactsStore((state) =>
    selectRowForContact(state, id, contact?.conversationId),
  );
  const conversationId = contact?.conversationId ?? storedContact?.conversationId;
  const isFavorite = storedContact?.isFavorite ?? contact?.isFavorite;
  // Ticket and contact flags, from the live row when the list has it.
  const row = storedContact ?? contact;
  const [othersVisible, setOthersVisible] = useState(false);
  const { can } = usePermissions();
  const reopen = useReopenTicket();
  const setSpam = useSetContactSpam();
  const setBlocked = useSetWhatsAppBlocked();
  const deleteTicket = useDeleteConversation();
  const clearMentions = useClearMentions();
  const waAssignStatus = useChatAssignStatusStore((state) => state.waAssignStatus);
  const isClosed = WaMessageClosedStatus.includes(waAssignStatus as WaMessageAssignStatus);

  // Opening the chat is reading the mention, so it is cleared here (the web has a button).
  const mentionCount = row?.mentionCount ?? 0;
  useEffect(() => {
    if (mentionCount > 0 && id) clearMentions.mutate({ contactId: id, conversationId });
    // Once per ticket opened with mentions; the mutation object changes every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, conversationId, mentionCount > 0]);
  const toggleFavorite = useToggleFavorite();
  // A private note as the last message has `sourcePlatform: "INTERNAL"`, which
  // painted an Instagram thread as WhatsApp. The loaded thread stands in for a
  // deep-linked contact, which arrives without `lastMessage`.
  const threadMessages = useMessagesStore((s) => s.messagesByKey.get(`${id}_all`)?.messages);
  const { platform } = getContactChannelSource({
    lastMessage: storedContact?.lastMessage ?? contact?.lastMessage,
    messages: threadMessages,
    igsId: contact?.igsId ?? storedContact?.igsId,
    psid: contact?.psid ?? storedContact?.psid,
  });

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
  // Instagram/Messenger: a person may reply for 7 days, so the 24 h session is not the limit.
  const metaWindow = contactMessagingWindow(
    {
      lastReceivedMessageTimeStamp,
      adThreadUntil: storedContact?.adThreadUntil ?? contact?.adThreadUntil,
    },
    platform,
  );
  const sessionColor = (metaWindow ? metaWindow.state !== "closed" : isSessionActive)
    ? t.warmStrong
    : t.danger;

  const who = name || (phone ? String(phone) : "this contact");
  const confirm = (title: string, message: string, label: string, run: () => void) =>
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: label, style: "destructive", onPress: run },
    ]);
  const isSpam = !!row?.isSpam;
  const blockedOnWhatsApp = !!row?.blockedOnWhatsApp;
  const waAddress = row?.phone || row?.bsuid || "";
  const menuItems: MenuItem[] = [];
  if (isClosed && !isSpam) {
    menuItems.push({
      key: "reopen",
      label: "Reopen",
      Icon: RotateCcw,
      onPress: () => reopen.mutate({ contactId: id, conversationId }),
    });
  }
  if (can("inbox.manage")) {
    if (isSpam) {
      menuItems.push({
        key: "not-spam",
        label: "Not spam",
        Icon: ShieldCheck,
        onPress: () =>
          confirm("Remove from spam?", `Are you sure ${who} is not spam?`, "Not spam", () =>
            setSpam.mutate({ contactId: id, isSpam: false }),
          ),
      });
    } else if (platform !== MessagePlatform.INSTAGRAM) {
      // Instagram has its own spam folder, in the Instagram items above.
      menuItems.push({
        key: "spam",
        label: "Mark as spam",
        Icon: ShieldAlert,
        onPress: () =>
          confirm(
            `Mark ${who} as spam?`,
            "Their open tickets will be closed, and the contact will be hidden from every inbox tab except Spam.",
            "Mark as spam",
            () => setSpam.mutate({ contactId: id, isSpam: true }),
          ),
      });
    }
    if (platform === MessagePlatform.WHATSAPP && waAddress) {
      if (blockedOnWhatsApp) {
        menuItems.push({
          key: "unblock",
          label: "Unblock on WhatsApp",
          Icon: LockOpen,
          onPress: () =>
            confirm(`Unblock ${who}?`, "They will be able to message you again.", "Unblock", () =>
              setBlocked.mutate({ contactId: id, address: waAddress, blocked: false }),
            ),
        });
      } else if (isSessionActive) {
        // WhatsApp only lets a business block someone who wrote in the last 24 hours.
        menuItems.push({
          key: "block",
          label: "Block on WhatsApp",
          Icon: Ban,
          destructive: true,
          onPress: () =>
            confirm(
              `Block ${who}?`,
              "They won't be able to message you, and you won't be able to message them.",
              "Block",
              () => setBlocked.mutate({ contactId: id, address: waAddress, blocked: true }),
            ),
        });
      }
    }
  }
  if (can("inbox.delete") && conversationId) {
    menuItems.push({
      key: "delete",
      label: "Delete conversation",
      Icon: Trash2,
      destructive: true,
      onPress: () =>
        confirm(
          "Delete conversation?",
          `${row?.ticketNumber ? `Ticket #RT-${row.ticketNumber}` : "This conversation"} with ${who} and every message in it will be deleted for everyone. This cannot be undone.`,
          "Delete",
          () =>
            deleteTicket.mutate(
              { contactId: id, conversationId },
              { onSuccess: () => router.back() },
            ),
        ),
    });
  }
  const otherTickets = row?.otherTicketCount ?? 0;

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
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 34,
            height: 34,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowLeft size={21} color={t.fg1} />
        </Pressable>

        {/* Avatar + name open the contact screen, matching the WhatsApp gesture
            of tapping the thread header. Wrapped together rather than made two
            separate targets so the whole block is one comfortable hit area. */}
        <Pressable
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
            {loading ? (
              // The initials come from the name, so an un-hydrated contact
              // renders a coloured circle with nothing in it.
              <SkeletonCircle size={36} />
            ) : (
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
                    fontFamily: "Figtree_800ExtraBold",
                    fontSize: 14,
                    color: "#fff",
                  }}
                >
                  {namePreview(name)}
                </Text>
              </View>
            )}
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
            {loading ? (
              // Without this the header prints the `phone` fallback while the
              // contact is still unknown, which is literally "0" and
              // "WhatsApp · 0". Sized to the real lines so nothing shifts when
              // the name arrives.
              <>
                <Skeleton width="55%" height={13} style={{ marginVertical: 2 }} />
                <Skeleton width="38%" height={9} style={{ marginTop: 4 }} />
              </>
            ) : (
              <>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      flexShrink: 1,
                      fontSize: 15,
                      fontFamily: "Figtree_800ExtraBold",
                      color: t.fg1,
                    }}
                  >
                    {formatName(name) || phone}
                  </Text>
                  {/* Meta AI or staff, WhatsApp only (the agent answers no other channel); read
                      from the live row, which handovers patch. */}
                  {platform === MessagePlatform.WHATSAPP ? (
                    <MetaAgentThreadBadge row={storedContact ?? contact} />
                  ) : null}
                  {/* Only when the row says so: an unknown `consent` shows nothing. */}
                  {row?.consent === false ? (
                    <View
                      accessibilityLabel="No consent: this contact has not agreed to receive template messages"
                      style={{
                        paddingHorizontal: 6,
                        paddingVertical: 1,
                        borderRadius: 6,
                        backgroundColor: t.surface2,
                        borderWidth: 1,
                        borderColor: t.border1,
                      }}
                    >
                      <Text
                        style={{ fontSize: 10, fontFamily: "InstrumentSans_700Bold", color: t.fg3 }}
                      >
                        DND
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 11,
                    fontFamily: "InstrumentSans_400Regular",
                    color: t.fg4,
                    marginTop: 1,
                  }}
                >
                  {platformLabel(platform)} · {phone}
                </Text>
              </>
            )}
          </View>
        </Pressable>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <CallContactButton
            contactId={id}
            name={name || null}
            phone={phone ? String(phone) : null}
            lastMessage={storedContact?.lastMessage ?? contact?.lastMessage}
            color={t.fg3}
          />
          {/* Design: 34x34 target, 19px star, `--warm-500` when starred and
              `--fg-4` when not. Hidden on rows that arrived without a ticket —
              the flag lives on the conversation, so there is nothing to set. */}
          {conversationId ? (
            <Pressable
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
              accessibilityLabel={isFavorite ? "Unstar" : "Star"}
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
            </Pressable>
          ) : null}
          <AssignToUser contactId={id} iconOnly iconSize={19} iconColor={t.fg3} />
          <Pressable
            onPress={() => setOptionsVisible(true)}
            style={{
              width: 34,
              height: 34,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MoreVertical size={19} color={t.fg3} />
          </Pressable>
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
            fontFamily: "InstrumentSans_700Bold",
            color: sessionColor,
          }}
        >
          {metaWindow
            ? messagingWindowLabel(metaWindow)
            : isSessionActive
              ? `Session expires in ${hoursLeft}h ${minutesLeft}m`
              : "Session expired"}
        </Text>
        {otherTickets > 0 ? (
          <Pressable
            onPress={() => setOthersVisible(true)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`${otherTickets} other conversations with this customer`}
            style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
          >
            <History size={13} color={t.fg3} />
            <Text style={{ fontSize: 12, fontFamily: "InstrumentSans_600SemiBold", color: t.fg3 }}>
              {otherTickets} other
            </Text>
          </Pressable>
        ) : null}
      </View>

      <MoreOptions
        visible={optionsVisible}
        onClose={() => setOptionsVisible(false)}
        onCloseChatPress={() => setConfirmModalVisible(true)}
        contactId={contactId}
        items={menuItems}
        canClose={can("contacts.manage")}
        instagram={
          platform === MessagePlatform.INSTAGRAM
            ? {
                blocked: !!(storedContact?.igBlockedAt ?? contact?.igBlockedAt),
                isSpam: !!(storedContact?.isSpam ?? contact?.isSpam),
              }
            : undefined
        }
      />

      <ConfirmationModal
        contactId={contactId}
        conversationId={conversationId}
        visible={confirmModalVisible}
        onCancel={() => setConfirmModalVisible(false)}
      />

      <OtherConversationsSheet
        visible={othersVisible}
        contactId={contactId}
        currentConversationId={conversationId}
        onClose={() => setOthersVisible(false)}
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
