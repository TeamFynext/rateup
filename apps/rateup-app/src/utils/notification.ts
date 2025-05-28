import * as Notifications from 'expo-notifications';
import { Alert } from 'react-native';

export async function registerForPushNotificationsAsync() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    console.log("Existing permission status:", existingStatus);

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log("New permission status:", status);
    }

    if (finalStatus !== 'granted') {
      Alert.alert("Permission denied", "Failed to get push token for notifications.");
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    console.log("✅ Push token acquired:", tokenData.data);
    return tokenData.data;
  } catch (err) {
    console.error("❌ Failed to get push token:", err);
    return null;
  }
}
