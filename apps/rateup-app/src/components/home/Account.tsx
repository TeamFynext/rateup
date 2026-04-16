import { Toast } from "toastify-react-native";
import { View, Text, Image, ScrollView, TextInput, Modal } from "react-native";
import React, { useState } from "react";
import { namePreview } from "../../utils/chatbox_utils";
import { deleteOrg, signOut } from "@/api/api";
import { Ionicons } from "@expo/vector-icons";
import { Pressable } from "react-native";
import { useMutation } from "@tanstack/react-query";

interface UserProfile {
  email: string;
  orgName: string;
  role: string;
  profilePhoto: string;
  orgPhone: string;
  userName: string;
  orgId: string;
}

const AccountBar = ({
  email,
  orgName,
  role,
  profilePhoto,
  orgPhone,
  userName,
  orgId,
}: UserProfile) => {
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const isValid = confirmText === "DELETE ORGANIZATION";

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

    Toast.show({
      type: "success",
      text1: "Logged out successfully",
    });

    setLoading(false);
  };

  const orgDeleteMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => deleteOrg(id),

    onSuccess: () => {
      Toast.show({
        type: "success",
        text1: "Organization deleted successfully",
      });

      setShowDeleteModal(false);
      setConfirmText("");

      // logout after delete
      handleSignOut();
    },

    onError: (error: any) => {
      Toast.show({
        type: "error",
        text1: error?.message || "Failed to delete organization",
      });
    },
  });

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
                <Text className="text-white text-2xl font-bold">
                  {namePreview(userName)}
                </Text>
              </View>
            )}
          </View>

          <Text className="text-xl font-semibold mt-4 dark:text-white">
            {userName}
          </Text>

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

        {/* Delete */}
        {role === "SUPER_ADMIN" && (
          <Pressable
            onPress={() => setShowDeleteModal(true)}
            className="mt-6 bg-red-50 border border-red-200 py-4 rounded-xl items-center active:bg-red-100"
          >
            <Text className="text-red-500 font-semibold">
              Delete Organization
            </Text>
          </Pressable>
        )}

        {/* Logout */}
        <Pressable
          onPress={handleSignOut}
          disabled={loading}
          className={`mt-4 py-4 rounded-xl items-center ${
            loading ? "bg-gray-200" : "bg-red-500 active:bg-red-600"
          }`}
        >
          <Text className="text-white font-semibold">
            {loading ? "Logging Out..." : "Log Out"}
          </Text>
        </Pressable>
      </ScrollView>

      {/* MODAL */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/50 px-6">
          <View className="bg-white dark:bg-slate-900 w-full rounded-2xl p-6">
            <Text className="text-lg font-semibold mb-2 dark:text-white">
              Delete Organization
            </Text>

            <Text className="text-gray-500 mb-4">
              Type <Text className="font-bold">DELETE ORGANIZATION</Text> to
              confirm.
            </Text>

            <TextInput
              value={confirmText}
              onChangeText={(text) => setConfirmText(text.toUpperCase())}
              placeholder="DELETE ORGANIZATION"
              className="border border-gray-300 rounded-lg px-4 py-3 mb-4 text-gray-800 dark:text-white"
            />

            {/* Buttons */}
            <View className="flex-row justify-end gap-3">
              {/* Cancel */}
              <Pressable
                onPress={() => {
                  if (orgDeleteMutation.isPending) return;
                  setShowDeleteModal(false);
                  setConfirmText("");
                }}
                className="px-4 py-2 rounded-lg bg-gray-100 active:bg-gray-200"
              >
                <Text className="text-gray-600 font-medium">Cancel</Text>
              </Pressable>

              {/* Delete */}
              <Pressable
                disabled={!isValid || orgDeleteMutation.isPending}
                onPress={() => {
                  if (!isValid) {
                    return Toast.show({
                      type: "error",
                      text1: "Type DELETE ORGANIZATION correctly",
                    });
                  }

                  orgDeleteMutation.mutate({ id: orgId });
                }}
                className={`px-4 py-2 rounded-lg ${
                  !isValid || orgDeleteMutation.isPending
                    ? "bg-red-200"
                    : "bg-red-500 active:bg-red-600"
                }`}
              >
                <Text className="text-white font-semibold">
                  {orgDeleteMutation.isPending ? "Deleting..." : "Delete"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default AccountBar;
