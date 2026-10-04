import { Toast } from "@/components/common/Notice";
import React, { useEffect, useState } from "react";
import { Linking, Platform, Text, Pressable, View } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import requestStoragePermission from "@/utils/permission";
import { Download, Eye, File } from "lucide-react-native";
import * as IntentLauncher from "expo-intent-launcher";
import { FONT, usePressed, useTheme } from "@/components/loyalty/cashier/ui";

const DocumentResponse = ({ info }: { info: string }) => {
  const { t } = useTheme();
  const { pressed, pressHandlers } = usePressed();
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
    <Pressable
      onPress={handlePress}
      {...pressHandlers}
      accessibilityRole="button"
      accessibilityLabel={`${fileName}, tap to ${fileExists ? "open" : "download"}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        padding: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: t.border1,
        backgroundColor: pressed ? t.surface2 : t.surface,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 9,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: t.brandSoft,
        }}
      >
        <File size={18} color={t.brand} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text numberOfLines={1} style={{ fontFamily: FONT.medium, fontSize: 13, color: t.fg1 }}>
          {fileName}
        </Text>
        <Text style={{ fontFamily: FONT.regular, fontSize: 12, color: t.fg3 }}>
          Tap to {fileExists ? "open" : "download"}
        </Text>
      </View>
      {fileExists ? <Eye size={18} color={t.fg3} /> : <Download size={18} color={t.brand} />}
    </Pressable>
  );
};

export default DocumentResponse;
