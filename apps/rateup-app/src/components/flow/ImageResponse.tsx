import React, { useState } from "react";
import { Modal, View, Image, Pressable, TouchableOpacity } from "react-native";
import { X } from "lucide-react-native";

type ImageResponseProps = {
  info: string;
  onClose?: () => void;
};

const ImageResponse = ({ info, onClose }: ImageResponseProps) => {
  const [fullscreenVisible, setFullscreenVisible] = useState(false);

  const imageUrl = `${process.env.EXPO_PUBLIC_AWS_CLOUDFRONT_URL}${info}`;

  const handleClose = () => {
    setFullscreenVisible(false);
    onClose?.(); // trigger optional callback
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setFullscreenVisible(true)}
        className="flex"
      >
        <Image
          source={{ uri: imageUrl }}
          className="h-48 w-48 rounded-lg"
          resizeMode="cover"
        />
      </TouchableOpacity>

      <Modal
        visible={fullscreenVisible}
        animationType="fade"
        onRequestClose={handleClose} // hardware back button
      >
        <View className="flex-1 bg-black">
          {/* Close Button */}
          <Pressable
            onPress={handleClose}
            className="absolute top-5 right-5 bg-white/80 rounded-full p-2 z-10"
          >
            <X size={20} color="black" />
          </Pressable>

          {/* Centered Image */}
          <View className="flex-1 justify-center items-center">
            <Image
              source={{ uri: imageUrl }}
              resizeMode="contain"
              className="w-[90%] h-[90%]"
            />
          </View>
        </View>
      </Modal>
    </>
  );
};

export default ImageResponse;
