import { Toast } from "toastify-react-native";
import { View, Text, Image, TouchableOpacity, ScrollView } from "react-native";
import React, { useState } from "react";
import { namePreview } from "../../utils/chatbox_utils";
import { signOut } from "@/api/api";
import { Ionicons } from "@expo/vector-icons";
import { Pressable } from "react-native";

interface UserProfile {
  email: string;
  orgName: string;
  role: string;
  profilePhoto: string;
  orgPhone: string;
  userName: string;
}

const AccountBar = ({
  email,
  orgName,
  role,
  profilePhoto,
  orgPhone,
  userName,
}: UserProfile) => {
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    const res = await signOut();
    if (!res.success) {
      setLoading(false);
      return Toast.show({
        type: "error",
        text1: "Sign Out failed, please try again later",
      });
    }
    setLoading(false);
  };

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

  return (
    <View className="flex-1 bg-white dark:bg-slate-950">
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Header */}
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-lg font-semibold dark:text-white">
            Account Details
          </Text>
        </View>

        {/* Profile Section */}
        <View className="items-center mb-6">
          <View className="relative">
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
                  <Text className="text-white text-2xl font-bold">
                    {namePreview(userName)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <Text className="text-xl font-semibold mt-4 dark:text-white">
            {userName}
          </Text>

          {/* Role Badge */}
          <View className="mt-2 bg-blue-100 px-3 py-1 rounded-full">
            <Text className="text-blue-600 text-xs font-semibold">{role}</Text>
          </View>
        </View>

        {/* Card Section */}
        <View className="bg-white dark:bg-slate-900 rounded-2xl px-4 shadow-sm">
          <Row icon="person-outline" label="Name" value={userName} />
          <Row icon="mail-outline" label="Email" value={email} />
          <Row icon="business-outline" label="Organization" value={orgName} />
          <Row icon="call-outline" label="Phone Number" value={orgPhone} />
        </View>

        {/* Logout */}
        <Pressable
          onPress={handleSignOut}
          disabled={loading}
          className="mt-6 border border-red-400 py-4 rounded-xl items-center"
        >
          <Text className="text-red-500 font-semibold">
            {loading ? "Logging Out..." : "Log Out"}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
};

export default AccountBar;
