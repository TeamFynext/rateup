import { View, Text, Image, TouchableOpacity, ScrollView } from "react-native";
import React, { useState } from "react";
import { namePreview } from "../../utils/chatbox_utils";
import { signOut } from "@/src/api/api";

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

  const handleSignOut = async () => {
    setLoading(true);
    await signOut();
    setLoading(false);
  };

  return (
    <ScrollView
      className="flex-1 bg-white px-6 pt-6"
      contentContainerStyle={{ flexGrow: 1 }}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
    >
      {/* Heading */}
      <Text className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">
        Account Details
      </Text>

      {/* Top section: Role Badge + Profile Picture */}
      <View className="flex-row items-start justify-between mb-6">
        <View className="bg-[#FFA500] px-3 py-1 rounded-full">
          <Text className="text-white font-semibold text-xs sm:text-sm">
            {role}
          </Text>
        </View>

        <View className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-gray-200">
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
              <Text className="text-rateUpGreen font-bold text-xl">
                {namePreview(userName)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Details Section */}
      <View className="flex flex-col gap-3 pb-20">
        <View>
          <Text className="text-gray-400 text-xs">Name</Text>
          <Text className="text-gray-900 font-semibold text-base sm:text-lg">
            {userName}
          </Text>
        </View>

        <View>
          <Text className="text-gray-400 text-xs">Organization Name</Text>
          <Text className="text-gray-900 font-semibold text-base sm:text-lg">
            {orgName}
          </Text>
        </View>

        <View>
          <Text className="text-gray-400 text-xs">Phone Number</Text>
          <Text className="text-gray-900 font-semibold text-base sm:text-lg">
            {orgPhone}
          </Text>
        </View>

        <View>
          <Text className="text-gray-400 text-xs">Email</Text>
          <Text className="text-gray-900 font-semibold text-base sm:text-lg">
            {email}
          </Text>
        </View>

        <TouchableOpacity
          className={`rounded-lg flex items-center justify-center ${
            loading ? "bg-[#343a4061]" : "bg-[#343A40]"
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
