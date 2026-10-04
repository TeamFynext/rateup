import React, { useState } from "react";
import { Modal, View, Pressable } from "react-native";
import Image from "@/components/common/Image";
import { X } from "lucide-react-native";
import { useTheme } from "@/components/loyalty/cashier/ui";

type ImageResponseProps = {
  info: string;
  onClose?: () => void;
};

const ImageResponse = ({ info, onClose }: ImageResponseProps) => {
  const { t } = useTheme();
  const [fullscreenVisible, setFullscreenVisible] = useState(false);

  const imageUrl = `${process.env.EXPO_PUBLIC_AWS_CLOUDFRONT_URL}${info}`;

  const handleClose = () => {
    setFullscreenVisible(false);
    onClose?.(); // trigger optional callback
  };

  return (
    <>
      <Pressable
        onPress={() => setFullscreenVisible(true)}
        accessibilityRole="imagebutton"
        accessibilityLabel="Open photo full screen"
        style={{
          alignSelf: "flex-start",
          borderRadius: 12,
          borderWidth: 1,
          borderColor: t.border1,
          overflow: "hidden",
        }}
      >
        <Image source={{ uri: imageUrl }} style={{ width: 192, height: 192 }} contentFit="cover" />
      </Pressable>

      <Modal
        visible={fullscreenVisible}
        animationType="fade"
        onRequestClose={handleClose} // hardware back button
      >
        <View className="flex-1 bg-black">
          {/* Close Button */}
          <Pressable
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              zIndex: 10,
              padding: 8,
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.8)",
            }}
          >
            <X size={20} color="black" />
          </Pressable>

          {/* Centered Image */}
          <View className="flex-1 justify-center items-center">
            <Image source={{ uri: imageUrl }} contentFit="contain" className="w-[90%] h-[90%]" />
          </View>
        </View>
      </Modal>
    </>
  );
};

export default ImageResponse;
