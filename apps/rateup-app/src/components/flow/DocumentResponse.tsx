import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import RNFS from "react-native-fs";
import FileViewer from "react-native-file-viewer";
import requestStoragePermission from "@/src/utils/permission";
import { useToast } from "react-native-toast-notifications";
import { Download, Eye, File } from "lucide-react-native";

const DocumentResponse = ({ info }: { info: string }) => {
  const toast = useToast();
  const [fileExists, setFileExists] = useState(false);

  const fileUrl = `${process.env.EXPO_PUBLIC_AWS_CLOUDFRONT_URL}${info}`;
  const fileName = info.split("/").pop();
  const appFolderPath = `${RNFS.ExternalDirectoryPath}/wa_media`;
  const localFilePath = `${appFolderPath}/${fileName}`;

  useEffect(() => {
    const checkIfExists = async () => {
      const exists = await RNFS.exists(localFilePath);
      setFileExists(exists);
    };
    checkIfExists();
  }, [localFilePath]);

  const handlePress = async () => {
    try {
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        toast.show("Storage permission denied.", { type: "warning" });
        return;
      }

      const dirExists = await RNFS.exists(appFolderPath);
      if (!dirExists) await RNFS.mkdir(appFolderPath);

      const fileExistsNow = await RNFS.exists(localFilePath);
      if (!fileExistsNow) {
        toast.show("Downloading document...", { type: "normal" });

        const downloadResult = await RNFS.downloadFile({
          fromUrl: fileUrl,
          toFile: localFilePath,
        }).promise;

        if (downloadResult.statusCode === 200) {
          toast.show("Download complete!", { type: "success" });
          setFileExists(true);
        } else {
          throw new Error("Download failed");
        }
      }

      await FileViewer.open(localFilePath, { showOpenWithDialog: true });
    } catch (err) {
      toast.show("Could not open the document.", { type: "danger" });
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
        <Text className="text-xs text-gray-500">
          Tap to {fileExists ? "preview" : "download"}
        </Text>
      </View>

      {/* Right action icon */}
      <View className="flex">
        {fileExists ? (
          <Eye size={18} color="#10b981" />
        ) : (
          <Download size={18} color="#3b82f6" />
        )}
      </View>
    </TouchableOpacity>
  );
};

export default DocumentResponse;
