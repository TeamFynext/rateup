import { router } from "expo-router";
import { View } from "react-native";

import { useLoggedInUser } from "@/api/api";
import ScreenHeader from "@/components/common/ScreenHeader";
import Security from "@/components/home/Security";
import { CenteredSpinner, useTheme } from "@/components/loyalty/cashier/ui";

export default function SecurityScreen() {
  const { t } = useTheme();
  const { data: user } = useLoggedInUser();

  return (
    <View style={{ flex: 1, backgroundColor: t.pageBg }}>
      <ScreenHeader title="Security" onBack={() => router.back()} />
      {user?.userId ? <Security userId={user.userId} /> : <CenteredSpinner />}
    </View>
  );
}
