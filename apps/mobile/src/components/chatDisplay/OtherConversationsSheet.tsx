import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import dayjs from "dayjs";
import { ChevronRight, X } from "lucide-react-native";
import { getInboxRowTheme } from "@/constants/inboxDesign";
import { WaMessageClosedStatus } from "@/constants/constants";
import { WaMessageAssignStatus } from "@/api/inbox/types";
import { useContactConversations } from "@/api/inbox/tickets/tickets.query";
import type { ContactConversation } from "@/api/inbox/tickets/tickets.api";
import { useContactsStore } from "@/store/inboxStore";
import { useSelectedContactStore } from "@/utils/store";
import { isSessionWindowOpen } from "@/utils/sessionWindow";

const STATUS_LABEL: Record<string, string> = {
  RESOLVED: "Resolved",
  UNRESOLVED: "Unresolved",
  CLOSED: "Closed",
  SPAM: "Spam",
  ASSIGNED: "Open",
  UNASSIGNED: "Unassigned",
  NEW: "New",
};

/** The status a ticket shows with: closed ones as they are, open ones by their assignees. */
function ticketStatus(c: ContactConversation): string {
  if (WaMessageClosedStatus.includes(c.status as WaMessageAssignStatus)) return c.status;
  return c.assignedUsers?.length
    ? WaMessageAssignStatus.ASSIGNED
    : WaMessageAssignStatus.UNASSIGNED;
}

/**
 * The contact's other tickets (the web's "N other conversations"). Tapping one shows it
 * in this chat: the thread reloads for that ticket, the same as opening its inbox row.
 */
export default function OtherConversationsSheet({
  visible,
  contactId,
  currentConversationId,
  onClose,
}: {
  visible: boolean;
  contactId: string;
  currentConversationId?: string | null;
  onClose: () => void;
}) {
  const isDark = useColorScheme() === "dark";
  const t = getInboxRowTheme(isDark);
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useContactConversations(contactId, visible);
  const others = (data ?? []).filter((c) => c.id !== currentConversationId);

  const open = (c: ContactConversation) => {
    const { selectedContact, setSelectedContact } = useSelectedContactStore.getState();
    // Prefer the ticket's inbox row when the list has it: it carries everything.
    const cached: any = useContactsStore.getState().contactsById.get(c.id);
    if (cached) {
      setSelectedContact({ ...cached, sessionActive: isSessionWindowOpen(cached) });
    } else if (selectedContact) {
      setSelectedContact({
        ...selectedContact,
        conversationId: c.id,
        ticketNumber: c.number,
        ticketSubject: c.subject,
        ticketDescription: c.description,
        resolutionResult: c.resolutionResult,
        conversationStatus: c.status,
        waMessageAssignStatus: ticketStatus(c),
        assignedUsers: c.assignedUsers,
        ticketCreatedAt: c.createdAt,
        unReadMessageCount: 0,
      });
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
        onPress={onClose}
        accessibilityLabel="Close"
      />
      <View
        style={{
          maxHeight: "75%",
          backgroundColor: t.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingTop: 14,
          paddingBottom: insets.bottom + 12,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingBottom: 10,
          }}
        >
          <Text style={{ color: t.fg1, fontSize: 17, fontFamily: "Figtree_800ExtraBold" }}>
            Other conversations
          </Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
            <X size={22} color={t.fg3} />
          </Pressable>
        </View>
        {isLoading ? (
          <ActivityIndicator style={{ marginVertical: 24 }} color={t.fg3} />
        ) : others.length === 0 ? (
          <Text style={{ color: t.fg3, fontSize: 14, paddingHorizontal: 16, paddingVertical: 20 }}>
            No other conversations with this customer.
          </Text>
        ) : (
          <ScrollView>
            {others.map((c) => {
              const status = ticketStatus(c);
              return (
                <Pressable
                  key={c.id}
                  onPress={() => open(c)}
                  accessibilityRole="button"
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderTopWidth: 1,
                    borderTopColor: t.border1,
                  }}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text
                        style={{ color: t.fg1, fontSize: 14, fontFamily: "InstrumentSans_700Bold" }}
                      >
                        #RT-{c.number}
                      </Text>
                      <Text style={{ color: t.fg3, fontSize: 12 }}>
                        {STATUS_LABEL[status] ?? status}
                      </Text>
                    </View>
                    {c.subject ? (
                      <Text numberOfLines={1} style={{ color: t.fg2, fontSize: 13 }}>
                        {c.subject}
                      </Text>
                    ) : null}
                    <Text style={{ color: t.fg4, fontSize: 12 }}>
                      {dayjs(c.lastMessageAt ?? c.createdAt).format("D MMM YYYY")} ·{" "}
                      {c.messageCount} {c.messageCount === 1 ? "message" : "messages"}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={t.fg4} />
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}
