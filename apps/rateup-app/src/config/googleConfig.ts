import { GoogleSignin } from "@react-native-google-signin/google-signin";

export const configureGoogleSignIn = () => {
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_SUPERTOKEN_GOOGLE_CLIENT_ID,
    offlineAccess: true,
    forceCodeForRefreshToken: true,
  });
};
