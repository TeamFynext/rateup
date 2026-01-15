import { View, Text, Pressable } from "react-native";
import React, { useState } from "react";
import {
  MessageCircleMore,
  PanelsTopLeft,
  Activity,
} from "lucide-react-native";
import { colors } from "@/src/constants/constants";

const MENU_ITEMS = [
  {
    key: "inbox",
    label: "Inbox",
    Icon: MessageCircleMore,
    iconColor: colors["primary-blue"],
  },
  // {
  //   key: "flow",
  //   label: "Flow",
  //   Icon: Activity,
  //   iconColor: "#004F98",
  // },
  // {
  //   key: "webform",
  //   label: "Web Forms",
  //   Icon: PanelsTopLeft,
  //   iconColor: "#004F98",
  // },
];

const MenuBar = ({
  onSendValue,
  selected,
}: {
  onSendValue: (val: any) => void;
  selected: string;
}) => {
  const [selectedInterface, setSelectedInterface] = useState(selected);

  const handlePress = (val: string) => {
    onSendValue(val);
    setSelectedInterface(val);
  };

  return (
    <View className="dark:bg-gray-900">
      <Text className="text-xl font-medium mb-4 dark:text-white">Menu</Text>

      {MENU_ITEMS.map(({ key, label, Icon, iconColor }) => {
        const isSelected = selectedInterface === key;

        return (
          <Pressable
            key={key}
            className={`p-2 rounded-md mb-2 flex-row justify-start items-center gap-1 ${
              isSelected ? "bg-primaryBlue/30" : "bg-white dark:bg-gray-900"
            }`}
            onPress={() => handlePress(key)}
          >
            <Icon
              color={isSelected ? iconColor : colors["light-blue"]}
              width={24}
              height={24}
            />
            <Text
              className={`text-base ${
                isSelected ? "text-primaryBlue" : "text-lightBlue"
              }`}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

export default MenuBar;
