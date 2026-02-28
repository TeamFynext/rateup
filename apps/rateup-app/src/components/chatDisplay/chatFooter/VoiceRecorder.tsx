import React, { useEffect, useRef, useState } from "react";
import {
  View,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from "react-native";
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

const VoiceVisualizer = () => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.4,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();

    return () => pulse.stop();
  }, []);

  return (
    <Animated.View
      style={{
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: "red",
        transform: [{ scale: scaleAnim }],
        marginRight: 10,
      }}
    />
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
    console.log("result",result);
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
      {isRecording && <VoiceVisualizer />}
      {isUploading ? (
        <ActivityIndicator size="small" color="gray" />
      ) : (
        <TouchableOpacity
          onPress={isRecording ? stopRecording : startRecording}
        >
          {isRecording ? (
            <CircleStop size={30} color={iconColor} strokeWidth={1.5} />
          ) : (
            <Mic size={30} color={iconColor} strokeWidth={1.5} />
          )}
        </TouchableOpacity>
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
