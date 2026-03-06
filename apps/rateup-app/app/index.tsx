import { View, Text, ActivityIndicator } from "react-native";
import React, { useEffect, useState } from "react";
import { checkAuth } from "@/src/utils/checkAuth";
import { useRouter } from "expo-router";
import { useColorScheme } from "react-native";
import { colors } from "@/src/constants/constants";

const index = () => {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const bgColor = isDark ? colors["slate-950"] : "white";

  useEffect(() => {
    const init = async () => {
      const sessionExists = await checkAuth();
      setLoading(false);
      router.replace(sessionExists ? "/protected/Home" : "/auth/SignIn");
    };
    init();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor:bgColor }}>
        <ActivityIndicator size="large" />
        <View className="flex items-center justify-center gap-1">
          <Text className="dark:text-white">RateUp is loading...</Text>
        </View>
      </View>
    );
  }
};

export default index;
