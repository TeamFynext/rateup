import { View, Text, ActivityIndicator, useColorScheme } from "react-native";
import React, { useEffect, useState } from "react";
import { checkAuth } from "@/utils/checkAuth";
import { useRouter } from "expo-router";
import { colors } from "@/constants/constants";

const Index = () => {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const bgColor = isDark ? colors["slate-950"] : "white";

  useEffect(() => {
    const init = async () => {
      const sessionExists = await checkAuth();
      setLoading(false);
      router.replace(sessionExists ? "/protected/inbox" : "/auth/SignIn");
    };
    init();
  }, []);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: bgColor,
        }}
      >
        <ActivityIndicator size="large" />
        <View className="flex items-center justify-center gap-1">
          <Text className="dark:text-white">RateUp is loading...</Text>
        </View>
      </View>
    );
  }

  return null;
};

export default Index;
