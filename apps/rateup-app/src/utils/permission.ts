import { PermissionsAndroid, Platform, Alert, Linking } from "react-native";

export default async function requestStoragePermission(): Promise<boolean> {
  if (Platform.OS !== "android") return true;

  const isAndroid13OrAbove = Platform.Version >= 33;

  const permission = isAndroid13OrAbove
    ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO
    : PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE;

  try {
    const granted = await PermissionsAndroid.request(permission, {
      title: "Storage Permission Required",
      message: "This app needs access to your media to save videos.",
      buttonPositive: "OK",
    });

    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      return true;
    }

    if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      Alert.alert(
        "Permission Blocked",
        "You’ve previously denied access. Please enable it in settings to continue.",
        [
          {
            text: "Open Settings",
            onPress: () => Linking.openSettings(),
          },
          { text: "Cancel", style: "cancel" },
        ],
      );
    } else {
      Alert.alert("Permission Denied", "You must allow storage access to save media files.");
    }

    return false;
  } catch (err) {
    console.warn("Permission request failed", err);
    return false;
  }
}
