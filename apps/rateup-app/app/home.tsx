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
} from "react-native";
import { MenuIcon } from "lucide-react-native";
import InboxLayoutComponent from "./inbox/InboxTabs";
import MenuBar from "@/src/components/home/Menu";
import AccountBar from "@/src/components/home/Account";
import { useAuth } from "@/src/context/AuthContext";
import { HomeInterface } from "@/src/api/inbox/types";
import { namePreview } from "@/src/utils/chatbox_utils";
import { useLoggedInUser } from "@/src/api/api";

const { height: screenHeight } = Dimensions.get("window");

const PANEL_HEIGHT_PERCENTAGE = 0.6;
const PANEL_HEIGHT = screenHeight * PANEL_HEIGHT_PERCENTAGE;

const InboxLayout = memo(InboxLayoutComponent);

export default function Home() {
  const { userId } = useAuth();
  const [selectedItem, setSelectedItem] = useState<"menu" | "account" | null>(
    null
  );
  const [lastOpenedItem, setLastOpenedItem] = useState<
    "menu" | "account" | null
  >(null);
  const [shouldRenderOverlay, setShouldRenderOverlay] = useState(false);
  const [selectedInterface, setSelectedInterface] =
    useState<HomeInterface>("inbox");

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const open = selectedItem !== null;

  const {
    data: userData,
    isLoading: loading,
    isError,
    refetch,
  } = useLoggedInUser();

  const renderedInterface = useMemo(() => {
    switch (selectedInterface) {
      case "inbox":
        return <InboxLayout />;
      case "whatsapp":
        return <Text className="flex-1">WhatsApp</Text>;
      default:
        return <Text className="flex-1">Nothing to show here</Text>;
    }
  }, [selectedInterface]);

  useEffect(() => {
    if (open) {
      setLastOpenedItem(selectedItem);
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
        setLastOpenedItem(null);
      });
    }
  }, [selectedItem]);

  const handleAccountPress = () => {
    if (selectedItem === "account") {
      setSelectedItem(null);
    } else {
      setSelectedItem("account");
      refetch();
    }
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [PANEL_HEIGHT, 0],
  });

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#004F98" />
      </View>
    );
  }

  if (!userData) {
    return null;
  }

  const { email, orgName, role, profilePhoto, orgPhone, userName } = userData;
  return (
    <View className="flex-1 items-center relative">
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
            backgroundColor: "#fff",
            zIndex: 20,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingVertical: 16,
            paddingHorizontal: 24,
          }}
        >
          {lastOpenedItem === "menu" ? (
            <MenuBar
              onSendValue={(val: HomeInterface) => setSelectedInterface(val)}
              selected={selectedInterface}
            />
          ) : (
            <AccountBar
              email={email}
              orgName={orgName}
              profilePhoto={profilePhoto}
              role={role}
              orgPhone={orgPhone}
              userName={userName}
            />
          )}
        </Animated.View>
      )}

      {/* Bottom bar */}
      <View className="flex-row justify-center gap-4 items-center border-t border-gray-300 bg-white py-4 w-full z-30">
        {/* Menu Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() =>
            selectedItem === "menu"
              ? setSelectedItem(null)
              : setSelectedItem("menu")
          }
        >
          <View
            className={`flex-row justify-center items-center p-2 min-w-12 h-12 rounded-full ${
              selectedItem === "menu" ? "bg-[#004F98]" : "bg-[#C4D7F5]"
            }`}
          >
            <MenuIcon color={selectedItem === "menu" ? "white" : "#004F98"} />
            {selectedItem === "menu" && (
              <Text className="text-white font-semibold px-2">Menu</Text>
            )}
          </View>
        </TouchableOpacity>

        {/* Account Button */}
        <TouchableOpacity activeOpacity={0.8} onPress={handleAccountPress}>
          <View
            className={`flex-row justify-center items-center min-w-12 h-12 rounded-full ${
              selectedItem === "account" ? "bg-[#004F98] pl-2" : "bg-[#C4D7F5]"
            }`}
          >
            {selectedItem === "account" && (
              <Text className="text-white font-semibold px-2">Account</Text>
            )}
            <View className="min-w-12 h-12 bg-[#00998733] rounded-full flex justify-center items-center">
              {profilePhoto ? (
                <Image
                  source={{ uri: profilePhoto }}
                  className="h-full w-full rounded-full"
                  style={{ resizeMode: "cover" }}
                />
              ) : (
                <Text
                  className={`font-bold text-[20px] ${
                    selectedItem === "account" ? "text-white" : "text-[#009987]"
                  }`}
                >
                  {namePreview(userName)}
                </Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}
