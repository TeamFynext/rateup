import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
  useColorScheme,
  type TextInputProps,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react-native";

import { editContactById, getContactById } from "@/api/inbox/contacts/contacts.api";
import { contactDetailsKey, identityOverviewKey } from "@/api/inbox/contacts/merge.query";
import { Toast } from "@/components/common/Notice";
import PhoneField, { splitPhone, toInternationalDigits } from "@/components/common/PhoneField";
import Tap from "@/components/common/Tap";
import { SheetButton } from "@/components/contactInfo/ContactIdentitiesSection";
import { getInboxHeaderBg, getInboxRowTheme, type InboxRowTheme } from "@/constants/inboxDesign";
import { usePermissions } from "@/hooks/usePermissions";
import { useContactsStore } from "@/store/inboxStore";
import { useSelectedContactStore } from "@/utils/store";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Saved = { name: string; phone: string; email: string; address: string };

type ApiError = {
  response?: {
    status?: number;
    data?: { message?: string; error?: string; ownerContactId?: string; kind?: string };
  };
};

/** The contact's own fields: name, phone, email and address. */
export default function EditContact() {
  const { contactId } = useLocalSearchParams<{ contactId: string }>();
  const isDark = useColorScheme() === "dark";
  const t = getInboxRowTheme(isDark);
  const router = useRouter();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["contact-by-id", contactId],
    queryFn: () => getContactById(contactId),
    enabled: !!contactId,
  });

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
          Edit contact
        </Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" />
        </View>
      ) : isError || !data ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14 }}>
          <Text style={{ fontSize: 14, fontFamily: "InstrumentSans_400Regular", color: t.fg3 }}>
            Could not load this contact.
          </Text>
          <SheetButton label="Try again" kind="secondary" t={t} onPress={() => refetch()} />
        </View>
      ) : (
        // Keyed by contact so the form starts from that contact's saved values.
        <EditForm
          key={data.id}
          contactId={contactId}
          saved={{
            name: data.name ?? "",
            phone: data.phone ?? "",
            email: data.email ?? "",
            address: data.address ?? "",
          }}
          t={t}
        />
      )}
    </View>
  );
}

function EditForm({
  contactId,
  saved,
  t,
}: Readonly<{ contactId: string; saved: Saved; t: InboxRowTheme }>) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { can } = usePermissions();

  const initialPhone = splitPhone(saved.phone);
  const [name, setName] = useState(saved.name);
  const [country, setCountry] = useState(initialPhone.country);
  const [national, setNational] = useState(initialPhone.national);
  const [email, setEmail] = useState(saved.email);
  const [address, setAddress] = useState(saved.address);
  // Errors show once a save was tried, not while the user is still typing.
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const phoneDigits = toInternationalDigits(country, national);
  const phoneChanged = national.trim()
    ? phoneDigits !== saved.phone.replace(/[^\d]/g, "")
    : !!saved.phone;
  const errors = {
    name: name.trim() ? null : "Enter a name",
    // Clearing a phone is not offered: it is how WhatsApp reaches the contact. A contact
    // that never had one (Instagram, web chat) may stay without.
    phone: national.trim()
      ? phoneDigits
        ? null
        : "Enter a valid phone number for this country"
      : saved.phone
        ? "Enter a phone number"
        : null,
    email: email.trim() && !EMAIL_RE.test(email.trim()) ? "Enter a valid email" : null,
  };
  const valid = !errors.name && !errors.phone && !errors.email;
  const changed =
    name.trim() !== saved.name ||
    phoneChanged ||
    email.trim() !== saved.email ||
    address.trim() !== saved.address;

  const save = async () => {
    setTried(true);
    setFormError(null);
    if (!valid || !changed || saving) return;

    // Only what changed: re-sending an unchanged phone or email re-runs the API's
    // duplicate checks for nothing.
    const body: Record<string, string | null> = {};
    if (name.trim() !== saved.name) body.name = name.trim();
    if (phoneChanged && phoneDigits) body.phone = phoneDigits;
    if (email.trim() !== saved.email) body.email = email.trim() || null;
    if (address.trim() !== saved.address) body.address = address.trim() || null;

    setSaving(true);
    try {
      await editContactById(contactId, body);
      queryClient.invalidateQueries({ queryKey: ["contact-by-id", contactId] });
      queryClient.invalidateQueries({ queryKey: contactDetailsKey(contactId) });
      queryClient.invalidateQueries({ queryKey: identityOverviewKey(contactId) });
      queryClient.invalidateQueries({ queryKey: ["contacts", "filtered"] });

      // The inbox row and the open chat's header show the name and phone too.
      const patch: { name?: string; phone?: string } = {};
      if (body.name) patch.name = body.name;
      if (body.phone) patch.phone = body.phone;
      if (Object.keys(patch).length) {
        useContactsStore.getState().updateContactById(contactId, (c) => ({ ...c, ...patch }));
        const { selectedContact, setSelectedContact } = useSelectedContactStore.getState();
        if (selectedContact?.id === contactId) setSelectedContact({ ...selectedContact, ...patch });
      }

      Toast.show({ type: "success", text1: "Contact saved" });
      router.back();
    } catch (error) {
      const response = (error as ApiError)?.response;
      const owner = response?.data?.ownerContactId;
      if (response?.status === 409 && owner) {
        const what = response.data?.kind === "EMAIL" ? "email" : "phone number";
        if (can("contacts.merge")) {
          Alert.alert(
            `Another contact has this ${what}`,
            "If they are the same person, merge the two contacts instead.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Merge contacts",
                onPress: () =>
                  router.replace({
                    pathname: "/protected/chat/Merge",
                    params: { contactId, otherId: owner },
                  } as never),
              },
            ],
          );
        } else {
          setFormError(`Another contact already has this ${what}. Ask an admin to merge them.`);
        }
      } else if (response?.status === 403) {
        setFormError("You don't have permission to edit contacts.");
      } else {
        setFormError(
          response?.data?.message ?? response?.data?.error ?? "Could not save. Please try again.",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: 8, gap: 18 }}
        keyboardShouldPersistTaps="handled"
      >
        {formError ? (
          <View
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 12,
              backgroundColor: t.dangerTone.soft,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontFamily: "InstrumentSans_400Regular",
                color: t.dangerTone.fg,
              }}
            >
              {formError}
            </Text>
          </View>
        ) : null}

        <Field label="Name" required error={tried ? errors.name : null} t={t}>
          <Input
            t={t}
            invalid={tried && !!errors.name}
            value={name}
            onChangeText={setName}
            placeholder="Contact name"
            autoCapitalize="words"
            textContentType="name"
            returnKeyType="next"
          />
        </Field>

        <Field
          label="Phone"
          required={!!saved.phone}
          hint="The main number, used for WhatsApp. Add more numbers from Contact info."
          error={tried ? errors.phone : null}
          t={t}
        >
          <PhoneField
            country={country}
            national={national}
            onChangeCountry={setCountry}
            onChangeNational={setNational}
            invalid={tried && !!errors.phone}
          />
        </Field>

        <Field label="Email" error={tried ? errors.email : null} t={t}>
          <Input
            t={t}
            invalid={tried && !!errors.email}
            value={email}
            onChangeText={setEmail}
            placeholder="email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
            autoComplete="email"
          />
        </Field>

        <Field label="Address" t={t}>
          <Input
            t={t}
            value={address}
            onChangeText={setAddress}
            placeholder="Street, city, postcode"
            multiline
            style={{ minHeight: 80, paddingTop: 13, textAlignVertical: "top" }}
          />
        </Field>
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
          label={saving ? "Saving…" : "Save changes"}
          kind="primary"
          t={t}
          disabled={!changed || saving}
          onPress={save}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  required,
  hint,
  error,
  t,
  children,
}: Readonly<{
  label: string;
  required?: boolean;
  hint?: string;
  error?: string | null;
  t: InboxRowTheme;
  children: React.ReactNode;
}>) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 13, fontFamily: "InstrumentSans_600SemiBold", color: t.fg2 }}>
        {label}
        {required ? <Text style={{ color: t.danger }}> *</Text> : null}
      </Text>
      {children}
      {error ? (
        <Text style={{ fontSize: 12, fontFamily: "InstrumentSans_400Regular", color: t.danger }}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={{ fontSize: 12, fontFamily: "InstrumentSans_400Regular", color: t.fg4 }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

function Input({
  t,
  invalid,
  style,
  ...props
}: Readonly<TextInputProps & { t: InboxRowTheme; invalid?: boolean }>) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      placeholderTextColor={t.fg4}
      {...props}
      onFocus={(e) => {
        setFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        props.onBlur?.(e);
      }}
      style={[
        {
          minHeight: 50,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: invalid ? t.danger : focused ? t.brand : t.border1,
          backgroundColor: t.surface2,
          paddingHorizontal: 14,
          fontSize: 16,
          fontFamily: "InstrumentSans_400Regular",
          color: t.fg1,
        },
        style,
      ]}
    />
  );
}
