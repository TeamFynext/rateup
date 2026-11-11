import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, useColorScheme } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import ContactOrders from "@/components/shop/ContactOrders";
import { useCommerceAccess } from "@/components/shop/chatSell";
import { usePermissions } from "@/hooks/usePermissions";
import { InfoRow, Section } from "@/components/contactInfo/InfoSection";
import ContactDetailsSection from "@/components/contactInfo/ContactDetailsSection";
import ContactIdentitiesSection from "@/components/contactInfo/ContactIdentitiesSection";
import ContactMergeSection from "@/components/contactInfo/ContactMergeSection";
import TicketSection, { ContactLabelsRow } from "@/components/contactInfo/TicketSection";

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

const ContactInfo = () => {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
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
  const { canRead: canReadOrders } = useCommerceAccess();
  const canEdit = usePermissions().can("contacts.manage");

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
  // From the contact record; the labels row prefers the inbox row's, which edits patch.
  const labels =
    contact?.ContactLabelMap?.map((m: any) => m.label)
      .filter((l: any) => l?.id)
      .map((l: any) => ({ id: l.id, name: l.name, color: l.color })) ?? [];

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
        <Pressable
          onPress={() => router.back()}
          style={{ width: 34, height: 34, alignItems: "center", justifyContent: "center" }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={21} color={t.fg1} />
        </Pressable>
        <Text style={{ fontSize: 15, fontFamily: "Figtree_800ExtraBold", color: t.fg1 }}>
          Contact info
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 + insets.bottom }}
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
              <Text style={{ fontFamily: "Figtree_800ExtraBold", fontSize: 34, color: "#fff" }}>
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
              fontFamily: "Figtree_800ExtraBold",
              color: t.fg1,
              marginTop: 14,
              textAlign: "center",
            }}
          >
            {name}
          </Text>
          <Text
            style={{
              fontSize: 12,
              fontFamily: "InstrumentSans_400Regular",
              color: t.fg4,
              marginTop: 3,
            }}
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
                <Pressable
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
                </Pressable>
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
              canEdit ? (
                <Pressable
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
                </Pressable>
              ) : undefined
            }
          />
          <InfoRow
            label="Customer since"
            value={contact?.createdAt ? dayjs(contact.createdAt).format("MMM YYYY") : "—"}
          />
          <InfoRow label="Consent" value={contact?.consent ? "Given" : "Not given"} last />
        </Section>

        {id ? (
          <>
            <ContactDetailsSection contactId={id} />
            <ContactIdentitiesSection contactId={id} />
            <ContactMergeSection contactId={id} />
          </>
        ) : null}

        <Section label="Conversation">
          <ContactLabelsRow contactId={id} fallback={labels} />
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

        {id ? <TicketSection contactId={id} /> : null}

        {canReadOrders && id ? (
          <Section label="Orders">
            <ContactOrders contactId={id} />
          </Section>
        ) : null}
      </ScrollView>
    </View>
  );
};

export default ContactInfo;
