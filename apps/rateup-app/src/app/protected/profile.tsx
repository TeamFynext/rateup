import { router } from "expo-router";
import { View } from "react-native";

import { useLoggedInUser } from "@/api/api";
import ScreenHeader from "@/components/common/ScreenHeader";
import EditProfile from "@/components/home/EditProfile";
import { CenteredSpinner, useTheme } from "@/components/loyalty/cashier/ui";

export default function ProfileScreen() {
  const { t } = useTheme();
  const { data: user } = useLoggedInUser();

  return (
    <View style={{ flex: 1, backgroundColor: t.pageBg }}>
      <ScreenHeader title="Edit profile" onBack={() => router.back()} />
      {user ? (
        <EditProfile name={user.userName ?? ""} profilePhoto={user.profilePhoto} />
      ) : (
        <CenteredSpinner />
      )}
    </View>
  );
}
