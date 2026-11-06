import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import dayjs from "dayjs";
import { AlertTriangle, ArrowLeft, ArrowUpDown, Check, Search } from "lucide-react-native";

import type {
  ContactSearchRow,
  MergeContact,
  MergePreview,
  MergeSide,
} from "@/api/inbox/contacts/merge.api";
import {
  useContactSearch,
  useMergeContacts,
  useMergePreview,
} from "@/api/inbox/contacts/merge.query";
import Tap from "@/components/common/Tap";
import { Toast } from "@/components/common/Notice";
import { SheetButton } from "@/components/contactInfo/ContactIdentitiesSection";
import { Section } from "@/components/contactInfo/InfoSection";
import { useDebounced } from "@/components/loyalty/cashier/useDebounced";
import { getInboxHeaderBg, getInboxRowTheme, type InboxRowTheme } from "@/constants/inboxDesign";
import { usePermissions } from "@/hooks/usePermissions";
import { useContactsStore } from "@/store/inboxStore";
import {
  conflictLabel,
  conflictValue,
  contactName,
  contactSubtitle,
  identityBadge,
  identityLabel,
  mergeWarningText,
} from "@/utils/contactIdentity";

const first = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) ?? "";

interface Pair {
  sourceId: string;
  targetId: string;
  /** False until the first preview has decided which side is kept by default. */
  oriented: boolean;
}

/**
 * Merges two contacts, as rateup-ui's `MergeContactsDialog` does: pick the other contact
 * (unless it came with the link), compare the two, choose the values that disagree, then
 * confirm. The source is merged into the target and deleted; the older contact is kept
 * by default and the swap button changes that.
 *
 * Params: `contactId` (the contact whose info screen opened this), `otherId` (the other
 * contact, when known), `suggestionId` (when it came from a duplicate suggestion).
 */
export default function MergeContactsScreen() {
  const params = useLocalSearchParams();
  const contactId = first(params.contactId);
  const suggestionId = first(params.suggestionId) || undefined;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";
  const t = getInboxRowTheme(isDark);
  const { can } = usePermissions();

  const [pair, setPair] = useState<Pair | null>(() => {
    const otherId = first(params.otherId);
    return otherId ? { sourceId: otherId, targetId: contactId, oriented: false } : null;
  });
  const [choices, setChoices] = useState<Record<string, MergeSide>>({});

  const preview = useMergePreview(pair?.sourceId ?? null, pair?.targetId ?? null);
  const data =
    preview.data &&
    preview.data.source.id === pair?.sourceId &&
    preview.data.target.id === pair?.targetId
      ? preview.data
      : undefined;

  // Keep the older contact by default, decided once from the first preview. Adjusted
  // during render (React's pattern for state derived from new data), not in an effect.
  if (pair && !pair.oriented && data) {
    const sourceIsOlder = dayjs(data.source.createdAt).isBefore(dayjs(data.target.createdAt));
    setPair(
      sourceIsOlder
        ? { sourceId: pair.targetId, targetId: pair.sourceId, oriented: true }
        : { ...pair, oriented: true },
    );
  }

  const swap = () => {
    if (!pair) return;
    setPair({ sourceId: pair.targetId, targetId: pair.sourceId, oriented: true });
    // Keep the picked values: what was the target's value is now the source's.
    setChoices((current) =>
      Object.fromEntries(
        Object.entries(current).map(([field, side]) => [
          field,
          side === "source" ? "target" : "source",
        ]),
      ),
    );
  };

  const merge = useMergeContacts();
  const submit = (preview: MergePreview) => {
    if (!pair) return;
    const source = contactName(preview.source);
    const target = contactName(preview.target);
    Alert.alert(
      "Merge these contacts?",
      `${source} is deleted. Its conversations, orders, labels and identities move to ${target}. This can't be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Merge",
          style: "destructive",
          onPress: () =>
            merge.mutate(
              {
                sourceId: pair.sourceId,
                targetId: pair.targetId,
                fieldChoices: choices,
                ...(suggestionId ? { suggestionId } : {}),
              },
              {
                onSuccess: () => {
                  Toast.show({ type: "success", text1: "Contacts merged" });
                  void useContactsStore.getState().deleteContactsByIds([pair.sourceId]);
                  if (pair.sourceId === contactId) {
                    // The contact this screen came from is gone, and so is its chat:
                    // go back to the inbox, where the kept contact now holds the tickets.
                    if (router.canDismiss()) router.dismissAll();
                    else router.replace("/protected/(tabs)/inbox" as never);
                  } else {
                    router.back();
                  }
                },
                onError: (error) =>
                  Toast.show({
                    type: "error",
                    text1:
                      (error as { response?: { data?: { message?: string } } })?.response?.data
                        ?.message ?? "Could not merge contacts",
                  }),
              },
            ),
        },
      ],
    );
  };

  const ready = !!data && !!pair?.oriented;

  return (
    <View style={{ flex: 1, backgroundColor: t.pageBg }}>
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
        <Tap
          onPress={() => router.back()}
          style={{ width: 34, height: 34, alignItems: "center", justifyContent: "center" }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={21} color={t.fg1} />
        </Tap>
        <Text style={{ fontSize: 15, fontFamily: "Figtree_800ExtraBold", color: t.fg1 }}>
          {pair ? "Merge contacts" : "Merge with…"}
        </Text>
      </View>

      {!can("contacts.merge") ? (
        <Centered t={t} text="You don't have permission to merge contacts. Ask an admin." />
      ) : !pair ? (
        <ContactPicker
          t={t}
          excludeId={contactId}
          onPick={(contact) =>
            setPair({ sourceId: contact.id, targetId: contactId, oriented: false })
          }
        />
      ) : preview.isError && !data ? (
        <Centered t={t} text="Could not load these contacts. Go back and try again." />
      ) : !ready ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            style={{ opacity: preview.isFetching ? 0.6 : 1 }}
          >
            <CompareView
              preview={data}
              t={t}
              choices={choices}
              onChoose={(field, side) => setChoices((c) => ({ ...c, [field]: side }))}
              onSwap={swap}
            />
          </ScrollView>
          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 12 + insets.bottom,
              borderTopWidth: 1,
              borderTopColor: t.border1,
              backgroundColor: t.surface,
            }}
          >
            <SheetButton
              label={merge.isPending ? "Merging…" : "Merge contacts"}
              kind="primary"
              t={t}
              disabled={merge.isPending || preview.isFetching}
              onPress={() => submit(data)}
            />
          </View>
        </>
      )}
    </View>
  );
}

function Centered({ t, text }: Readonly<{ t: InboxRowTheme; text: string }>) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
      <Text
        style={{
          fontSize: 14,
          fontFamily: "InstrumentSans_400Regular",
          color: t.fg3,
          textAlign: "center",
        }}
      >
        {text}
      </Text>
    </View>
  );
}

function ContactPicker({
  t,
  excludeId,
  onPick,
}: Readonly<{ t: InboxRowTheme; excludeId: string; onPick: (contact: ContactSearchRow) => void }>) {
  const [query, setQuery] = useState("");
  const search = useDebounced(query.trim(), 300);
  const { data, isFetching, isError } = useContactSearch(search);
  const contacts = (data?.users ?? []).filter((contact) => contact.id !== excludeId);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            borderWidth: 1,
            borderColor: t.border1,
            borderRadius: 10,
            paddingHorizontal: 12,
            backgroundColor: t.surface2,
          }}
        >
          <Search size={16} color={t.fg4} />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name, phone or email"
            placeholderTextColor={t.fg4}
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              flex: 1,
              paddingVertical: 11,
              fontSize: 15,
              fontFamily: "InstrumentSans_400Regular",
              color: t.fg1,
            }}
          />
          {isFetching ? <ActivityIndicator size="small" /> : null}
        </View>
        <Text
          style={{
            fontSize: 12,
            fontFamily: "InstrumentSans_400Regular",
            color: t.fg3,
            marginTop: 8,
          }}
        >
          Pick the contact that is the same person. You'll compare the two before anything changes.
        </Text>
      </View>
      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        ListEmptyComponent={
          isFetching ? undefined : (
            <Text
              style={{
                fontSize: 13,
                fontFamily: "InstrumentSans_400Regular",
                color: t.fg3,
                textAlign: "center",
                paddingVertical: 24,
              }}
            >
              {isError ? "Could not search contacts." : "No contacts found."}
            </Text>
          )
        }
        renderItem={({ item }) => {
          const subtitle = [item.phone ? `+${item.phone.replace(/^\+/, "")}` : null, item.email]
            .filter(Boolean)
            .join(" · ");
          return (
            <Tap
              onPress={() => onPick(item)}
              accessibilityRole="button"
              style={{
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: t.rowDivider,
              }}
              pressedStyle={{ backgroundColor: t.surface2 }}
            >
              <Text
                numberOfLines={1}
                style={{ fontSize: 14, fontFamily: "InstrumentSans_600SemiBold", color: t.fg1 }}
              >
                {contactName(item)}
              </Text>
              {subtitle ? (
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 12,
                    fontFamily: "InstrumentSans_400Regular",
                    color: t.fg3,
                    marginTop: 2,
                  }}
                >
                  {subtitle}
                </Text>
              ) : null}
            </Tap>
          );
        }}
      />
    </View>
  );
}

function ContactCard({
  contact,
  kept,
  t,
}: Readonly<{ contact: MergeContact; kept: boolean; t: InboxRowTheme }>) {
  const subtitle = contactSubtitle(contact);
  return (
    <View
      style={{
        borderRadius: 12,
        borderWidth: 1,
        borderColor: kept ? t.brand : t.border1,
        backgroundColor: kept ? t.brandSoft : t.surface2,
        padding: 12,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontFamily: "InstrumentSans_700Bold",
          letterSpacing: 0.6,
          color: kept ? t.brand : t.fg4,
        }}
      >
        {kept ? "KEEP" : "MERGE IN AND DELETE"}
      </Text>
      <Text
        numberOfLines={1}
        style={{
          fontSize: 15,
          fontFamily: "InstrumentSans_600SemiBold",
          color: t.fg1,
          marginTop: 4,
        }}
      >
        {contactName(contact)}
      </Text>
      {subtitle ? (
        <Text
          numberOfLines={2}
          style={{ fontSize: 12, fontFamily: "InstrumentSans_400Regular", color: t.fg3 }}
        >
          {subtitle}
        </Text>
      ) : null}
      <Text
        style={{
          fontSize: 11,
          fontFamily: "InstrumentSans_400Regular",
          color: t.fg4,
          marginTop: 4,
        }}
      >
        Added {dayjs(contact.createdAt).format("D MMM YYYY")}
      </Text>
    </View>
  );
}

function CompareView({
  preview,
  t,
  choices,
  onChoose,
  onSwap,
}: Readonly<{
  preview: MergePreview;
  t: InboxRowTheme;
  choices: Record<string, MergeSide>;
  onChoose: (field: string, side: MergeSide) => void;
  onSwap: () => void;
}>) {
  // A value both contacts hold becomes one identity, so it is listed once.
  const identities = useMemo(() => {
    const all = [
      ...preview.identities.filter((i) => i.side === "target"),
      ...preview.legacyIdentities.target,
      ...preview.identities.filter((i) => i.side === "source"),
      ...preview.legacyIdentities.source,
    ];
    const seen = new Set<string>();
    return all.filter((identity) => {
      const key = `${identity.kind}:${identity.channel?.id ?? ""}:${identity.value.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [preview]);

  const { combined } = preview;
  const plural = (count: number, one: string, many: string) =>
    `${count} ${count === 1 ? one : many}`;
  const counts = [
    plural(combined.conversations, "conversation", "conversations"),
    plural(combined.messages, "message", "messages"),
    plural(combined.orders, "order", "orders"),
    plural(combined.campaignParticipations, "campaign send", "campaign sends"),
    plural(combined.calls, "call", "calls"),
  ];

  return (
    <View>
      <View style={{ marginTop: 16, gap: 8 }}>
        <ContactCard contact={preview.target} kept t={t} />
        <View style={{ alignItems: "center" }}>
          <Tap
            onPress={onSwap}
            accessibilityRole="button"
            accessibilityLabel="Swap which contact is kept"
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: t.border1,
              backgroundColor: t.surface,
            }}
            pressedStyle={{ opacity: 0.6 }}
          >
            <ArrowUpDown size={14} color={t.fg2} />
            <Text style={{ fontSize: 12, fontFamily: "InstrumentSans_600SemiBold", color: t.fg2 }}>
              Swap
            </Text>
          </Tap>
        </View>
        <ContactCard contact={preview.source} kept={false} t={t} />
      </View>

      {preview.conflicts.length > 0 ? (
        <Section label="Choose what to keep">
          {preview.conflicts.map((conflict, index) => {
            const chosen = choices[conflict.field] ?? "target";
            return (
              <View
                key={conflict.field}
                style={{
                  paddingVertical: 12,
                  gap: 6,
                  borderBottomWidth: index === preview.conflicts.length - 1 ? 0 : 1,
                  borderBottomColor: t.rowDivider,
                }}
              >
                <Text
                  style={{ fontSize: 11, fontFamily: "InstrumentSans_400Regular", color: t.fg4 }}
                >
                  {conflictLabel(conflict)}
                </Text>
                {(["target", "source"] as const).map((side) => {
                  const selected = chosen === side;
                  return (
                    <Tap
                      key={side}
                      onPress={() => onChoose(conflict.field, side)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                        padding: 10,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: selected ? t.brand : t.border1,
                        backgroundColor: selected ? t.brandSoft : t.pageBg,
                      }}
                    >
                      <View
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 9,
                          borderWidth: selected ? 0 : 1.5,
                          borderColor: t.fg4,
                          backgroundColor: selected ? t.brand : "transparent",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {selected ? <Check size={12} color={t.onAccent} strokeWidth={3} /> : null}
                      </View>
                      <Text
                        numberOfLines={3}
                        style={{
                          flex: 1,
                          fontSize: 14,
                          fontFamily: "InstrumentSans_600SemiBold",
                          color: t.fg1,
                        }}
                      >
                        {conflictValue(conflict, side, preview)}
                      </Text>
                    </Tap>
                  );
                })}
              </View>
            );
          })}
        </Section>
      ) : null}

      <Section label="The kept contact gets">
        <View style={{ paddingVertical: 12, gap: 10 }}>
          {identities.length ? (
            <View style={{ gap: 8 }}>
              {identities.map((identity) => (
                <View key={`${identity.kind}:${identity.channel?.id ?? ""}:${identity.value}`}>
                  <Text
                    numberOfLines={1}
                    style={{ fontSize: 14, fontFamily: "InstrumentSans_600SemiBold", color: t.fg1 }}
                  >
                    {identityLabel(identity)}
                  </Text>
                  <Text
                    style={{ fontSize: 12, fontFamily: "InstrumentSans_400Regular", color: t.fg3 }}
                  >
                    {identityBadge(identity)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
          <Text style={{ fontSize: 13, fontFamily: "InstrumentSans_400Regular", color: t.fg2 }}>
            {counts.join(" · ")}
          </Text>
          {combined.labels.length ? (
            <Text style={{ fontSize: 13, fontFamily: "InstrumentSans_400Regular", color: t.fg2 }}>
              Labels: {combined.labels.map((l) => l.name).join(", ")}
            </Text>
          ) : null}
          {combined.audiences.length ? (
            <Text style={{ fontSize: 13, fontFamily: "InstrumentSans_400Regular", color: t.fg2 }}>
              Audiences: {combined.audiences.map((a) => a.name).join(", ")}
            </Text>
          ) : null}
          {preview.loyalty.map((program) => (
            <Text
              key={program.programId}
              style={{ fontSize: 13, fontFamily: "InstrumentSans_400Regular", color: t.fg2 }}
            >
              {program.programName}:{" "}
              {program.remove
                ? `keeps the ${program.keep.points}-point account; the ${program.remove.points}-point account is closed.`
                : `the ${program.keep.points}-point loyalty account moves to the kept contact.`}
            </Text>
          ))}
        </View>
      </Section>

      {preview.warnings.length > 0 ? (
        <View
          style={{
            marginTop: 22,
            borderRadius: 14,
            padding: 14,
            gap: 6,
            backgroundColor: t.warmSoft,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={16} color={t.warmStrong} />
            <Text
              style={{ fontSize: 14, fontFamily: "InstrumentSans_700Bold", color: t.warmStrong }}
            >
              Before you merge
            </Text>
          </View>
          {preview.warnings.map((warning) => (
            <Text
              key={warning}
              style={{
                fontSize: 13,
                lineHeight: 18,
                fontFamily: "InstrumentSans_400Regular",
                color: t.fg1,
              }}
            >
              • {mergeWarningText(warning)}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}
