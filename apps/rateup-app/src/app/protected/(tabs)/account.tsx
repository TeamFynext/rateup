import AccountBar from "@/components/home/Account";
import { useLoggedInUser } from "@/api/api";
import { ActivityIndicator, View } from "react-native";
import { colors } from "@/constants/constants";

export default function AccountScreen() {
  const { data: userData, isLoading } = useLoggedInUser();

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center dark:bg-slate-950">
        <ActivityIndicator size="large" color={colors["primary-blue"]} />
      </View>
    );
  }

  if (!userData) {
    return null;
  }

  const { email, orgName, role, profilePhoto, orgPhone, userName, orgId } =
    userData;

  return (
    <View className="flex-1 bg-white dark:bg-slate-950">
      <AccountBar
        email={email}
        orgName={orgName}
        role={role}
        profilePhoto={profilePhoto}
        orgPhone={orgPhone}
        userName={userName}
        orgId={orgId}
      />
    </View>
  );
}
