import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View, Text } from "react-native";
import { AuthProvider, useAuth } from "@/src/context/AuthContext";
import "@/src/config/superTokens";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { ToastProvider } from "react-native-toast-notifications";
import { CustomToast } from "@/src/components/CustomToast";
import { UserProvider } from "@/src/context/UserContext";
import { checkAuth } from "@/src/utils/checkAuth";
import { useRegisterPushToken } from "@/src/utils/notification";

export const queryClient = new QueryClient();

function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { userId ,isAuthenticated, loading } = useAuth();
  console.log(userId);
 
  useRegisterPushToken((token)=>{
    console.log("Token:",token)
  })

  useFonts({
    Geist: require("@/assets/fonts/Geist-Regular.ttf"),
  });


  useEffect(() => {
    if (!loading) {
      router.replace(isAuthenticated ? "/Home" : "/(auth)/SignIn");
    }
  }, [loading, isAuthenticated, ]);

  useEffect(()=>{
    async function authChecking() {
      const authStatus = await checkAuth()
      // const authStatus = false
      console.log("Auth Status:",authStatus);
      if(!authStatus){
        return router.replace("/(auth)/SignIn")
      }
    }
    authChecking();
  },[segments])

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
      <UserProvider>
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
      </UserProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}
