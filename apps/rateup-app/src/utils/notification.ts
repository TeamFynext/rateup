import * as Notifications from "expo-notifications";
import { Alert, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "@/constants/colors";
import { addToken, deleteToken } from "@/api/notification";
import { useOpenChatStore } from "@/utils/store";

/**
 * Module-scope on purpose: a handler registered after the first notification
 * arrives is too late, so this has to run during the initial import of the root
 * layout rather than inside an effect.
 *
 * Without it expo-notifications defaults to showing nothing while the app is
 * foregrounded, which is why an open app looked like it received no pushes at
 * all. `shouldShowAlert` is the deprecated spelling; SDK 54+ splits it into the
 * banner (heads-up) and list (notification centre) decisions.
 *
 * This only runs while the app is foregrounded — a backgrounded or killed app
 * never consults it, so nothing here can suppress a notification the user is
 * not present for.
 */
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // Reading the store imperatively rather than through the hook: this is not a
    // component, and `getState()` is the live value at delivery time, which is
    // what "is the user looking at this chat right now" needs.
    const openChatId = useOpenChatStore.getState().openChatId;
    const data = notification.request.content.data as
      | { type?: string; contactId?: string }
      | undefined;

    // Announcing a message that is already visible in the open thread is just
    // noise. Narrow on purpose: only a `wa_message` for the chat on screen is
    // swallowed, so a message from any *other* contact still banners while the
    // user sits in a conversation, and any future notification type is
    // unaffected. `openChatId` is cleared when the chat unmounts, so leaving the
    // screen restores banners for that contact.
    const isOpenConversation =
      data?.type === "wa_message" &&
      typeof data.contactId === "string" &&
      !!openChatId &&
      data.contactId === openChatId;

    if (isOpenConversation) {
      // No list entry or badge either: the user is reading it, so it is not
      // pending. Leaving those true would strand an unread badge for a message
      // that was already on screen.
      return {
        shouldShowBanner: false,
        shouldShowList: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
      };
    }

    return {
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  },
});

const ANDROID_DEFAULT_CHANNEL = "default";

/**
 * Android 8+ takes every behaviour that matters — heads-up, sound, vibration —
 * from the channel, not from the message. With no channel declared, Expo falls
 * back to one at default importance, which is delivered silently and never
 * appears as a heads-up banner. Creating it with MAX importance is what makes an
 * Android push behave the way the iOS one already does.
 *
 * Safe to call repeatedly: creating an existing channel is a no-op, and Android
 * deliberately ignores later downgrades to a channel the user has since tuned.
 * No-ops off Android.
 *
 * `sound` is deliberately absent: omitting the key is what selects the system
 * default notification sound. Any string there is read as a custom sound
 * filename that must be bundled via the expo-notifications plugin, so
 * `sound: "default"` resolves to nothing and logs an error at startup, and
 * `sound: null` means silent.
 */
export async function setupAndroidNotificationChannel() {
  if (Platform.OS !== "android") return;

  try {
    await Notifications.setNotificationChannelAsync(ANDROID_DEFAULT_CHANNEL, {
      name: "Messages",
      description: "New WhatsApp messages and inbox activity",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: Colors.accent.orange,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  } catch (err) {
    // A missing channel degrades pushes to silent; it should not stop the app booting.
    console.error("Failed to create Android notification channel:", err);
  }
}

async function getExpoPushTokenWithRetry(maxRetries = 5, delay = 1000) {
  let attempts = 0;
  while (attempts < maxRetries) {
    try {
      const token = await Notifications.getExpoPushTokenAsync();
      return token.data;
    } catch (err: any) {
      // Check if error is transient (503)
      const isTransient =
        err?.message?.includes("SERVICE_UNAVAILABLE") || err?.message?.includes("503");

      if (!isTransient || attempts === maxRetries - 1) {
        throw err;
      }

      attempts++;
      await new Promise((res) => setTimeout(res, delay * attempts));
    }
  }
}

/**
 * @param prompt Ask for permission if it has not been granted, and say so if the
 *   answer is no. Only sign-in should do this: it is the one moment the user is
 *   expecting to be asked. Every other caller passes `false` and gets `null`
 *   instead of a dialog — `syncPushToken` runs on every foreground, so a
 *   prompting version of this would nag a user who has already declined, every
 *   time they opened the app.
 */
export async function registerForPushNotificationsAsync({ prompt = true } = {}) {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      if (!prompt) return null;
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      Alert.alert("Permission denied", "Please enable notifications from settings");
      // Previously fell through to fetch a token anyway, which can only throw
      // without permission — the real reason was then buried in a caught error.
      return null;
    }

    const tokenData = await getExpoPushTokenWithRetry();
    return tokenData;
  } catch (err) {
    console.error("❌ Failed to get push token:", err);
    return null;
  }
}

const PUSH_TOKEN_STORAGE_KEY = "expoPushToken";

/**
 * The token this app run has already registered with the server. Expo hands back
 * the same token all session, so re-POSTing it on every foreground would be pure
 * noise; a *rotated* token differs and does get sent.
 */
let lastSyncedToken: string | null = null;

/**
 * Register this device's push token with the server, if it has changed.
 *
 * Sign-in used to be the only place this happened, so a token that rotated
 * afterwards — a reinstall, a restore to a new device, an OS-level reset — was
 * never re-sent, and the server kept pushing to an address that no longer
 * existed for the whole life of the session.
 */
export async function syncPushToken({ prompt = false } = {}) {
  const token = await registerForPushNotificationsAsync({ prompt });
  if (!token) return null;
  if (token === lastSyncedToken) return token;

  try {
    await addToken(token);
    lastSyncedToken = token;
    // Cached so sign-out can name the token it is deleting without asking
    // expo-notifications for it again.
    await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
  } catch (err) {
    // Left unsynced on purpose: `lastSyncedToken` is not advanced, so the next
    // foreground retries rather than assuming this device is registered.
    console.error("Failed to register push token:", err);
    return null;
  }

  return token;
}

/**
 * Drop this device's registration at sign-out, so the next person to use the
 * phone is not pushed the previous user's conversations.
 *
 * Reads the cached token rather than asking expo-notifications for it. The old
 * code called the *prompting* register path here purely to learn the token it
 * was about to delete — which re-raised the notification permission dialog
 * during sign-out, and returned nothing at all if permission had been revoked,
 * silently leaving the registration behind on the server.
 */
export async function unregisterPushToken() {
  const token = (await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY)) ?? lastSyncedToken;
  lastSyncedToken = null;
  await AsyncStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);

  if (!token) return;
  try {
    await deleteToken(token);
  } catch (err) {
    // Never block sign-out on this. The row is also pruned server-side once Expo
    // reports the token as DeviceNotRegistered.
    console.error("Failed to unregister push token:", err);
  }
}
