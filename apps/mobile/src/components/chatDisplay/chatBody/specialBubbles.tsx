import { useState } from "react";
import { Linking, Modal, Pressable, ScrollView, Text, View, useColorScheme } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Ban,
  Copy,
  ExternalLink,
  MessageSquare,
  Phone,
  ShoppingCart,
  X,
} from "lucide-react-native";
import { getInboxRowTheme } from "@/constants/inboxDesign";
import { Toast } from "@/components/common/Notice";
import { logger } from "@/utils/logger";
import { mediaTone } from "./messageBubbleTypes";

/**
 * Message types with their own card: shared contacts, WhatsApp orders, Instagram and
 * Facebook comments, and the placeholder for a message the customer deleted.
 * Colours follow the bubble: white on an agent's brand-blue bubble (`onBrand`).
 */

// ---------- Bottom sheet shared by the "view all" actions ----------

function DetailSheet({
  title,
  visible,
  onClose,
  children,
}: {
  title: string;
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const isDark = useColorScheme() === "dark";
  const t = getInboxRowTheme(isDark);
  const insets = useSafeAreaInsets();
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
            {title}
          </Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
            <X size={22} color={t.fg3} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ---------- Shared contacts ----------

type SharedContact = {
  name?: { formatted_name?: string; first_name?: string; last_name?: string };
  phones?: { phone?: string; wa_id?: string; type?: string }[];
  emails?: { email?: string; type?: string }[];
  org?: { company?: string; title?: string };
};

function contactName(c: SharedContact) {
  return (
    c.name?.formatted_name ||
    [c.name?.first_name, c.name?.last_name].filter(Boolean).join(" ") ||
    c.phones?.[0]?.phone ||
    "Contact"
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

async function copy(value: string, label: string) {
  try {
    await Clipboard.setStringAsync(value);
    Toast.success(`${label} copied`);
  } catch (err) {
    logger.warn("Copy failed:", err);
  }
}

/** One contact's full details: phones (call / WhatsApp / copy) and emails. */
function ContactDetails({ contact }: { contact: SharedContact }) {
  const isDark = useColorScheme() === "dark";
  const t = getInboxRowTheme(isDark);
  const name = contactName(contact);
  const iconButton = {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: t.surface2,
  };
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: t.fg1, fontSize: 15, fontFamily: "InstrumentSans_600SemiBold" }}>
        {name}
      </Text>
      {contact.org?.company ? (
        <Text style={{ color: t.fg3, fontSize: 13 }}>
          {[contact.org.title, contact.org.company].filter(Boolean).join(" · ")}
        </Text>
      ) : null}
      {contact.phones?.map((p, i) =>
        p.phone ? (
          <View key={`p${i}`} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ flex: 1, color: t.fg1, fontSize: 14 }}>
              {p.phone}
              {p.type ? <Text style={{ color: t.fg3 }}>{`  ${p.type.toLowerCase()}`}</Text> : null}
            </Text>
            <Pressable
              onPress={() => Linking.openURL(`tel:${p.phone}`)}
              accessibilityLabel={`Call ${p.phone}`}
              style={iconButton}
            >
              <Phone size={16} color={t.fg1} />
            </Pressable>
            {p.wa_id ? (
              <Pressable
                onPress={() => Linking.openURL(`https://wa.me/${p.wa_id}`)}
                accessibilityLabel={`Open ${p.phone} in WhatsApp`}
                style={iconButton}
              >
                <MessageSquare size={16} color={t.fg1} />
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => copy(p.phone!, "Number")}
              accessibilityLabel={`Copy ${p.phone}`}
              style={iconButton}
            >
              <Copy size={16} color={t.fg1} />
            </Pressable>
          </View>
        ) : null,
      )}
      {contact.emails?.map((e, i) =>
        e.email ? (
          <View key={`e${i}`} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ flex: 1, color: t.fg1, fontSize: 14 }}>{e.email}</Text>
            <Pressable
              onPress={() => copy(e.email!, "Email")}
              accessibilityLabel={`Copy ${e.email}`}
              style={iconButton}
            >
              <Copy size={16} color={t.fg1} />
            </Pressable>
          </View>
        ) : null,
      )}
    </View>
  );
}

export function WaInboxContacts({
  messageContent,
  onBrand = false,
}: {
  messageContent?: SharedContact[] | null;
  onBrand?: boolean;
}) {
  const isDark = useColorScheme() === "dark";
  const tone = mediaTone(onBrand, isDark);
  const t = getInboxRowTheme(isDark);
  const [open, setOpen] = useState(false);
  const contacts = Array.isArray(messageContent) ? messageContent : [];
  if (!contacts.length) {
    return <Text style={{ color: tone.muted, fontSize: 14 }}>Contact unavailable</Text>;
  }
  const first = contacts[0];
  const name = contactName(first);
  const more = contacts.length - 1;

  return (
    <View style={{ width: 240 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: onBrand ? "rgba(255,255,255,0.22)" : t.surface2,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: tone.fg, fontSize: 14, fontFamily: "Figtree_800ExtraBold" }}>
            {initials(name)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            style={{ color: tone.fg, fontSize: 14, fontFamily: "InstrumentSans_600SemiBold" }}
          >
            {more > 0 ? `${name} and ${more} other${more === 1 ? "" : "s"}` : name}
          </Text>
          {first.phones?.[0]?.phone ? (
            <Text numberOfLines={1} style={{ color: tone.muted, fontSize: 12, marginTop: 1 }}>
              {first.phones[0].phone}
            </Text>
          ) : null}
        </View>
      </View>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        style={{
          marginTop: 8,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: tone.track,
          alignItems: "center",
        }}
      >
        <Text style={{ color: tone.fg, fontSize: 13, fontFamily: "InstrumentSans_600SemiBold" }}>
          {more > 0 ? "View all" : "View contact"}
        </Text>
      </Pressable>

      <DetailSheet
        title={more > 0 ? `${contacts.length} contacts` : "Contact"}
        visible={open}
        onClose={() => setOpen(false)}
      >
        {contacts.map((c, i) => (
          <View
            key={i}
            style={{
              paddingBottom: 12,
              borderBottomWidth: i < contacts.length - 1 ? 1 : 0,
              borderBottomColor: t.border1,
            }}
          >
            <ContactDetails contact={c} />
          </View>
        ))}
      </DetailSheet>
    </View>
  );
}

// ---------- WhatsApp order ----------

type OrderContent = {
  text?: string;
  catalog_id?: string;
  product_items?: {
    product_retailer_id?: string;
    quantity?: number;
    item_price?: number;
    currency?: string;
  }[];
};

function formatPrice(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function WaInboxOrder({
  messageContent,
  onBrand = false,
}: {
  messageContent?: OrderContent | null;
  onBrand?: boolean;
}) {
  const isDark = useColorScheme() === "dark";
  const tone = mediaTone(onBrand, isDark);
  const t = getInboxRowTheme(isDark);
  const [open, setOpen] = useState(false);
  const items = messageContent?.product_items ?? [];
  const quantity = items.reduce((sum, i) => sum + (i.quantity ?? 0), 0);
  const total = items.reduce((sum, i) => sum + (i.item_price ?? 0) * (i.quantity ?? 0), 0);
  const currency = items[0]?.currency ?? "INR";

  return (
    <View style={{ width: 240 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            backgroundColor: onBrand ? "rgba(255,255,255,0.22)" : "rgba(37,211,102,0.15)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ShoppingCart size={20} color={onBrand ? "#fff" : t.success} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: tone.fg, fontSize: 14, fontFamily: "InstrumentSans_600SemiBold" }}>
            {quantity} {quantity === 1 ? "item" : "items"}
          </Text>
          <Text style={{ color: tone.muted, fontSize: 12, marginTop: 1 }}>
            {formatPrice(total, currency)} estimated total
          </Text>
        </View>
      </View>
      {messageContent?.text ? (
        <Text style={{ color: tone.fg, fontSize: 14, marginTop: 8 }}>{messageContent.text}</Text>
      ) : null}
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        style={{
          marginTop: 8,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: tone.track,
          alignItems: "center",
        }}
      >
        <Text style={{ color: tone.fg, fontSize: 13, fontFamily: "InstrumentSans_600SemiBold" }}>
          View items
        </Text>
      </Pressable>

      <DetailSheet title="Order" visible={open} onClose={() => setOpen(false)}>
        {items.map((item, i) => (
          <View
            key={item.product_retailer_id ?? i}
            style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{ color: t.fg1, fontSize: 14, fontFamily: "InstrumentSans_600SemiBold" }}
              >
                {item.product_retailer_id ?? "Item"}
              </Text>
              <Text style={{ color: t.fg3, fontSize: 12, marginTop: 1 }}>
                {item.quantity ?? 0} ×{" "}
                {formatPrice(item.item_price ?? 0, item.currency ?? currency)}
              </Text>
            </View>
            <Text style={{ color: t.fg1, fontSize: 14 }}>
              {formatPrice(
                (item.item_price ?? 0) * (item.quantity ?? 0),
                item.currency ?? currency,
              )}
            </Text>
          </View>
        ))}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: t.border1,
          }}
        >
          <Text style={{ color: t.fg1, fontSize: 15, fontFamily: "InstrumentSans_600SemiBold" }}>
            Estimated total
          </Text>
          <Text style={{ color: t.fg1, fontSize: 15, fontFamily: "InstrumentSans_600SemiBold" }}>
            {formatPrice(total, currency)}
          </Text>
        </View>
      </DetailSheet>
    </View>
  );
}

// ---------- Instagram / Facebook comment ----------

export function IgCommentBubble({
  messageContent,
  textColor,
}: {
  messageContent?: { text?: string; permalink?: string } | null;
  textColor?: string;
}) {
  const isDark = useColorScheme() === "dark";
  const t = getInboxRowTheme(isDark);
  // Resolved by the webhook when the comment arrived; older comments carry no link.
  const permalink = messageContent?.permalink;
  const onFacebook = permalink?.includes("facebook.com");
  return (
    <View style={{ gap: 6 }}>
      <View
        style={{
          alignSelf: "flex-start",
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 10,
          backgroundColor: t.surface2,
        }}
      >
        <Text style={{ color: t.fg3, fontSize: 12 }}>Commented on your post</Text>
        {permalink ? (
          <Pressable
            onPress={() => Linking.openURL(permalink)}
            accessibilityRole="link"
            accessibilityLabel={`View this post on ${onFacebook ? "Facebook" : "Instagram"}`}
            hitSlop={8}
            style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
          >
            <Text
              style={{ color: t.brand, fontSize: 12, fontFamily: "InstrumentSans_600SemiBold" }}
            >
              View post
            </Text>
            <ExternalLink size={12} color={t.brand} />
          </Pressable>
        ) : null}
      </View>
      {messageContent?.text ? (
        <Text style={{ color: textColor, fontSize: 15 }}>{messageContent.text}</Text>
      ) : null}
    </View>
  );
}

// ---------- Deleted message ----------

export function DeletedMessage({ textColor }: { textColor?: string }) {
  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
      accessibilityLabel="This message was deleted"
    >
      <Ban size={14} color={textColor} style={{ opacity: 0.7 }} />
      <Text style={{ color: textColor, fontSize: 14, fontStyle: "italic", opacity: 0.7 }}>
        This message was deleted
      </Text>
    </View>
  );
}
