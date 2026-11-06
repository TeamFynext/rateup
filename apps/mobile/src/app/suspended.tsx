import { useState } from "react";
import { ActivityIndicator, Linking, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { signOut } from "@/api/api";
import { StarMark } from "@/constants/imageExports";
import { clearSuspendedRedirect } from "@/config/axios";

const SUPPORT_EMAIL = "hello@rateup.app";

/**
 * Where the app lands when the API answers ORG_SUSPENDED (src/config/axios.ts): RateUp
 * staff have suspended the whole organisation, so every request is refused until they
 * restore it. Outside /protected on purpose — that layout's queries would only be refused
 * again. The only ways on are support and signing out.
 */
export default function SuspendedScreen() {
  const [signingOut, setSigningOut] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black">
      <View className="flex-1 items-center justify-center gap-5 px-8">
        <StarMark width={64} height={64} />
        <Text className="text-center text-2xl font-bold text-black dark:text-white">
          This account is suspended
        </Text>
        <Text className="text-center text-base text-[#7A8289] dark:text-gray-400">
          Sign-in, messaging and the API are switched off for your organisation. Please contact
          RateUp support to restore it.
        </Text>
        <Pressable onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}>
          <Text className="text-base font-semibold text-[#1C518E] dark:text-blue-400">
            {SUPPORT_EMAIL}
          </Text>
        </Pressable>
        <Pressable
          disabled={signingOut}
          onPress={async () => {
            setSigningOut(true);
            clearSuspendedRedirect();
            // Sends the app to the sign-in screen whether or not the server answered.
            await signOut();
            setSigningOut(false);
          }}
          className="mt-4 w-full items-center rounded-xl bg-black py-4 dark:bg-white"
        >
          {signingOut ? (
            <ActivityIndicator />
          ) : (
            <Text className="text-base font-semibold text-white dark:text-black">Sign out</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
