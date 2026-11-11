import { useState, type ComponentType } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { useRouter } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import {
  Fingerprint,
  Globe,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Phone,
} from "lucide-react-native";

import type { ContactIdentity, IdentityKind } from "@/api/inbox/contacts/merge.api";
import {
  useAddIdentity,
  useContactIdentityOverview,
  useMakeIdentityPrimary,
  useRemoveIdentity,
} from "@/api/inbox/contacts/merge.query";
import Tap from "@/components/common/Tap";
import { Toast } from "@/components/common/Notice";
import { getInboxRowTheme, type InboxRowTheme } from "@/constants/inboxDesign";
import { usePermissions } from "@/hooks/usePermissions";
import { identityBadge, identityLabel } from "@/utils/contactIdentity";
import PhoneField, { toInternationalDigits } from "@/components/common/PhoneField";

import { Pill, Section, SectionNote } from "./InfoSection";

type IdentityIcon = ComponentType<{ size?: number; color?: string }>;

// lucide 1.x dropped its brand icons, so Instagram and Messenger use FontAwesome like the
// rest of the app's channel badges.
const InstagramIcon: IdentityIcon = ({ size, color }) => (
  <FontAwesome name="instagram" size={size} color={color} />
);
const FacebookIcon: IdentityIcon = ({ size, color }) => (
  <FontAwesome name="facebook" size={size} color={color} />
);

const KIND_ICON: Record<IdentityKind, IdentityIcon> = {
  PHONE: Phone,
  EMAIL: Mail,
  WA_BSUID: MessageCircle,
  IG_SCOPED: InstagramIcon,
  FB_PSID: FacebookIcon,
  WEBCHAT: Globe,
  EXTERNAL: Fingerprint,
};

/** Only a phone or an email can be made the main one or corrected (the API's rule). */
const isEditableKind = (kind: IdentityKind) => kind === "PHONE" || kind === "EMAIL";

type ApiError = {
  response?: { status?: number; data?: { message?: string; ownerContactId?: string } };
  message?: string;
};
const errorMessage = (error: unknown, fallback: string) =>
  (error as ApiError)?.response?.data?.message ?? fallback;

/**
 * Every way this contact is known: phones, emails, its WhatsApp, Instagram, Messenger and
 * webchat accounts, each with the channel it was seen on and the main one marked. With
 * `contacts.manage` a phone or email can be added, made the main one, or removed. Adding one
 * another contact already has offers to merge the two instead. Mirrors rateup-ui's
 * `ContactIdentitySection`.
 */
export default function ContactIdentitiesSection({ contactId }: Readonly<{ contactId: string }>) {
  const t = getInboxRowTheme(useColorScheme() === "dark");
  const router = useRouter();
  const { can } = usePermissions();
  const canManage = can("contacts.manage");
  const canMerge = can("contacts.merge");
  const { data, isLoading, isError, error } = useContactIdentityOverview(
    contactId,
    can("contacts.read"),
  );
  const makePrimary = useMakeIdentityPrimary(contactId);
  const remove = useRemoveIdentity(contactId);
  const [adding, setAdding] = useState(false);

  if (!can("contacts.read")) return null;
  // An API without the identities route answers 404: leave the section out rather than
  // showing an error for something the server cannot do.
  if (isError && data === undefined) {
    if ((error as ApiError)?.response?.status === 404) return null;
    return (
      <Section label="Identities">
        <SectionNote text="Could not load this contact's identities." />
      </Section>
    );
  }

  const identities: ContactIdentity[] = data
    ? data.identities.length
      ? data.identities
      : data.legacyIdentities
    : [];

  const openMerge = (otherId: string) =>
    router.push({
      pathname: "/protected/chat/Merge",
      params: { contactId, otherId },
    } as never);

  const showActions = (identity: ContactIdentity) => {
    if (!identity.id) return;
    const id = identity.id;
    const buttons: Parameters<typeof Alert.alert>[2] = [];
    if (isEditableKind(identity.kind) && !identity.isPrimary) {
      buttons.push({
        text: "Make main",
        onPress: () =>
          makePrimary.mutate(id, {
            onSuccess: () => Toast.show({ type: "success", text1: "Main contact detail changed" }),
            onError: (error) =>
              Toast.show({ type: "error", text1: errorMessage(error, "Could not change it") }),
          }),
      });
    }
    buttons.push({
      text: "Remove",
      style: "destructive",
      onPress: () =>
        Alert.alert(
          "Remove this?",
          `${identityLabel(identity)} will no longer be linked to this contact.`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Remove",
              style: "destructive",
              onPress: () =>
                remove.mutate(id, {
                  onSuccess: () => Toast.show({ type: "success", text1: "Removed" }),
                  onError: (error) =>
                    Toast.show({
                      type: "error",
                      text1: errorMessage(error, "Could not remove it"),
                    }),
                }),
            },
          ],
        ),
    });
    buttons.push({ text: "Cancel", style: "cancel" });
    Alert.alert(identityLabel(identity), identityBadge(identity), buttons);
  };

  return (
    <Section
      label="Identities"
      action={
        canManage
          ? {
              label: "Add",
              accessibilityLabel: "Add a phone or email",
              onPress: () => setAdding(true),
            }
          : undefined
      }
    >
      {isLoading ? (
        <View style={{ paddingVertical: 16 }}>
          <ActivityIndicator />
        </View>
      ) : identities.length === 0 ? (
        <SectionNote text="No phone, email or account linked yet." />
      ) : (
        identities.map((identity, index) => (
          <IdentityRow
            key={identity.id ?? `${identity.kind}:${identity.value}`}
            identity={identity}
            t={t}
            last={index === identities.length - 1}
            onMore={canManage && identity.id ? () => showActions(identity) : undefined}
          />
        ))
      )}

      {adding ? (
        <AddIdentitySheet
          contactId={contactId}
          canMerge={canMerge}
          onClose={() => setAdding(false)}
          onMerge={(otherId) => {
            setAdding(false);
            openMerge(otherId);
          }}
        />
      ) : null}
    </Section>
  );
}

function IdentityRow({
  identity,
  t,
  last,
  onMore,
}: Readonly<{ identity: ContactIdentity; t: InboxRowTheme; last: boolean; onMore?: () => void }>) {
  const Icon = KIND_ICON[identity.kind] ?? Fingerprint;
  const bsuid = identity.kind === "WA_BSUID" ? identity.value : null;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: t.rowDivider,
      }}
    >
      <View style={{ width: 18, alignItems: "center", marginTop: 2 }}>
        <Icon size={16} color={t.fg3} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text
            numberOfLines={1}
            selectable
            style={{
              flexShrink: 1,
              fontSize: 14,
              fontFamily: "InstrumentSans_600SemiBold",
              color: t.fg1,
            }}
          >
            {identityLabel(identity)}
          </Text>
          {identity.isPrimary ? <Pill text="Main" tone="brand" /> : null}
        </View>
        {bsuid ? (
          <Text
            selectable
            style={{ fontSize: 11, fontFamily: "monospace", color: t.fg4, marginTop: 2 }}
          >
            {bsuid}
          </Text>
        ) : null}
        <Text
          style={{
            fontSize: 12,
            fontFamily: "InstrumentSans_400Regular",
            color: t.fg3,
            marginTop: 2,
          }}
        >
          {identityBadge(identity)}
        </Text>
      </View>
      {onMore ? (
        <Tap
          onPress={onMore}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Options for ${identityLabel(identity)}`}
          style={{ padding: 6 }}
          pressedStyle={{ opacity: 0.5 }}
        >
          <MoreHorizontal size={18} color={t.fg3} />
        </Tap>
      ) : null}
    </View>
  );
}

function AddIdentitySheet({
  contactId,
  canMerge,
  onClose,
  onMerge,
}: Readonly<{
  contactId: string;
  canMerge: boolean;
  onClose: () => void;
  onMerge: (otherContactId: string) => void;
}>) {
  const isDark = useColorScheme() === "dark";
  const t = getInboxRowTheme(isDark);
  const add = useAddIdentity(contactId);
  const [kind, setKind] = useState<"PHONE" | "EMAIL">("PHONE");
  const [value, setValue] = useState("");
  const [country, setCountry] = useState("IN");
  // Inline, because a toast cannot draw above a native Modal.
  const [error, setError] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);

  const trimmed = value.trim();
  const submit = () => {
    if (!trimmed || add.isPending) return;
    setOwnerId(null);
    // Checked here with the same rules as the API, so a typo is caught before the request.
    const payload = kind === "PHONE" ? toInternationalDigits(country, trimmed) : trimmed;
    if (!payload || (kind === "EMAIL" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload))) {
      setError(
        kind === "PHONE" ? "Enter a valid phone number for this country." : "Enter a valid email.",
      );
      return;
    }
    setError(null);
    add.mutate(
      { kind, value: payload },
      {
        onSuccess: () => {
          onClose();
          Toast.show({ type: "success", text1: kind === "PHONE" ? "Phone added" : "Email added" });
        },
        onError: (err) => {
          const response = (err as ApiError)?.response;
          if (response?.status === 409 && response.data?.ownerContactId) {
            setOwnerId(response.data.ownerContactId);
            setError(
              canMerge
                ? "Another contact already has this. Merge the two contacts instead."
                : "Another contact already has this. Ask an admin to merge the two contacts.",
            );
            return;
          }
          setError(errorMessage(err, "Could not add it. Please try again."));
        },
      },
    );
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" }}
      >
        <Tap style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
        <View
          style={{
            backgroundColor: t.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
            paddingBottom: 32,
            gap: 14,
          }}
        >
          <Text style={{ fontSize: 17, fontFamily: "Figtree_800ExtraBold", color: t.fg1 }}>
            Add a phone or email
          </Text>

          <View
            style={{
              flexDirection: "row",
              backgroundColor: t.surface2,
              borderRadius: 10,
              padding: 3,
              borderWidth: 1,
              borderColor: t.border1,
            }}
          >
            {(["PHONE", "EMAIL"] as const).map((option) => {
              const selected = kind === option;
              return (
                <Tap
                  key={option}
                  onPress={() => {
                    setKind(option);
                    setValue("");
                    setError(null);
                    setOwnerId(null);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 8,
                    alignItems: "center",
                    backgroundColor: selected ? t.surface : "transparent",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontFamily: "InstrumentSans_600SemiBold",
                      color: selected ? t.fg1 : t.fg3,
                    }}
                  >
                    {option === "PHONE" ? "Phone" : "Email"}
                  </Text>
                </Tap>
              );
            })}
          </View>

          {kind === "PHONE" ? (
            <PhoneField
              autoFocus
              country={country}
              national={value}
              onChangeCountry={(next) => {
                setCountry(next);
                setError(null);
              }}
              onChangeNational={(text) => {
                setValue(text);
                setError(null);
                setOwnerId(null);
              }}
              onSubmitEditing={submit}
              returnKeyType="done"
              invalid={!!error}
            />
          ) : (
            <TextInput
              autoFocus
              value={value}
              onChangeText={(text) => {
                setValue(text);
                setError(null);
                setOwnerId(null);
              }}
              onSubmitEditing={submit}
              placeholder="email@example.com"
              placeholderTextColor={t.fg4}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              style={{
                minHeight: 50,
                borderWidth: 1,
                borderColor: error ? t.danger : t.border1,
                borderRadius: 12,
                paddingHorizontal: 14,
                fontSize: 16,
                fontFamily: "InstrumentSans_400Regular",
                color: t.fg1,
                backgroundColor: t.surface2,
              }}
            />
          )}

          {error ? (
            <View style={{ gap: 10 }}>
              <Text
                style={{ fontSize: 13, fontFamily: "InstrumentSans_400Regular", color: t.danger }}
              >
                {error}
              </Text>
              {ownerId && canMerge ? (
                <SheetButton
                  label="Merge contacts"
                  kind="secondary"
                  t={t}
                  onPress={() => onMerge(ownerId)}
                />
              ) : null}
            </View>
          ) : null}

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <SheetButton label="Cancel" kind="secondary" t={t} onPress={onClose} />
            </View>
            <View style={{ flex: 1 }}>
              <SheetButton
                label={add.isPending ? "Adding…" : "Add"}
                kind="primary"
                t={t}
                disabled={!trimmed || add.isPending}
                onPress={submit}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function SheetButton({
  label,
  kind,
  t,
  onPress,
  disabled,
}: Readonly<{
  label: string;
  kind: "primary" | "secondary" | "danger";
  t: InboxRowTheme;
  onPress: () => void;
  disabled?: boolean;
}>) {
  const filled = kind !== "secondary";
  const fill = kind === "danger" ? t.danger : t.brandInk;
  return (
    <Tap
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={{
        minHeight: 44,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 14,
        backgroundColor: filled ? fill : t.surface2,
        borderWidth: filled ? 0 : 1,
        borderColor: t.border1,
        opacity: disabled ? 0.5 : 1,
      }}
      pressedStyle={{ opacity: 0.75 }}
    >
      <Text
        style={{
          fontSize: 14,
          fontFamily: "InstrumentSans_600SemiBold",
          color: filled ? "#FFFFFF" : t.fg1,
        }}
      >
        {label}
      </Text>
    </Tap>
  );
}
