import { useLoggedInUser } from "@/api/api";
import AccountBar from "@/components/home/Account";
import ScreenHeader from "@/components/common/ScreenHeader";
import { colors } from "@/constants/constants";
import { getInboxRowTheme } from "@/constants/inboxDesign";
import { UserX } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useCallback, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";

export default function AccountScreen() {
  const { data: userData, isLoading, isError, refetch } = useLoggedInUser();
  const [refreshing, setRefreshing] = useState(false);
  const { colorScheme } = useColorScheme();
  const t = getInboxRowTheme(colorScheme === "dark");

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderContent = () => {
    if (isLoading && !refreshing) {
      return (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors["primary-blue"]} />
        </View>
      );
    }

    if (isError) {
      return (
        <View className="flex-1 justify-center items-center min-h-[70vh]">
          <UserX size={48} color={t.fg4} />
          <Text className="text-lg font-medium mt-4" style={{ color: t.fg1 }}>
            Check your internet connection
          </Text>
          <Text className="text-sm mt-2 text-center px-6" style={{ color: t.fg3 }}>
            We couldn&apos;t reach the server to fetch your account details.
          </Text>
        </View>
      );
    }

    if (!userData) {
      return null;
    }

    const { email, orgName, role, roleKey, profilePhoto, orgPhone, userName, orgId } = userData;

    return (
      <View className="flex-1 min-h-[70vh]">
        <AccountBar
          email={email}
          orgName={orgName}
          role={role}
          roleKey={roleKey}
          profilePhoto={profilePhoto}
          orgPhone={orgPhone}
          userName={userName}
          orgId={orgId}
        />
      </View>
    );
  };

  // The bar stays mounted through loading and the error state, so the tab reads as the
  // same screen throughout rather than appearing only once the fetch lands — and it is
  // the same `ScreenHeader` the other four tabs use, at the one title size and weight.
  return (
    <View style={{ flex: 1, backgroundColor: t.pageBg }}>
      <ScreenHeader title="Account Details" />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
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
    </View>
  );
}
