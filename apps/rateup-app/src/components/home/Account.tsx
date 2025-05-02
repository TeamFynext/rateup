import { View, Text, Image, TouchableOpacity } from "react-native";
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
    <View className="flex-1 bg-white p-6">
      {/* Heading */}
      <Text className="text-xl font-bold text-gray-900 mb-6">
        Account Details
      </Text>

      {/* Top section: Role Badge + Profile Picture */}
      <View className="flex-row items-start justify-between mb-6">
        {/* Role Badge */}
        <View className="bg-[#FFA500] px-3 py-1 rounded-full">
          <Text className="text-white font-semibold text-xs">{role}</Text>
        </View>

        {/* Profile Picture */}
        <View className="w-16 h-16 rounded-full overflow-hidden bg-gray-200">
          {profilePhoto ? (
            <Image
              source={{ uri: profilePhoto }}
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
      <View className="flex gap-4">
        <View>
          <Text className="text-gray-400 text-xs">Name</Text>
          <Text className="text-gray-900 font-semibold text-base">
            {userName}
          </Text>
        </View>

        <View>
          <Text className="text-gray-400 text-xs">Organization Name</Text>
          <Text className="text-gray-900 font-semibold text-base">
            {orgName}
          </Text>
        </View>

        <View>
          <Text className="text-gray-400 text-xs">Phone Number</Text>
          <Text className="text-gray-900 font-semibold text-base">
            {orgPhone}
          </Text>
        </View>

        <View>
          <Text className="text-gray-400 text-xs">Email</Text>
          <Text className="text-gray-900 font-semibold text-base">{email}</Text>
        </View>

        <TouchableOpacity
          className={`rounded-lg flex items-center justify-center ${
            loading ? "bg-[#343a4061] " : "bg-[#343A40]"
          }`}
          onPress={handleSignOut}
          disabled={loading}
        >
          <Text className="text-white p-3 text-xl font-bold">
            {loading ? "Logging Out..." : "Log Out"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default AccountBar;
