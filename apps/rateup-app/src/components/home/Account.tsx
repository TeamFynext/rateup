import { View, Text, Image, TouchableOpacity, ScrollView } from "react-native";
import React, { useState } from "react";
import { namePreview } from "../../utils/chatbox_utils";
import { signOut } from "@/src/api/api";
import { useToast } from "react-native-toast-notifications";

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
  const [loading, setLoading] = useState<boolean>(false);
  const toast = useToast();

  const handleSignOut = async () => {
    setLoading(true);
    const res = await signOut();
    if (!res.success) {
      return toast.show("Sign Out failed, please try again later", {
        type: "danger",
      });
    }
    setLoading(false);
  };

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-gray-900 px-6 pt-6"
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
    >
      {/* Heading */}
      <Text className="text-xl sm:text-2xl font-bold dark:text-white mb-6">
        Account Details
      </Text>

      {/* Top section: Role Badge + Profile Picture */}
      <View className="flex-row items-start justify-between mb-6">
        <View className="bg-yellow-500 px-3 py-1 rounded-full">
          <Text className="text-white font-semibold text-xs sm:text-sm">
            {role}
          </Text>
        </View>

        <View className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-chatAvatarBlue">
          {profilePhoto ? (
            <Image
              source={{
                uri: `${process.env.EXPO_PUBLIC_AWS_CLOUDFRONT_URL}${profilePhoto}`,
              }}
              className="w-full h-full"
              style={{ resizeMode: "cover" }}
            />
          ) : (
            <View className="flex-1 justify-center items-center">
              <Text className="text-white font-bold text-xl">
                {namePreview(userName)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Details Section */}
      <View className="flex flex-col gap-3 pb-20">
        <View>
          <Text className="text-gray-400 dark:text-white text-xs">Name</Text>
          <Text className="text-gray-900 dark:text-white font-semibold text-base sm:text-lg">
            {userName}
          </Text>
        </View>

        <View>
          <Text className="text-gray-400 dark:text-white text-xs">
            Organization Name
          </Text>
          <Text className="text-gray-900 dark:text-white font-semibold text-base sm:text-lg">
            {orgName}
          </Text>
        </View>

        <View>
          <Text className="text-gray-400 dark:text-white text-xs">
            Phone Number
          </Text>
          <Text className="text-gray-900 dark:text-white font-semibold text-base sm:text-lg">
            {orgPhone}
          </Text>
        </View>

        <View>
          <Text className="text-gray-400 dark:text-white text-xs">Email</Text>
          <Text className="text-gray-900 dark:text-white font-semibold text-base sm:text-lg">
            {email}
          </Text>
        </View>

        <TouchableOpacity
          className={`rounded-lg flex items-center justify-center ${
            loading ? "bg-gray-800" : "bg-gray-700"
          }`}
          onPress={handleSignOut}
          disabled={loading}
        >
          <Text className="text-white py-3 px-6 text-lg sm:text-xl font-bold">
            {loading ? "Logging Out..." : "Log Out"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default AccountBar;
