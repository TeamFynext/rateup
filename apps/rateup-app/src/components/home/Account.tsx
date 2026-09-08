import { Toast } from "@/components/common/Notice";
import { View, Text, ScrollView, TextInput, Modal, Pressable } from "react-native";
import Image from "@/components/common/Image";
import React, { useState, useEffect } from "react";
import { namePreview } from "../../utils/chatbox_utils";
import { signOut, useUpdateActiveStatusMutation } from "@/api/api";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { getThemePreference, setThemePreference, ThemePreference } from "../../utils/theme";
import { Colors } from "@/constants/colors";

interface UserProfile {
  email: string;
  orgName: string;
  role: string;
  profilePhoto: string;
  orgPhone: string;
  userName: string;
  orgId: string;
  userId: string;
}

const Row = ({ icon, label, value }: any) => (
  <Pressable className="flex-row items-center justify-between py-4">
    <View className="flex-row items-center gap-3">
      <Ionicons name={icon} size={20} color="#6b7280" />
      <Text className="text-gray-700 dark:text-gray-500">{label}</Text>
    </View>

    <View className="flex-row items-center gap-2">
      <Text className="text-gray-500 dark:text-gray-200">{value}</Text>
      <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
    </View>
  </Pressable>
);

const AccountBar = ({
  email,
  userId,
  orgName,
  role,
  profilePhoto,
  orgPhone,
  userName,
}: UserProfile) => {
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const { setColorScheme } = useColorScheme();
  const [themePref, setThemePref] = useState<ThemePreference>("system");

  useEffect(() => {
    async function loadTheme() {
      const saved = await getThemePreference();
      setThemePref(saved);
    }
    loadTheme();
  }, []);

  const handleThemeChange = async (newTheme: ThemePreference) => {
    setThemePref(newTheme);
    await setThemePreference(newTheme);
    setColorScheme(newTheme);
  };

  const updateActiveStatus = useUpdateActiveStatusMutation();

  const isValid = confirmText === "DELETE ACCOUNT";

  const handleSignOut = async () => {
    setLoading(true);
    const res = await signOut();
    setLoading(false);

    // The device is cleared and the sign-in screen shown either way, so this
    // is not a retry prompt. It reports the one thing that can still be wrong:
    // the server session outliving the local one.
    if (!res.success) {
      return Toast.show({
        type: "error",
        text1: "Signed out on this device",
        text2: "We could not reach the server to end the session everywhere.",
      });
    }

    Toast.show({
      type: "success",
      text1: "Logged out successfully",
    });
  };

  const handleDeleteUser = () => {
    if (!userId) return;

    Toast.show({
      type: "info",
      text1: "Deleting account...",
    });

    updateActiveStatus.mutate(userId, {
      onSuccess: () => {
        Toast.show({
          type: "success",
          text1: "Account deleted successfully",
        });

        setShowDeleteModal(false);
        setConfirmText("");

        handleSignOut();
      },
      onError: (error: any) => {
        Toast.show({
          type: "error",
          text1: error?.message || "Failed to delete account",
        });
      },
    });
  };

  return (
    <View className="flex-1 bg-white dark:bg-slate-950">
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Header */}
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-lg font-semibold dark:text-white">Account Details</Text>
        </View>

        {/* Profile */}
        <View className="items-center mb-6">
          <View className="w-24 h-24 rounded-full overflow-hidden bg-blue-400">
            {profilePhoto ? (
              <Image
                source={{
                  uri: `${process.env.EXPO_PUBLIC_AWS_CLOUDFRONT_URL}${profilePhoto}`,
                }}
                className="w-full h-full"
              />
            ) : (
              <View className="flex-1 justify-center items-center">
                <Text className="text-white text-2xl font-bold">{namePreview(userName)}</Text>
              </View>
            )}
          </View>

          <Text className="text-xl font-semibold mt-4 dark:text-white">{userName}</Text>

          <View className="mt-2 bg-blue-100 px-3 py-1 rounded-full">
            <Text className="text-blue-600 text-xs font-semibold">{role}</Text>
          </View>
        </View>

        {/* Info */}
        <View className="bg-white dark:bg-slate-900 rounded-2xl px-4 shadow-sm">
          <Row icon="person-outline" label="Name" value={userName} />
          <Row icon="mail-outline" label="Email" value={email} />
          <Row icon="business-outline" label="Organization" value={orgName} />
          <Row icon="call-outline" label="Phone Number" value={orgPhone} />
        </View>

        {/* Appearance Settings */}
        <View className="mt-6 bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm">
          <View className="flex-row items-center gap-3 mb-4">
            <Ionicons name="color-palette-outline" size={20} color="#6b7280" />
            <Text className="text-base font-semibold text-gray-700 dark:text-gray-300">
              Appearance
            </Text>
          </View>

          <View className="flex-row bg-gray-100 dark:bg-slate-800 rounded-xl p-1 gap-1">
            {(["light", "dark", "system"] as ThemePreference[]).map((t) => {
              const isActive = themePref === t;
              const label = t.charAt(0).toUpperCase() + t.slice(1);
              let iconName: "sunny-outline" | "moon-outline" | "options-outline" =
                "options-outline";
              if (t === "light") iconName = "sunny-outline";
              if (t === "dark") iconName = "moon-outline";

              return (
                <Pressable
                  key={t}
                  onPress={() => handleThemeChange(t)}
                  style={isActive ? { backgroundColor: Colors.brand.blue } : undefined}
                  className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg gap-2 ${
                    !isActive ? "active:bg-gray-200 dark:active:bg-slate-700" : ""
                  }`}
                >
                  <Ionicons name={iconName} size={16} color={isActive ? "#ffffff" : "#6b7280"} />
                  <Text
                    className={`font-semibold text-xs ${
                      isActive ? "text-white" : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Delete Account (NO ROLE RESTRICTION) */}
        <Pressable
          onPress={() => setShowDeleteModal(true)}
          className="mt-6 bg-red-50 border border-red-200 py-4 rounded-xl items-center active:bg-red-100"
        >
          <Text className="text-red-500 font-semibold">Delete Account</Text>
        </Pressable>

        {/* Logout */}
        <Pressable
          onPress={handleSignOut}
          disabled={loading}
          className={`mt-4 py-4 rounded-xl items-center ${
            loading ? "bg-gray-200" : "bg-red-500 active:bg-red-600"
          }`}
        >
          <Text className="text-white font-semibold">{loading ? "Logging Out..." : "Log Out"}</Text>
        </Pressable>
      </ScrollView>

      {/* MODAL */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/50 px-6">
          <View className="bg-white dark:bg-slate-900 w-full rounded-2xl p-6">
            <Text className="text-lg font-semibold mb-2 dark:text-white">Delete Account</Text>

            <Text className="text-gray-500 mb-4">
              Type <Text className="font-bold">DELETE ACCOUNT</Text> to confirm.
            </Text>

            <TextInput
              value={confirmText}
              onChangeText={(text) => setConfirmText(text.toUpperCase())}
              placeholder="DELETE ACCOUNT"
              className="border border-gray-300 rounded-lg px-4 py-3 mb-4 text-gray-800 dark:text-white"
            />

            {/* Buttons */}
            <View className="flex-row justify-end gap-3">
              {/* Cancel */}
              <Pressable
                onPress={() => {
                  setShowDeleteModal(false);
                  setConfirmText("");
                }}
                className="px-4 py-2 rounded-lg bg-gray-100 active:bg-gray-200"
              >
                <Text className="text-gray-600 font-medium">Cancel</Text>
              </Pressable>

              {/* Delete */}
              <Pressable
                disabled={!isValid}
                onPress={() => {
                  if (!isValid) {
                    return Toast.show({
                      type: "error",
                      text1: "Type DELETE ACCOUNT correctly",
                    });
                  }

                  handleDeleteUser();
                }}
                className={`px-4 py-2 rounded-lg ${
                  !isValid ? "bg-red-200" : "bg-red-500 active:bg-red-600"
                }`}
              >
                <Text className="text-white font-semibold">Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default AccountBar;
