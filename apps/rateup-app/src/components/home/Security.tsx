import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, Lock, TriangleAlert } from "lucide-react-native";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import {
  changePassword,
  serverMessage,
  signOut,
  useUpdateActiveStatusMutation,
  useUserProfile,
} from "@/api/api";
import { Toast } from "@/components/common/Notice";
import {
  Card,
  CashierButton,
  CashierInput,
  Divider,
  Field,
  FONT,
  InlineError,
  useTheme,
} from "@/components/loyalty/cashier/ui";
import { pendingCashierWrites } from "@/utils/clearLocalData";

/** Mirrors `passwordRegex` in rateup-ui's SecurityPage. */
const PASSWORD_RULE =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
const PASSWORD_HINT =
  "At least 8 characters, with an uppercase letter, a lowercase letter, a number and a special character.";
const DELETE_PHRASE = "DELETE ACCOUNT";

function PasswordInput({
  value,
  onChangeText,
  placeholder,
  invalid,
  autoComplete,
}: Readonly<{
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  invalid?: boolean;
  autoComplete: "current-password" | "new-password";
}>) {
  const { t } = useTheme();
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;
  return (
    <CashierInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      invalid={invalid}
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete={autoComplete}
      textContentType={autoComplete === "new-password" ? "newPassword" : "password"}
      suffix={
        <Pressable
          onPress={() => setVisible((v) => !v)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={visible ? "Hide password" : "Show password"}
        >
          <Icon size={18} color={t.fg3} />
        </Pressable>
      }
    />
  );
}

function SectionHead({
  icon,
  title,
  description,
  tone = "neutral",
}: Readonly<{
  icon: React.ReactNode;
  title: string;
  description: string;
  tone?: "neutral" | "danger";
}>) {
  const { t } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: tone === "danger" ? t.dangerTone.soft : t.surface2,
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: FONT.semibold, fontSize: 16, color: t.fg1 }}>{title}</Text>
        <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: t.fg3 }}>{description}</Text>
      </View>
    </View>
  );
}

function PasswordSection({ hasPassword }: Readonly<{ hasPassword: boolean }>) {
  const { t } = useTheme();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({ mutationFn: changePassword });

  const errors = {
    current: current ? null : "Enter your current password",
    next: !next
      ? "Enter a new password"
      : PASSWORD_RULE.test(next)
        ? null
        : "This password does not meet the rules below",
    confirm: !confirm
      ? "Confirm your new password"
      : confirm === next
        ? null
        : "Passwords do not match",
  };
  const shown = (key: keyof typeof errors) => (submitted ? errors[key] : null);

  const close = () => {
    setOpen(false);
    setCurrent("");
    setNext("");
    setConfirm("");
    setSubmitted(false);
    mutation.reset();
  };

  const submit = () => {
    setSubmitted(true);
    if (errors.current || errors.next || errors.confirm) return;
    mutation.mutate(
      { existingPassword: current, newPassword: next },
      {
        onSuccess: () => {
          close();
          Toast.show({ type: "success", text1: "Password changed" });
        },
      },
    );
  };

  return (
    <Card gap={16}>
      <SectionHead
        icon={<Lock size={18} color={t.fg2} />}
        title="Password"
        description={
          hasPassword
            ? "Use a strong password you do not reuse anywhere else."
            : "You sign in with Google, so there is no RateUp password to change."
        }
      />

      {hasPassword && !open ? (
        <CashierButton label="Change password" variant="outline" onPress={() => setOpen(true)} />
      ) : null}

      {hasPassword && open ? (
        <View style={{ gap: 14 }}>
          <Divider />
          <Field label="Current password" error={shown("current")}>
            <PasswordInput
              value={current}
              onChangeText={setCurrent}
              placeholder="Enter current password"
              invalid={Boolean(shown("current"))}
              autoComplete="current-password"
            />
          </Field>
          <Field label="New password" hint={PASSWORD_HINT} error={shown("next")}>
            <PasswordInput
              value={next}
              onChangeText={setNext}
              placeholder="Enter new password"
              invalid={Boolean(shown("next"))}
              autoComplete="new-password"
            />
          </Field>
          <Field label="Confirm new password" error={shown("confirm")}>
            <PasswordInput
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Re-enter new password"
              invalid={Boolean(shown("confirm"))}
              autoComplete="new-password"
            />
          </Field>
          <InlineError
            message={
              mutation.isError
                ? serverMessage(mutation.error, "Could not change your password. Try again.")
                : null
            }
          />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <CashierButton label="Cancel" variant="outline" onPress={close} />
            </View>
            <View style={{ flex: 1 }}>
              <CashierButton
                label="Update password"
                onPress={submit}
                loading={mutation.isPending}
              />
            </View>
          </View>
        </View>
      ) : null}
    </Card>
  );
}

function DeleteAccountModal({
  visible,
  userId,
  hasPassword,
  unsentEntries,
  onClose,
}: Readonly<{
  visible: boolean;
  userId: string;
  hasPassword: boolean;
  unsentEntries: number;
  onClose: () => void;
}>) {
  const { t } = useTheme();
  const [password, setPassword] = useState("");
  const [phrase, setPhrase] = useState("");
  const mutation = useUpdateActiveStatusMutation();

  const ready = hasPassword ? password.length > 0 : phrase === DELETE_PHRASE;

  const close = () => {
    setPassword("");
    setPhrase("");
    mutation.reset();
    onClose();
  };

  const remove = () => {
    mutation.mutate(
      { userId, password: hasPassword ? password : undefined },
      {
        onSuccess: async () => {
          onClose();
          await signOut();
          Toast.show({ type: "success", text1: "Your account has been deleted" });
        },
      },
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{
          flex: 1,
          justifyContent: "center",
          paddingHorizontal: 20,
          backgroundColor: "rgba(0,0,0,0.5)",
        }}
      >
        <View style={{ backgroundColor: t.surface, borderRadius: 16, padding: 20, gap: 16 }}>
          <SectionHead
            tone="danger"
            icon={<TriangleAlert size={18} color={t.danger} />}
            title="Delete your account?"
            description="Your login is removed for good. Your team and its data stay as they are."
          />

          {unsentEntries > 0 ? (
            <InlineError
              message={
                unsentEntries === 1
                  ? "1 counter entry on this phone has not been sent. Deleting your account loses it."
                  : `${unsentEntries} counter entries on this phone have not been sent. Deleting your account loses them.`
              }
            />
          ) : null}

          {hasPassword ? (
            <Field label="Enter your password to confirm">
              <PasswordInput
                value={password}
                onChangeText={setPassword}
                placeholder="Current password"
                autoComplete="current-password"
              />
            </Field>
          ) : (
            <Field label={`Type ${DELETE_PHRASE} to confirm`}>
              <CashierInput
                value={phrase}
                onChangeText={(text) => setPhrase(text.toUpperCase())}
                placeholder={DELETE_PHRASE}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </Field>
          )}

          {/* A toast cannot render above a native Modal, so the failure is shown here. */}
          <InlineError
            message={
              mutation.isError
                ? serverMessage(mutation.error, "Could not delete your account. Try again.")
                : null
            }
          />

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <CashierButton
                label="Cancel"
                variant="outline"
                onPress={close}
                disabled={mutation.isPending}
              />
            </View>
            <View style={{ flex: 1 }}>
              <CashierButton
                label="Delete account"
                variant="danger"
                onPress={remove}
                disabled={!ready}
                loading={mutation.isPending}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function Security({ userId }: Readonly<{ userId: string }>) {
  const { t } = useTheme();
  const { data: profile } = useUserProfile();
  // Until the profile loads, assume a password: asking for one is the safe default.
  const hasPassword = profile?.hasPassword ?? true;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [unsentEntries, setUnsentEntries] = useState(0);

  const openDelete = async () => {
    setUnsentEntries(await pendingCashierWrites());
    setDeleteOpen(true);
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 16 }}
      keyboardShouldPersistTaps="handled"
    >
      <PasswordSection hasPassword={hasPassword} />

      <Card gap={16}>
        <SectionHead
          tone="danger"
          icon={<TriangleAlert size={18} color={t.danger} />}
          title="Danger zone"
          description="These actions are permanent and cannot be undone."
        />
        <Divider />
        <View style={{ gap: 4 }}>
          <Text style={{ fontFamily: FONT.semibold, fontSize: 15, color: t.fg1 }}>
            Delete account
          </Text>
          <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: t.fg3 }}>
            Removes your own login. Your team keeps working.
          </Text>
        </View>
        <CashierButton label="Delete account" variant="danger" onPress={openDelete} />
      </Card>

      <DeleteAccountModal
        visible={deleteOpen}
        userId={userId}
        hasPassword={hasPassword}
        unsentEntries={unsentEntries}
        onClose={() => setDeleteOpen(false)}
      />
    </ScrollView>
  );
}
