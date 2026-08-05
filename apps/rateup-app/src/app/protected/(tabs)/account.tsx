import AccountBar from "@/components/home/Account";
import { useLoggedInUser } from "@/api/api";
import { ActivityIndicator, View, Text, ScrollView, RefreshControl } from "react-native";
import { colors } from "@/constants/constants";
import { UserX } from "lucide-react-native";
import { useState, useCallback } from "react";

export default function AccountScreen() {
  const { data: userData, isLoading, isError, refetch } = useLoggedInUser();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading && !refreshing) {
    return (
      <View className="flex-1 justify-center items-center dark:bg-slate-950">
        <ActivityIndicator size="large" color={colors["primary-blue"]} />
      </View>
    );
  }

  const renderContent = () => {
    if (isError) {
      return (
        <View className="flex-1 justify-center items-center bg-white dark:bg-slate-950 min-h-[80vh]">
          <UserX size={48} color="#9CA3AF" />
          <Text className="text-lg font-medium text-gray-700 dark:text-gray-300 mt-4">
            Check your internet connection
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center px-6">
            We couldn&apos;t reach the server to fetch your account details.
          </Text>
        </View>
      );
    }

    if (!userData) {
      return null;
    }

    const {
      email,
      orgName,
      role,
      profilePhoto,
      orgPhone,
      userName,
      orgId,
      userId,
    } = userData;

    return (
      <View className="flex-1 bg-white dark:bg-slate-950 min-h-[80vh]">
        <AccountBar
          email={email}
          userId={userId}
          orgName={orgName}
          role={role}
          profilePhoto={profilePhoto}
          orgPhone={orgPhone}
          userName={userName}
          orgId={orgId}
        />
      </View>
    );
  };

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      className="bg-white dark:bg-slate-950"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors["primary-blue"]}
          colors={[colors["primary-blue"]]}
        />
      }
    >
      {renderContent()}
    </ScrollView>
  );
}
