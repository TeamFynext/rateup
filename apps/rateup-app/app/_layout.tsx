import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View, Text } from "react-native";
import { AuthProvider, useAuth } from "@/src/context/AuthContext";
import "@/src/config/superTokens";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { ToastProvider } from "react-native-toast-notifications";
import { CustomToast } from "@/src/components/CustomToast";

export const queryClient = new QueryClient();

function RootLayout() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useFonts({
    Geist: require("@/assets/fonts/Geist-Regular.ttf"),
  });


  useEffect(() => {
    if (!loading) {
      router.replace(isAuthenticated ? "/Home" : "/(auth)/SignIn");
    }
  }, [loading, isAuthenticated]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="(auth)"
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="Home"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="inbox"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}

export default function LayoutWrapper() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider
          placement="top"
          duration={3000}
          animationType="slide-in"
          renderToast={(toastOptions) => (
            <CustomToast
              //@ts-ignore
              message={toastOptions.message}
              //@ts-ignore
              type={toastOptions.type}
            />
          )}
        >
          <RootLayout />
        </ToastProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}
