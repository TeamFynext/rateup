import { Stack } from "expo-router";
import { AuthProvider } from "@/src/context/AuthContext";
import "@/src/config/superTokens";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { ToastProvider } from "react-native-toast-notifications";
import { CustomToast } from "@/src/components/CustomToast";
import { UserProvider } from "@/src/context/UserContext";

export const queryClient = new QueryClient();

function ProtectedLayout() {
  useFonts({
    Geist: require("@/assets/fonts/Geist-Regular.ttf"),
  });

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
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
      <Stack.Screen
        name="webForms"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="flows"
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
             offsetTop={40}
          >
            <ProtectedLayout />
          </ToastProvider>
        </UserProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}
