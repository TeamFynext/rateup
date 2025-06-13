import * as Notifications from 'expo-notifications';
import { Alert } from 'react-native';


async function getExpoPushTokenWithRetry(maxRetries = 5, delay = 1000) {
  let attempts = 0;
  while (attempts < maxRetries) {
    try {
      const token = await Notifications.getExpoPushTokenAsync();
      return token.data;
    } catch (err: any) {
      // Check if error is transient (503)
      const isTransient =
        err?.message?.includes("SERVICE_UNAVAILABLE") ||
        err?.message?.includes("503");

      if (!isTransient || attempts === maxRetries - 1) {
        throw err;
      }

      attempts++;
      await new Promise((res) => setTimeout(res, delay * attempts));
    }
  }
}

export async function registerForPushNotificationsAsync() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      Alert.alert("Permission denied", "Please enable notifications from settings");
    }

    const tokenData = await getExpoPushTokenWithRetry();
    return tokenData;
  } catch (err) {
    console.error("❌ Failed to get push token:", err);
    return null;
  }
}
