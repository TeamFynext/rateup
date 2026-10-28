import { View, Text, ActivityIndicator, useColorScheme } from "react-native";
import React, { useEffect, useState } from "react";
import { checkAuth } from "@/utils/checkAuth";
import { useRouter } from "expo-router";
import { colors } from "@/constants/constants";
import { logger } from "@/utils/logger";

const Index = () => {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const bgColor = isDark ? colors["slate-950"] : "white";

  useEffect(() => {
    const init = async () => {
      let target: "/protected/inbox" | "/auth/SignIn";
      try {
        target = (await checkAuth()) ? "/protected/inbox" : "/auth/SignIn";
      } catch (error) {
        // Offline, API unreachable or the check timed out: the session may still be
        // valid. The protected layout runs its own check and sends the user to
        // sign-in if there is none, so hand over to it rather than spin here.
        logger.error("Startup session check failed:", error);
        target = "/protected/inbox";
      }
      setLoading(false);
      router.replace(target);
    };
    init();
    // Runs once on mount to pick a landing route; re-running on a new `router`
    // identity would redirect the user out of wherever they had navigated to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
