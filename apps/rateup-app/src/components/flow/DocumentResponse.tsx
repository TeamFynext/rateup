import { Toast } from "toastify-react-native";
import React, { useEffect, useState } from "react";
import { Linking, Platform, Text, TouchableOpacity, View } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import requestStoragePermission from "@/utils/permission";
import { Download, Eye, File } from "lucide-react-native";
import * as IntentLauncher from "expo-intent-launcher";

const DocumentResponse = ({ info }: { info: string }) => {
  const [fileExists, setFileExists] = useState(false);

  const fileUrl = `${process.env.EXPO_PUBLIC_AWS_CLOUDFRONT_URL}${info}`;
  const fileName = info.split("/").pop();
  const appFolderPath = `${FileSystem.documentDirectory ?? ""}wa_media`;
  const localFilePath = `${appFolderPath}/${fileName}`;

  useEffect(() => {
    const checkIfExists = async () => {
      const fileInfo = await FileSystem.getInfoAsync(localFilePath);
      setFileExists(fileInfo.exists);
    };
    checkIfExists();
  }, [localFilePath]);

  const handlePress = async () => {
    try {
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Toast.show({
          type: "warn",
          text1: "Storage permission denied.",
        });
        return;
      }

      const dirInfo = await FileSystem.getInfoAsync(appFolderPath);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(appFolderPath, {
          intermediates: true,
        });
      }

      const fileInfo = await FileSystem.getInfoAsync(localFilePath);
      const fileExistsNow = fileInfo.exists;
      if (!fileExistsNow) {
        Toast.show({
          type: "default",
          text1: "Downloading document...",
        });

        const downloadResult = await FileSystem.downloadAsync(fileUrl, localFilePath);

        if (downloadResult.status === 200) {
          Toast.show({
            type: "success",
            text1: "Download complete!",
          });
          setFileExists(true);
        } else {
          throw new Error("Download failed");
        }
      }

      if (Platform.OS === "android") {
        const contentUri = await FileSystem.getContentUriAsync(localFilePath);

        await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
          data: contentUri,
          flags: 1,
        });
      } else {
        await Linking.openURL(localFilePath);
      }
    } catch (err) {
      console.error("Error opening document:", err);
      Toast.show({
        type: "error",
        text1: "Could not open the document.",
      });
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      className="flex-row items-center bg-gray-100 border border-gray-200 rounded-xl px-3 py-2"
    >
      {/* File icon box */}
      <View className="bg-blue-100 rounded-lg p-2">
        <File size={20} color="#3b82f6" />
      </View>

      {/* Spacer box between icon and text */}
      <View className="flex w-2" />

      {/* File info */}
      <View className="flex flex-col flex-1 max-w-[180px]">
        <Text numberOfLines={1} className="text-sm font-medium text-gray-800">
          {fileName}
        </Text>
        <Text className="text-xs text-gray-500">Tap to {fileExists ? "preview" : "download"}</Text>
      </View>

      {/* Right action icon */}
      <View className="flex">
        {fileExists ? <Eye size={18} color="#10b981" /> : <Download size={18} color="#3b82f6" />}
      </View>
    </TouchableOpacity>
  );
};

export default DocumentResponse;
