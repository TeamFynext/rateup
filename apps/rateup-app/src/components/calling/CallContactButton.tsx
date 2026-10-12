import { useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, Text, TextInput, View } from "react-native";
import { useColorScheme } from "nativewind";
import { useQueryClient } from "@tanstack/react-query";
import { Phone } from "lucide-react-native";

import {
  callErrorCode,
  callErrorMessage,
  type CallPermissionState,
  getCallPermission,
  requestCallPermission,
} from "@/api/whatsapp/calling";
import { useWaSettings } from "@/api/whatsapp/template/whatsapp.query";
import { Toast } from "@/components/common/Notice";
import { Colors } from "@/constants/colors";
import { MessagePlatform } from "@/constants/enums";
import { getInboxRowTheme } from "@/constants/inboxDesign";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useGetAssignedUserForContact } from "@/api/inbox/messages/message.query";
import { useMessagesStore } from "@/store/inboxStore";
import { dial, useCallStore } from "@/store/callStore";
import { callingSupported } from "@/utils/callMedia";
import { findChannelAccount, getContactChannelSource } from "@/utils/chatbox_utils";

const permissionKey = (phoneId: string, contactId: string) =>
  ["wa-call-permission", phoneId, contactId] as const;

/**
 * Starting a call, shared by the chat header and the call history: WhatsApp only lets a
 * business call someone who has agreed to be called, so this checks first and, when there
 * is no permission yet, opens a sheet offering to send the request instead — the customer's
 * answer arrives in the thread as a reply.
 *
 * Render `sheet` once wherever the hook is used. `pendingFor` is the contact a call is being
 * started for, so a list can show its spinner on the right row.
 */
export function useStartCall() {
  const queryClient = useQueryClient();
  const [pendingFor, setPendingFor] = useState<string | null>(null);
  const [ask, setAsk] = useState<{
    phoneId: string;
    contactId: string;
    permission: CallPermissionState | null;
  } | null>(null);

  const start = async (target: {
    phoneId: string;
    contactId: string;
    name: string | null;
    phone: string | null;
  }) => {
    const { phoneId, contactId } = target;
    if (!phoneId) {
      Toast.error("Could not tell which WhatsApp number to call from");
      return;
    }
    if (pendingFor || useCallStore.getState().active) return;
    setPendingFor(contactId);
    try {
      const state = await queryClient.fetchQuery({
        queryKey: permissionKey(phoneId, contactId),
        queryFn: () => getCallPermission({ phoneId, contactId }),
        staleTime: 30_000,
      });
      if (!state.canCall) {
        setAsk({ phoneId, contactId, permission: state });
        return;
      }
      await dial({ phoneId, contactId, contactName: target.name, customerWaId: target.phone });
    } catch (error) {
      const code = callErrorCode(error);
      if (code === "call_permission_required") {
        await queryClient.invalidateQueries({ queryKey: permissionKey(phoneId, contactId) });
        setAsk({ phoneId, contactId, permission: null });
      } else if (code === "calling_disabled") {
        Toast.show({
          type: "warn",
          text1: "Calling is turned off for this WhatsApp number",
          text2:
            "An admin can turn it on in the dashboard: Settings → Channels → WhatsApp → Calling.",
        });
      } else {
        Toast.error(callErrorMessage(error, "Could not start the call"));
      }
    } finally {
      setPendingFor(null);
    }
  };

  const sheet = ask ? (
    <AskPermissionSheet
      key={`${ask.phoneId}:${ask.contactId}`}
      visible
      onClose={() => setAsk(null)}
      permission={ask.permission}
      phoneId={ask.phoneId}
      contactId={ask.contactId}
    />
  ) : null;

  return { start, pendingFor, sheet };
}

/** Calls the customer from the number this conversation runs on. */
export default function CallContactButton({
  contactId,
  name,
  phone,
  lastMessage,
  color,
}: Readonly<{
  contactId: string;
  name: string | null;
  phone: string | null;
  lastMessage?: NonNullable<Parameters<typeof getContactChannelSource>[0]>["lastMessage"];
  color: string;
}>) {
  const { can } = usePermissions();
  const onCall = useCallStore((s) => s.active !== null);
  const { start, pendingFor, sheet } = useStartCall();

  // The same lookup the composer makes: the number this thread runs on, never the org's
  // default — a call from a number the customer never used would be a stranger calling.
  const threadMessages = useMessagesStore((s) => s.messagesByKey.get(`${contactId}_all`)?.messages);
  const { platform, identifier } = useMemo(
    () => getContactChannelSource({ lastMessage, messages: threadMessages }),
    [lastMessage, threadMessages],
  );
  const { data: waSettings } = useWaSettings();
  const phoneId = useMemo(
    () =>
      platform === MessagePlatform.WHATSAPP
        ? (findChannelAccount(waSettings, platform, identifier)?.phoneId ?? "")
        : "",
    [waSettings, platform, identifier],
  );

  // A build without the calling native modules cannot place a call; show nothing rather
  // than a button that fails.
  if (!callingSupported) return null;
  if (!can("inbox.reply") || !phone || platform !== MessagePlatform.WHATSAPP) return null;

  const checking = pendingFor === contactId;
  return (
    <>
      <Pressable
        onPress={() => void start({ phoneId, contactId, name, phone })}
        disabled={checking || onCall}
        accessibilityRole="button"
        accessibilityLabel="Call on WhatsApp"
        style={{
          width: 34,
          height: 34,
          alignItems: "center",
          justifyContent: "center",
          opacity: onCall ? 0.4 : 1,
        }}
      >
        {checking ? (
          <ActivityIndicator size="small" color={color} />
        ) : (
          <Phone size={19} color={color} />
        )}
      </Pressable>
      {sheet}
    </>
  );
}

function AskPermissionSheet({
  visible,
  onClose,
  permission,
  phoneId,
  contactId,
}: Readonly<{
  visible: boolean;
  onClose: () => void;
  permission: CallPermissionState | null;
  phoneId: string;
  contactId: string;
}>) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const t = getInboxRowTheme(isDark);
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const { data: assignedUsers } = useGetAssignedUserForContact(contactId);
  const [body, setBody] = useState(
    "We'd like to call you on WhatsApp to help with your request. Is that okay?",
  );
  const [sending, setSending] = useState(false);
  // Meta allows one request a day and two a week per customer; past that it says no.
  const limitReached = permission !== null && !permission.canRequest;

  const send = async () => {
    setSending(true);
    try {
      const teamId =
        assignedUsers?.find((entry: { assignedUserId: string }) => entry.assignedUserId === userId)
          ?.teamId ?? null;
      await requestCallPermission({ phoneId, contactId, body: body.trim(), teamId });
      await queryClient.invalidateQueries({ queryKey: permissionKey(phoneId, contactId) });
      Toast.success("Permission request sent");
      onClose();
    } catch (error) {
      Toast.error(callErrorMessage(error, "Could not send the permission request"));
    } finally {
      setSending(false);
    }
  };

  const surface = isDark ? Colors.dark.surface : Colors.light.card;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}
      >
        {/* Swallows taps so pressing inside the sheet does not close it. */}
        <Pressable
          onPress={() => undefined}
          style={{
            backgroundColor: surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
            paddingBottom: 32,
            gap: 12,
          }}
        >
          <Text style={{ fontFamily: "Figtree_800ExtraBold", fontSize: 18, color: t.fg1 }}>
            Ask to call this customer
          </Text>
          <Text style={{ fontFamily: "InstrumentSans_400Regular", fontSize: 14, color: t.fg3 }}>
            {limitReached
              ? "WhatsApp allows one call request a day and two a week per customer. You can ask again later."
              : "WhatsApp needs the customer's permission before a business can call them. They'll get this message with an option to allow calls."}
          </Text>
          {!limitReached ? (
            <TextInput
              value={body}
              onChangeText={setBody}
              maxLength={1024}
              multiline
              accessibilityLabel="Message to the customer"
              style={{
                minHeight: 84,
                borderWidth: 1,
                borderColor: t.border1,
                borderRadius: 12,
                padding: 12,
                textAlignVertical: "top",
                fontFamily: "InstrumentSans_400Regular",
                fontSize: 14,
                color: t.fg1,
              }}
            />
          ) : null}
          <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10 }}>
            <Pressable onPress={onClose} style={{ paddingVertical: 10, paddingHorizontal: 16 }}>
              <Text style={{ fontFamily: "Figtree_700Bold", fontSize: 14, color: t.fg3 }}>
                {limitReached ? "Close" : "Cancel"}
              </Text>
            </Pressable>
            {!limitReached ? (
              <Pressable
                onPress={() => void send()}
                disabled={sending || !body.trim()}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 18,
                  borderRadius: 10,
                  backgroundColor: Colors.brand.blue,
                  opacity: sending || !body.trim() ? 0.6 : 1,
                }}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ fontFamily: "Figtree_700Bold", fontSize: 14, color: "#fff" }}>
                    Send request
                  </Text>
                )}
              </Pressable>
            ) : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
