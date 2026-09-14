import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import dayjs from "dayjs";
import { ArrowLeft, Check, Copy, Pencil, User, Phone } from "lucide-react-native";
import { Toast } from "@/components/common/Notice";
import {
  getInboxHeaderBg,
  getInboxRowTheme,
  inboxAvatarColors,
  inboxChannelColors,
  paletteIndex,
} from "@/constants/inboxDesign";
import { MessagePlatform } from "@/constants/enums";
import { getContactChannelSource, namePreview } from "@/utils/chatbox_utils";
import { useMessagesStore } from "@/store/inboxStore";
import { useSelectedContactStore } from "@/utils/store";
import { useContactById } from "@/api/inbox/contacts/contacts.query";
import { useGetAssignedUserForContact } from "@/api/inbox/messages/message.query";
import AssignToUser from "@/components/chatDisplay/chatFooter/AssignToUser";

/** Mirrors the header's `channelLabel`, shown beside the number. */
function platformLabel(platform?: string) {
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

/**
 * Group a bare digit string into something readable without pretending to know
 * the country's grouping rules — `919400651372` becomes `+91 94006 51372`.
 * Anything that is not a plain number is shown untouched rather than mangled.
 */
function formatPhone(phone?: string | null) {
  if (!phone) return "";
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.length < 10) return phone;
  const cc = digits.slice(0, digits.length - 10);
  const rest = digits.slice(-10);
  return `${cc ? `+${cc} ` : ""}${rest.slice(0, 5)} ${rest.slice(5)}`;
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  const isDark = useColorScheme() === "dark";
  const t = getInboxRowTheme(isDark);
  return (
    <View style={{ marginTop: 22 }}>
      <Text
        style={{
          fontSize: 11,
          fontFamily: "Nunito_700Bold",
          color: t.fg4,
          letterSpacing: 0.8,
          marginBottom: 8,
          marginLeft: 4,
        }}
      >
        {label.toUpperCase()}
      </Text>
      <View
        style={{
          backgroundColor: t.surface2,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: t.border1,
          paddingHorizontal: 14,
          paddingVertical: 4,
        }}
      >
        {children}
      </View>
    </View>
  );
}

function InfoRow({
  label,
  value,
  icon,
  action,
  last,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  last?: boolean;
}) {
  const isDark = useColorScheme() === "dark";
  const t = getInboxRowTheme(isDark);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: t.rowDivider,
      }}
    >
      {icon ? <View style={{ width: 18, alignItems: "center" }}>{icon}</View> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 11, fontFamily: "Nunito_400Regular", color: t.fg4 }}>{label}</Text>
        {typeof value === "string" ? (
          <Text
            numberOfLines={1}
            style={{
              fontSize: 14,
              fontFamily: "Nunito_600SemiBold",
              color: t.fg1,
              marginTop: 2,
            }}
          >
            {value || "—"}
          </Text>
        ) : (
          <View style={{ marginTop: 2 }}>{value}</View>
        )}
      </View>
      {action}
    </View>
  );
}

const ContactInfo = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  const isDark = useColorScheme() === "dark";
  const t = getInboxRowTheme(isDark);

  const id = Array.isArray(params.id) ? params.id[0] : (params.id ?? "");

  // The store is populated by whichever row was opened, but a cold start or a
  // notification deep link into the chat leaves it empty or holding a different
  // contact — so it is only trusted when it describes this one, exactly as the
  // chat screen does.
  const selectedContact = useSelectedContactStore((s) => s.selectedContact);
  const stored = selectedContact?.id === id ? selectedContact : undefined;
  const { data: fetched, isLoading } = useContactById(id);
  const contact: any = fetched ?? stored;

  const { data: assignedUsers } = useGetAssignedUserForContact(id);

  const [copied, setCopied] = useState(false);

  const name = contact?.name || contact?.whatsappUserName || contact?.phone || "";
  const phone = contact?.phone as string | undefined;
  // Same resolution as the header — reading `lastMessage.sourcePlatform` directly
  // turned a private note into an "INTERNAL" channel.
  const threadMessages = useMessagesStore((s) => s.messagesByKey.get(`${id}_all`)?.messages);
  const { platform } = getContactChannelSource({
    lastMessage: stored?.lastMessage,
    messages: threadMessages,
    igsId: contact?.igsId,
    psid: contact?.psid,
  });
  const labels = contact?.ContactLabelMap?.map((m: any) => m.label?.name).filter(Boolean) ?? [];

  const avatarColor = useMemo(
    () => inboxAvatarColors[paletteIndex(id, inboxAvatarColors.length)],
    [id],
  );
  const channelColor = inboxChannelColors[platform] ?? inboxChannelColors.WHATSAPP;

  const copyPhone = async () => {
    if (!phone) return;
    await Clipboard.setStringAsync(phone);
    // Both a toast and an inline tick: the toast is the app's usual confirmation,
    // and the tick keeps the answer next to the thing that was copied.
    setCopied(true);
    Toast.show({ type: "success", text1: "Phone number copied", visibilityTime: 1500 });
    setTimeout(() => setCopied(false), 1500);
  };

  if (isLoading && !contact) {
    return (
      <View style={{ flex: 1, backgroundColor: t.pageBg }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.pageBg }}>
      {/* Header bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingVertical: 8,
          paddingHorizontal: 12,
          backgroundColor: getInboxHeaderBg(isDark),
          borderBottomWidth: 1,
          borderBottomColor: t.border1,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 34, height: 34, alignItems: "center", justifyContent: "center" }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={21} color={t.fg1} />
        </TouchableOpacity>
        <Text style={{ fontSize: 15, fontFamily: "Nunito_800ExtraBold", color: t.fg1 }}>
          Contact info
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Identity block */}
        <View style={{ alignItems: "center", paddingTop: 28 }}>
          <View style={{ position: "relative" }}>
            <View
              style={{
                width: 96,
                height: 96,
                borderRadius: 48,
                backgroundColor: avatarColor,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontFamily: "Nunito_800ExtraBold", fontSize: 34, color: "#fff" }}>
                {namePreview(name)}
              </Text>
            </View>
            <View
              style={{
                position: "absolute",
                bottom: 2,
                right: 2,
                width: 26,
                height: 26,
                borderRadius: 13,
                backgroundColor: channelColor,
                borderWidth: 3,
                borderColor: t.pageBg,
              }}
            />
          </View>

          <Text
            numberOfLines={2}
            style={{
              fontSize: 21,
              fontFamily: "Nunito_800ExtraBold",
              color: t.fg1,
              marginTop: 14,
              textAlign: "center",
            }}
          >
            {name}
          </Text>
          <Text
            style={{ fontSize: 12, fontFamily: "Nunito_400Regular", color: t.fg4, marginTop: 3 }}
          >
            {platformLabel(platform)}
          </Text>
        </View>

        {/* Phone + copy — the reason this screen exists, so it leads. */}
        {phone ? (
          <Section label="Phone">
            <InfoRow
              icon={<Phone size={16} color={t.fg3} />}
              label="Mobile"
              value={formatPhone(phone)}
              last
              action={
                <TouchableOpacity
                  onPress={copyPhone}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Copy phone number"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: t.pageBg,
                  }}
                >
                  {copied ? (
                    <Check size={17} color={inboxChannelColors.whatsapp} />
                  ) : (
                    <Copy size={17} color={t.fg3} />
                  )}
                </TouchableOpacity>
              }
            />
          </Section>
        ) : null}

        <Section label="Contact">
          <InfoRow
            icon={<User size={16} color={t.fg3} />}
            label="Name"
            value={contact?.name || contact?.whatsappUserName || ""}
            action={
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/protected/chat/Edit",
                    params: { contactId: id },
                  } as never)
                }
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Edit contact"
                style={{ padding: 6 }}
              >
                <Pencil size={16} color={t.fg3} />
              </TouchableOpacity>
            }
          />
          <InfoRow
            label="Customer since"
            value={contact?.createdAt ? dayjs(contact.createdAt).format("MMM YYYY") : "—"}
          />
          <InfoRow label="Consent" value={contact?.consent ? "Given" : "Not given"} last />
        </Section>

        <Section label="Conversation">
          <InfoRow
            label="Labels"
            value={
              labels.length ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {labels.map((label: string) => (
                    <View
                      key={label}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 999,
                        backgroundColor: t.pageBg,
                        borderWidth: 1,
                        borderColor: t.border1,
                      }}
                    >
                      <Text
                        style={{ fontSize: 12, fontFamily: "Nunito_600SemiBold", color: t.fg2 }}
                      >
                        {label}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                "—"
              )
            }
          />
          <InfoRow
            label="Assigned to"
            value={
              assignedUsers?.length
                ? assignedUsers
                    .map((a: any) => a.assignedUser?.name)
                    .filter(Boolean)
                    .join(", ")
                : "Unassigned"
            }
            action={<AssignToUser contactId={id} iconOnly iconSize={19} iconColor={t.fg3} />}
            last
          />
        </Section>
      </ScrollView>
    </View>
  );
};

export default ContactInfo;
