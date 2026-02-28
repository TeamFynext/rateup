import React, { useEffect, useRef, useState } from "react";
import { View, ActivityIndicator, Pressable } from "react-native";
import { Mic, CircleStop } from "lucide-react-native";
import { uploadFile, getFileUrlFromKey } from "@/src/utils/fileUpload";
import { create } from "zustand";
import { useToast } from "react-native-toast-notifications";
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from "expo-audio";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { colors } from "@/src/constants/constants";

const requestPermission = async () => {
  const { granted } = await requestRecordingPermissionsAsync();
  if (granted) {
    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: true,
    });
  }
  return granted;
};

const WaveBar = ({ delay }: { delay: number }) => {
  const height = useSharedValue(4);

  useEffect(() => {
    height.value = withDelay(
      delay,
      withRepeat(
        withTiming(20, {
          duration: 400,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true,
      ),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: 4,
          backgroundColor: colors["primary-blue"],
          borderRadius: 2,
          marginHorizontal: 2,
        },
        animatedStyle,
      ]}
    />
  );
};

const VoiceWave = () => {
  return (
    <View
      style={{ flexDirection: "row", alignItems: "flex-end", marginRight: 10 }}
    >
      {[0, 100, 200, 300, 400].map((delay, index) => (
        <WaveBar key={index} delay={delay} />
      ))}
    </View>
  );
};

const VoiceRecorder = ({
  onRecordingUpload,
  iconColor,
}: {
  iconColor?: string;
  onRecordingUpload?: (file: {
    key: string;
    url: string;
    name: string;
  }) => void;
}) => {
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const toast = useToast();

  const startRecording = async () => {
    if (!(await requestPermission())) return;
    await audioRecorder.prepareToRecordAsync();
    audioRecorder.record();
    setIsRecording(true);
  };

  const stopRecording = async () => {
    await audioRecorder.stop();
    const result = audioRecorder.uri;
    setIsRecording(false);
    const name = `voice-${Date.now()}.m4a`;
    setIsUploading(true);
    try {
      //@ts-ignore
      const key = await uploadFile({ uri: result, name, type: "audio/mp4" });
      const url = getFileUrlFromKey(key);
      //@ts-ignore
      onRecordingUpload?.({ key, url, name });
    } catch (err) {
      toast.show("Voice upload failed", { type: "danger" });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View className="flex-row items-center gap-2 mb-3">
      {isRecording && <VoiceWave />}
      {isUploading ? (
        <ActivityIndicator size="small" color="gray" />
      ) : (
        <Pressable
          onPress={isRecording ? stopRecording : startRecording}
        >
          {isRecording ? (
            <CircleStop size={30} color={iconColor} strokeWidth={1.5} />
          ) : (
            <Mic size={30} color={iconColor} strokeWidth={1.5} />
          )}
        </Pressable>
      )}
    </View>
  );
};

type VoiceStore = {
  isRecording: boolean;
  isPlaying: boolean;
  filePath: string | null;
  fileKey: string | null;
  set: (data: Partial<VoiceStore>) => void;
  reset: () => void;
};

export const useVoiceStore = create<VoiceStore>((set) => ({
  isRecording: false,
  isPlaying: false,
  filePath: null,
  fileKey: null,
  set: (data) => set((state) => ({ ...state, ...data })),
  reset: () =>
    set({
      isRecording: false,
      isPlaying: false,
      filePath: null,
      fileKey: null,
    }),
}));

export default VoiceRecorder;
