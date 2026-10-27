import { Toast } from "@/components/common/Notice";
import { Alert, View, Text, ScrollView, Pressable } from "react-native";
import { router } from "expo-router";
import Image from "@/components/common/Image";
import React, { useState, useEffect } from "react";
import { namePreview } from "../../utils/chatbox_utils";
import { signOut } from "@/api/api";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { getThemePreference, setThemePreference, ThemePreference } from "../../utils/theme";
import { Colors } from "@/constants/colors";
import { pendingCashierWrites } from "@/utils/clearLocalData";
import { roleLabelOf } from "@/hooks/usePermissions";
import StatusRow from "./StatusPicker";

interface UserProfile {
  email: string;
  orgName: string;
  role: string;
  roleKey?: string;
  profilePhoto: string;
  orgPhone: string;
  userName: string;
  orgId: string;
}

const Row = ({ icon, label, value, onPress }: any) => (
  <Pressable onPress={onPress} className="flex-row items-center justify-between py-4">
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
  orgName,
  role,
  roleKey,
  profilePhoto,
  orgPhone,
  userName,
}: UserProfile) => {
  const [loading, setLoading] = useState(false);
  const { setColorScheme } = useColorScheme();
  const [themePref, setThemePref] = useState<ThemePreference>("system");

  useEffect(() => {
    async function loadTheme() {
      const saved = await getThemePreference();
      setThemePref(saved);
    }
    loadTheme();
  }, []);

  const openProfile = () => router.push("/protected/profile");

  const handleThemeChange = async (newTheme: ThemePreference) => {
    setThemePref(newTheme);
    await setThemePreference(newTheme);
    setColorScheme(newTheme);
  };

  const handleSignOut = async () => {
    // A counter write that has not reached the server is a customer who paid and got
    // nothing. The rows survive sign-out, but only whoever is signed in to that org can
    // send them — so this asks rather than clearing silently like every other cache.
    const outstanding = await pendingCashierWrites();
    if (outstanding > 0) {
      const confirmed = await new Promise<boolean>((resolve) => {
        Alert.alert(
          outstanding === 1
            ? "1 counter entry has not been sent"
            : `${outstanding} counter entries have not been sent`,
          "They are saved on this phone and can only be sent while signed in to this account. Sign out anyway?",
          [
            { text: "Stay signed in", style: "cancel", onPress: () => resolve(false) },
            { text: "Sign out", style: "destructive", onPress: () => resolve(true) },
          ],
          { onDismiss: () => resolve(false) },
        );
      });
      if (!confirmed) return;
    }

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

  return (
    // No title of its own: the tab screen puts "Account Details" in the shared
    // `ScreenHeader`, on the same bar and at the same weight as the other tabs, and the
    // background is the tab's so the two are one surface.
    <View className="flex-1">
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Profile */}
        <View className="items-center mb-6">
          <Pressable
            onPress={openProfile}
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
          >
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
            <View className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white dark:bg-slate-800 items-center justify-center border border-gray-200 dark:border-slate-700">
              <Ionicons name="pencil" size={14} color="#6b7280" />
            </View>
          </Pressable>

          <Text className="text-xl font-semibold mt-4 dark:text-white">{userName}</Text>

          <View className="mt-2 bg-blue-100 px-3 py-1 rounded-full">
            <Text className="text-blue-600 text-xs font-semibold">
              {roleLabelOf({ role, roleKey })}
            </Text>
          </View>
        </View>

        {/* Info */}
        <View className="bg-white dark:bg-slate-900 rounded-2xl px-4 shadow-sm">
          <Row icon="person-outline" label="Name" value={userName} onPress={openProfile} />
          <Row icon="mail-outline" label="Email" value={email} />
          <Row icon="business-outline" label="Organization" value={orgName} />
          <Row icon="call-outline" label="Phone Number" value={orgPhone} />
        </View>

        <StatusRow />

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

        <Pressable
          onPress={() => router.push("/protected/security")}
          className="mt-6 bg-white dark:bg-slate-900 rounded-2xl px-4 py-4 shadow-sm flex-row items-center gap-3 active:opacity-80"
        >
          <Ionicons name="shield-checkmark-outline" size={20} color="#6b7280" />
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-700 dark:text-gray-300">
              Security
            </Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              Password and account deletion
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
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
    </View>
  );
};

export default AccountBar;
