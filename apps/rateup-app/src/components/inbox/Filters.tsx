import {
  View,
  Text,
  KeyboardAvoidingView,
  TextInput,
  TouchableOpacity,
  Pressable,
  Keyboard,
} from "react-native";
import React, { useEffect, useState } from "react";
import { BackIcon } from "@/src/constants/imageExports";
import { useRouter } from "expo-router";

const FiltersScreen = () => {
  const router = useRouter();
  const [keyboardStatus, setKeyboardStatus] = useState<boolean>(false);
  const [result, setResult] = useState<number>(123);

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () => {
      setKeyboardStatus(true);
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardStatus(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);
  return (
    <KeyboardAvoidingView className="bg-white h-screen">
      <View
        className={
          keyboardStatus
            ? "flex justify-between p-4 h-[50vh]"
            : "flex justify-between p-4 h-screen"
        }
      >
        <View>
          <View className="flex-row justify-between p-3">
            <View className="flex-row items-center gap-2">
              <Pressable onPress={() => router.back()}>
                <BackIcon />
              </Pressable>
              <Text className="text-2xl font-bold">Filters</Text>
            </View>

            <TouchableOpacity className="bg-[#E2E5ED] px-4 py-3 rounded-full">
              <Text className="text-md">Clear all</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            placeholder="Search Tags, Groups and Campaigns"
            placeholderTextColor="#E2E5ED"
            className="border border-[#E2E5ED] px-3 py-3 rounded-full"
          />
        </View>

        <Pressable className="bg-rateUpGreen rounded-xl py-4">
          <Text className="text-white text-center font-bold text-lg">
            Show {result} results
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
};

export default FiltersScreen;
