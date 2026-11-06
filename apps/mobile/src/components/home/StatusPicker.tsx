import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronRight } from "lucide-react-native";
import React, { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  type AvailabilityStatus,
  type PresenceMode,
  serverMessage,
  updateAvailability,
  useLoggedInUser,
} from "@/api/api";
import Image from "@/components/common/Image";
import { Toast } from "@/components/common/Notice";
import { FONT, useTheme } from "@/components/loyalty/cashier/ui";
import { getInboxHeaderBg, type InboxRowTheme } from "@/constants/inboxDesign";
import { namePreview } from "@/utils/chatbox_utils";

type Choice = "automatic" | AvailabilityStatus;

/** Mirrors the status menu in rateup-ui's `user-nav.tsx`. */
const CHOICES: { value: Choice; label: string; hint?: string }[] = [
  { value: "automatic", label: "Automatic", hint: "Online while RateUp is open on any device" },
  { value: "online", label: "Available" },
  { value: "busy", label: "Busy" },
  { value: "offline", label: "Offline" },
];

export const STATUS_LABEL: Record<AvailabilityStatus, string> = {
  online: "Available",
  busy: "Busy",
  offline: "Offline",
};

export function dotColor(t: InboxRowTheme, value: Choice) {
  switch (value) {
    case "automatic":
      return t.brand;
    case "online":
      return t.success;
    case "busy":
      return t.danger;
    case "offline":
      return t.fg4;
  }
}

function useAvailability() {
  const queryClient = useQueryClient();
  const { data: user } = useLoggedInUser();
  const status: AvailabilityStatus = user?.status ?? "offline";
  const presenceMode: PresenceMode = user?.presenceMode ?? "automatic";
  const choice: Choice = presenceMode === "manual" ? status : "automatic";

  const mutation = useMutation({
    mutationFn: updateAvailability,
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: ["loggedUser"] });
      const previous = queryClient.getQueryData(["loggedUser"]);
      queryClient.setQueryData(["loggedUser"], (old: object | undefined) =>
        old ? { ...old, ...next } : old,
      );
      return { previous };
    },
    onError: (error, _next, context) => {
      queryClient.setQueryData(["loggedUser"], context?.previous);
      Toast.show({ type: "error", text1: serverMessage(error, "Could not update your status") });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["loggedUser"] }),
  });

  const choose = (value: Choice) => {
    if (value === choice) return;
    mutation.mutate(
      value === "automatic"
        ? { status: "online", presenceMode: "automatic" }
        : { status: value, presenceMode: "manual" },
    );
  };

  return { user, status, choice, choose };
}

function StatusSheet({
  visible,
  onClose,
  choice,
  onChoose,
}: Readonly<{
  visible: boolean;
  onClose: () => void;
  choice: Choice;
  onChoose: (value: Choice) => void;
}>) {
  const { t } = useTheme();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} onPress={onClose} />
      <SafeAreaView
        edges={["bottom"]}
        style={{
          backgroundColor: t.surface,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          borderWidth: 1,
          borderColor: t.border1,
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 8,
        }}
      >
        <View
          style={{
            width: 48,
            height: 6,
            borderRadius: 999,
            backgroundColor: t.border1,
            alignSelf: "center",
            marginBottom: 14,
          }}
        />
        <Text style={{ fontFamily: FONT.bold, fontSize: 18, color: t.fg1, marginBottom: 4 }}>
          Your status
        </Text>
        {CHOICES.map((option) => {
          const selected = option.value === choice;
          return (
            <Pressable
              key={option.value}
              onPress={() => {
                // Closed first: a failure toast cannot render above the sheet's Modal.
                onClose();
                onChoose(option.value);
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}
            >
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: dotColor(t, option.value),
                }}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: FONT.medium, fontSize: 15, color: t.fg1 }}>
                  {option.label}
                </Text>
                {option.hint ? (
                  <Text style={{ fontFamily: FONT.regular, fontSize: 12, color: t.fg3 }}>
                    {option.hint}
                  </Text>
                ) : null}
              </View>
              {selected ? <Check size={18} color={t.brand} /> : null}
            </Pressable>
          );
        })}
      </SafeAreaView>
    </Modal>
  );
}

/** The Account tab's one-line status control. */
export default function StatusRow() {
  const { t } = useTheme();
  const { status, choice, choose } = useAvailability();
  const [open, setOpen] = useState(false);
  const label =
    choice === "automatic" ? `Automatic · ${STATUS_LABEL[status]}` : STATUS_LABEL[choice];

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Status: ${label}`}
        className="mt-6 bg-white dark:bg-slate-900 rounded-2xl px-4 py-4 shadow-sm flex-row items-center gap-3 active:opacity-80"
      >
        <View
          style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: dotColor(t, status) }}
        />
        <Text className="flex-1 text-base font-semibold text-gray-700 dark:text-gray-300">
          Status
        </Text>
        <Text className="text-gray-500 dark:text-gray-400">{label}</Text>
        <ChevronRight size={18} color="#9ca3af" />
      </Pressable>
      <StatusSheet
        visible={open}
        onClose={() => setOpen(false)}
        choice={choice}
        onChoose={choose}
      />
    </>
  );
}

/** The inbox header's avatar, ringed by a status dot; opens the same sheet. */
export function HeaderStatusButton() {
  const { t, isDark } = useTheme();
  const { user, status, choice, choose } = useAvailability();
  const [open, setOpen] = useState(false);
  const size = 30;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`Your status: ${STATUS_LABEL[status]}`}
        style={{ width: 38, height: 38, alignItems: "center", justifyContent: "center" }}
      >
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            overflow: "hidden",
            backgroundColor: t.brandInk,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {user?.profilePhoto ? (
            <Image
              source={{ uri: `${process.env.EXPO_PUBLIC_AWS_CLOUDFRONT_URL}${user.profilePhoto}` }}
              style={{ width: size, height: size }}
            />
          ) : (
            <Text style={{ fontFamily: FONT.bold, fontSize: 11, color: "#FFFFFF" }}>
              {namePreview(user?.userName ?? "")}
            </Text>
          )}
        </View>
        <View
          style={{
            position: "absolute",
            right: 2,
            bottom: 2,
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: dotColor(t, status),
            borderWidth: 2,
            borderColor: getInboxHeaderBg(isDark),
          }}
        />
      </Pressable>
      <StatusSheet
        visible={open}
        onClose={() => setOpen(false)}
        choice={choice}
        onChoose={choose}
      />
    </>
  );
}
