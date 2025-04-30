// app/_layout.tsx
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View, Text } from "react-native";
import { AuthProvider, useAuth } from "@/src/context/AuthContext";
import "@/src/config/superTokens";
import { QueryClient,QueryClientProvider } from "@tanstack/react-query";
import {useFonts} from "expo-font"
import { ToastProvider } from "react-native-toast-notifications"; 

export const queryClient = new QueryClient();


function RootLayout() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useFonts({
    Geist: require('@/assets/fonts/Geist-Regular.ttf')
  });

  

  useEffect(() => {
    if (!loading) {
      router.replace(isAuthenticated ? "/Home" : "/SignIn");
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

  return(
    <Stack
    screenOptions={{
      headerShown:false
    }}>
      <Stack.Screen 
      name="(auth)" 
      options={{
        headerShown:false
      }}
      />
      <Stack.Screen
      name="Home"
      options={{
        headerShown:false
      }}
      />
      <Stack.Screen
      name="inbox"
      options={{
        headerShown:false
      }}
      />
    </Stack>
  )
}

// Wrap everything in AuthProvider
export default function LayoutWrapper() {
  return (
    <AuthProvider>
        <QueryClientProvider client={queryClient}>
        <ToastProvider
         placement="top"
         duration={3000}
         animationType="slide-in"
         successColor="#22c55e"
         dangerColor="#ef4444"
         warningColor="#facc15"
         textStyle={{ fontFamily: "Geist" }}>
        <RootLayout />
        </ToastProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}
