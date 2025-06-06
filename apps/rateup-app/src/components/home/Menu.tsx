import { View, Text, Pressable } from "react-native";
import React, { useState } from "react";
import { MessageCircleMore, PanelsTopLeft } from "lucide-react-native";
import WhatsAppIcon from "@/assets/images/whatsapp";

const MENU_ITEMS = [
  {
    key: "inbox",
    label: "Inbox",
    Icon: MessageCircleMore,
    iconColor: "#004F98",
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    Icon: WhatsAppIcon,
    iconColor: "#004F98",
  },
  {
    key: "webform",
    label: "Web Forms",
    Icon: PanelsTopLeft,
    iconColor: "#004F98",
  },
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
    <View>
      <Text className="text-xl font-medium mb-4">Menu</Text>

      {MENU_ITEMS.map(({ key, label, Icon, iconColor }) => {
        const isSelected = selectedInterface === key;

        return (
          <Pressable
            key={key}
            className={`p-2 rounded-md mb-2 flex-row justify-start items-center gap-1 ${
              isSelected ? "bg-[#C4D7F5]" : "bg-white"
            }`}
            onPress={() => handlePress(key)}
          >
            <Icon
              color={isSelected ? iconColor : "#C4D7F5"}
              width={24}
              height={24}
            />
            <Text
              className={`text-base ${
                isSelected ? "text-[#004F98]" : "text-[#7A8289]"
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
