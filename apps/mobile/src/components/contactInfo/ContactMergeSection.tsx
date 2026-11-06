import dayjs from "dayjs";
import { Alert, Text, View, useColorScheme } from "react-native";
import { useRouter } from "expo-router";
import { GitMerge } from "lucide-react-native";

import { useContactIdentityOverview, useDismissSuggestion } from "@/api/inbox/contacts/merge.query";
import Tap from "@/components/common/Tap";
import { Toast } from "@/components/common/Notice";
import { getInboxRowTheme } from "@/constants/inboxDesign";
import { usePermissions } from "@/hooks/usePermissions";
import {
  contactName,
  contactSubtitle,
  mergeReasonText,
  suggestionReasonText,
} from "@/utils/contactIdentity";

import { Section } from "./InfoSection";

/**
 * Duplicates and merging, below the identities: contacts the API thinks are the same
 * person (review or dismiss each), a "Merge with another contact" picker, and the contacts
 * already merged into this one. Merging needs `contacts.merge`; the list itself only
 * `contacts.read`, so a teammate who cannot merge still sees that a duplicate exists.
 */
export default function ContactMergeSection({ contactId }: Readonly<{ contactId: string }>) {
  const t = getInboxRowTheme(useColorScheme() === "dark");
  const router = useRouter();
  const { can } = usePermissions();
  const canMerge = can("contacts.merge");
  const canRead = can("contacts.read");
  const { data } = useContactIdentityOverview(contactId, canRead);
  const dismiss = useDismissSuggestion(contactId);

  if (!canRead || !data) return null;
  const { suggestions, merges } = data;
  if (!canMerge && suggestions.length === 0 && merges.length === 0) return null;

  const openMerge = (otherId?: string, suggestionId?: string) =>
    router.push({
      pathname: "/protected/chat/Merge",
      params: {
        contactId,
        ...(otherId ? { otherId } : {}),
        ...(suggestionId ? { suggestionId } : {}),
      },
    } as never);

  const confirmDismiss = (suggestionId: string, name: string) =>
    Alert.alert("Not the same person?", `${name} will no longer be suggested as a duplicate.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Dismiss",
        onPress: () =>
          dismiss.mutate(suggestionId, {
            onError: () => Toast.show({ type: "error", text1: "Could not dismiss it" }),
          }),
      },
    ]);

  const rows: React.ReactNode[] = [];

  suggestions.forEach((suggestion) => {
    const name = contactName(suggestion.contact);
    const subtitle = contactSubtitle(suggestion.contact);
    rows.push(
      <View key={`s:${suggestion.id}`} style={{ paddingVertical: 12, gap: 8 }}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ width: 18, alignItems: "center", marginTop: 2 }}>
            <GitMerge size={16} color={t.warmStrong} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={{
                fontSize: 11,
                fontFamily: "InstrumentSans_600SemiBold",
                color: t.warmStrong,
              }}
            >
              Possible duplicate · {suggestionReasonText(suggestion, suggestion.contact)}
            </Text>
            <Text
              numberOfLines={1}
              style={{
                fontSize: 14,
                fontFamily: "InstrumentSans_600SemiBold",
                color: t.fg1,
                marginTop: 2,
              }}
            >
              {name}
            </Text>
            {subtitle ? (
              <Text
                numberOfLines={2}
                style={{
                  fontSize: 12,
                  fontFamily: "InstrumentSans_400Regular",
                  color: t.fg3,
                  marginTop: 1,
                }}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
        {canMerge ? (
          <View style={{ flexDirection: "row", gap: 8, paddingLeft: 30 }}>
            <SmallButton
              label="Review merge"
              primary
              onPress={() => openMerge(suggestion.contact.id, suggestion.id)}
            />
            <SmallButton label="Dismiss" onPress={() => confirmDismiss(suggestion.id, name)} />
          </View>
        ) : null}
      </View>,
    );
  });

  if (canMerge) {
    rows.push(
      <Tap
        key="merge-with"
        onPress={() => openMerge()}
        accessibilityRole="button"
        style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 }}
        pressedStyle={{ opacity: 0.6 }}
      >
        <View style={{ width: 18, alignItems: "center" }}>
          <GitMerge size={16} color={t.brand} />
        </View>
        <Text style={{ fontSize: 14, fontFamily: "InstrumentSans_600SemiBold", color: t.brand }}>
          Merge with another contact…
        </Text>
      </Tap>,
    );
  }

  merges.forEach((merge) => {
    const who = merge.mergedByName ? ` by ${merge.mergedByName}` : "";
    rows.push(
      <View key={`m:${merge.id}`} style={{ paddingVertical: 12 }}>
        <Text style={{ fontSize: 11, fontFamily: "InstrumentSans_400Regular", color: t.fg4 }}>
          Merged {dayjs(merge.createdAt).format("D MMM YYYY")}
          {who} · {mergeReasonText(merge.reason)}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 14,
            fontFamily: "InstrumentSans_600SemiBold",
            color: t.fg1,
            marginTop: 2,
          }}
        >
          {merge.sourceName || "Unnamed contact"}
        </Text>
      </View>,
    );
  });

  return (
    <Section label={suggestions.length ? `Duplicates (${suggestions.length})` : "Merge"}>
      {rows.map((row, index) => (
        <View
          key={index}
          style={{
            borderBottomWidth: index === rows.length - 1 ? 0 : 1,
            borderBottomColor: t.rowDivider,
          }}
        >
          {row}
        </View>
      ))}
    </Section>
  );
}

function SmallButton({
  label,
  primary,
  onPress,
}: Readonly<{ label: string; primary?: boolean; onPress: () => void }>) {
  const t = getInboxRowTheme(useColorScheme() === "dark");
  return (
    <Tap
      onPress={onPress}
      accessibilityRole="button"
      style={{
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 8,
        backgroundColor: primary ? t.brandInk : t.pageBg,
        borderWidth: primary ? 0 : 1,
        borderColor: t.border1,
      }}
      pressedStyle={{ opacity: 0.7 }}
    >
      <Text
        style={{
          fontSize: 13,
          fontFamily: "InstrumentSans_600SemiBold",
          color: primary ? "#FFFFFF" : t.fg1,
        }}
      >
        {label}
      </Text>
    </Tap>
  );
}
