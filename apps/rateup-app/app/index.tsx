import { View, Text, ActivityIndicator } from "react-native";
import React, { useEffect, useState } from "react";
import { checkAuth } from "@/src/utils/checkAuth";
import { useRouter } from "expo-router";

const index = () => {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
        <Text>Just a moment</Text>
      </View>
    );
  }
};

export default index;
