import React, { useRef, useState } from "react";
import {
  View,
  TextInput,
  Dimensions,
  TouchableOpacity,
  Animated,
  Easing,
} from "react-native";
import { EmojiIcon, PlusIcon, SendIcon } from "@/src/constants/imageExports";
import { useContactIdStore } from "@/src/utils/store";
import { useSendNewWaMessage } from "@/src/api/inbox/messages/message.query";

const MessageSendPanel = () => {
  const screenWidth = Dimensions.get("window").width;
  const inputWidth = screenWidth * 0.85;
  const selectedContactId = useContactIdStore((state) => state.selectedContactId);

  const rotateAnim = useRef(new Animated.Value(0)).current;
  const [message, setMessage] = useState("");
//@ts-ignore
  const mutation = useSendNewWaMessage(selectedContactId);

  const handlePlusPress = () => {
    rotateAnim.stopAnimation((currentValue) => {
      const toValue = currentValue === 0 ? 1 : 0;
      Animated.timing(rotateAnim, {
        toValue,
        duration: 150,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    });
  };

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || !selectedContactId) return;

    mutation.mutate({
      type: "text",
      text: { body: trimmed },
      media:[]
    });
    setMessage(""); 
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "145deg"],
  });

  return (
    <View className="bg-white py-3 px-2 flex-row items-center justify-between">
      <View
        className="bg-white border border-[#E2E5ED] flex-row items-center px-3 rounded-full gap-2"
        style={{ width: inputWidth, height: 48 }}
      >
        <TouchableOpacity onPress={handlePlusPress}>
          <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
            <PlusIcon />
          </Animated.View>
        </TouchableOpacity>

        <TextInput
          className="flex-1 text-base text-black py-2"
          placeholder="Type a message or '/' for commands"
          placeholderTextColor="#7A8289"
          multiline
          value={message}
          onChangeText={setMessage}
          onSubmitEditing={handleSend}
        />

        <TouchableOpacity>
          <EmojiIcon />
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={handleSend} className="ml-2">
        <SendIcon />
      </TouchableOpacity>
    </View>
  );
};

export default MessageSendPanel;
