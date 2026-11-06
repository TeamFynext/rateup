import SuperTokens from "supertokens-react-native";
import { router } from "expo-router";
import { API_URL } from "./env";

// SuperTokens keeps its tokens in AsyncStorage (header transfer mode) and offers no hook
// to move them elsewhere, so they sit in the app sandbox rather than the Keychain /
// Keystore. Backups are off (android.allowBackup: false) and nothing else copies them.
SuperTokens.init({
  apiDomain: API_URL,
  apiBasePath: "/api/auth",
  sessionTokenBackendDomain: API_URL,
  onHandleEvent: (event) => {
    // The refresh token was rejected: the session is gone (expired, revoked, signed out
    // elsewhere). Drop the account's cached contacts and messages with it rather than
    // leaving them on disk until someone explicitly signs out.
    if (event.action === "UNAUTHORISED") {
      void import("@/utils/clearLocalData")
        .then((m) => m.clearLocalUserData())
        .finally(() => router.replace("/auth/SignIn"));
    }
  },
});

export default SuperTokens;
