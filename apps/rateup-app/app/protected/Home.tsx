import React, { useState, useRef, useEffect, memo, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Animated,
  Image,
  Easing,
  Dimensions,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import {
  MessageCircleMore,
  PanelsTopLeft,
  Activity,
  MenuIcon,
} from "lucide-react-native";
import InboxLayoutComponent from "./inbox/InboxTabs";
import MenuBar from "@/src/components/home/Menu";
import AccountBar from "@/src/components/home/Account";
import { HomeInterface } from "@/src/api/inbox/types";
import { namePreview } from "@/src/utils/chatbox_utils";
import { useLoggedInUser } from "@/src/api/api";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Flow from "./flows/Flow";
import WebForm from "./webForms/WebForm";
import { colors } from "@/src/constants/constants";

const { height: screenHeight } = Dimensions.get("window");

const PANEL_HEIGHT_PERCENTAGE = 0.6;
const PANEL_HEIGHT = screenHeight * PANEL_HEIGHT_PERCENTAGE;

const InboxLayout = memo(InboxLayoutComponent);

const MENU_ITEMS = [
  {
    key: "inbox",
    label: "Inbox",
    Icon: MessageCircleMore,
    iconColor: colors["primary-blue"],
  },
  {
    key: "flow",
    label: "Flow",
    Icon: Activity,
    iconColor: "#004F98",
  },
  {
    key: "webform",
    label: "Web Forms",
    Icon: PanelsTopLeft,
    iconColor: "#004F98",
  },
];

export default function Home() {
  const insets = useSafeAreaInsets();
  const [selectedItem, setSelectedItem] = useState<"account" | null>(null);
  const [shouldRenderOverlay, setShouldRenderOverlay] = useState(false);
  const [selectedInterface, setSelectedInterface] =
    useState<HomeInterface>("inbox");

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const open = selectedItem !== null;
  const queryClient = useQueryClient();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const bgColor = isDark ? colors["gray-900"] : "white";

  const { data: userData, isLoading: loading } = useLoggedInUser();

  const renderedInterface = useMemo(() => {
    switch (selectedInterface) {
      case "inbox":
        return <InboxLayout />;
      case "flow":
        return <Flow />;
      case "webform":
        return <WebForm />;
    }
  }, [selectedInterface]);

  useEffect(() => {
    if (open) {
      setShouldRenderOverlay(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShouldRenderOverlay(false);
      });
    }
  }, [selectedItem]);

  const handleAccountPress = () => {
    if (selectedItem === "account") {
      setSelectedItem(null);
    } else {
      setSelectedItem("account");
      queryClient.invalidateQueries({ queryKey: ["loggedUser"] });
    }
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [PANEL_HEIGHT, 0],
  });

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center dark:bg-slate-950">
        <ActivityIndicator size="large" color={colors["primary-blue"]} />
      </View>
    );
  }

  if (!userData) {
    return null;
  }

  const { email, orgName, role, profilePhoto, orgPhone, userName } = userData;
  return (
    <View
      className="items-center relative flex-grow bg-white dark:bg-slate-950"
      style={{ paddingTop: insets.top }}
    >
      {renderedInterface}

      {/* Dim background overlay */}
      {shouldRenderOverlay && (
        <Pressable
          className="absolute top-0 left-0 right-0 bottom-0 z-10"
          onPress={() => setSelectedItem(null)}
        >
          <Animated.View
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              flex: 1,
              opacity: fadeAnim,
            }}
          />
        </Pressable>
      )}

      {/* Slide-up panel */}
      {shouldRenderOverlay && (
        <Animated.View
          style={{
            transform: [{ translateY }],
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: PANEL_HEIGHT,
            backgroundColor: bgColor,
            zIndex: 20,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingVertical: 30,
            paddingHorizontal: 24,
          }}
        >
          <AccountBar
            email={email}
            orgName={orgName}
            profilePhoto={profilePhoto}
            role={role}
            orgPhone={orgPhone}
            userName={userName}
          />
        </Animated.View>
      )}

      {/* Bottom bar */}
      <View
        className="flex-row justify-between px-8 gap-4 items-center border-t border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-950 py-4 w-full z-30"
        style={{ paddingBottom: insets.bottom }}
      >
        {MENU_ITEMS.map(({ key, label, Icon }) => {
          const isSelected = selectedInterface === key;
          const textColor = isSelected
            ? colors["primary-blue"]
            : isDark
              ? colors["light-blue"]
              : colors["gray-700"];
          return (
            <Pressable
              key={key}
              className={`p-2 rounded-md mb-2 flex-row justify-start items-center gap-1`}
              onPress={() => setSelectedInterface(key)}
            >
              <Icon color={textColor} width={24} height={24} />
            </Pressable>
          );
        })}

        {/* Account Button */}
        <TouchableOpacity activeOpacity={0.8} onPress={handleAccountPress}>
          <View className="min-w-12 h-12 bg-chatAvatarBlue rounded-full flex justify-center items-center">
            {profilePhoto ? (
              <Image
                source={{
                  uri: `${process.env.EXPO_PUBLIC_AWS_CLOUDFRONT_URL}${profilePhoto}`,
                }}
                className="h-full w-full rounded-full"
                style={{ resizeMode: "cover" }}
              />
            ) : (
              <Text className={`font-bold text-[20px] text-white`}>
                {namePreview(userName)}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}
