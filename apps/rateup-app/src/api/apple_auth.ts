// api/apple_auth.ts
import * as AppleAuthentication from "expo-apple-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "@/config/axios";
import SuperTokens from "supertokens-react-native";

export const signInWithApple = async () => {
  try {
    // Trigger Apple login
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    const idToken = credential.identityToken;

    if (!idToken) {
      return {
        success: false,
        message: "Apple ID token not received",
      };
    }

    const response = await axios.post(
      `${process.env.EXPO_PUBLIC_API_URL}/api/auth/signinup`,
      {
        thirdPartyId: "apple",
        oAuthTokens: {
          id_token: idToken,
        },
      }
    );

    // Validate session
    const sessionExists = await SuperTokens.doesSessionExist();
    if (!sessionExists) {
      return {
        success: false,
        message: "Session could not be created",
      };
    }

    // Get token
    const token = await SuperTokens.getAccessToken();
    if (!token) {
      return {
        success: false,
        message: "Access token not found",
      };
    }

    await AsyncStorage.setItem("accessToken", token);

    return {
      success: true,
      data: response.data,
    };
  } catch (err: any) {
    console.log("Error during Apple Sign-In:", err.message);

    if (err.code === "ERR_CANCELED") {
      return {
        success: false,
        message: "Apple Sign-In cancelled",
      };
    }

    return {
      success: false,
      message:
        err?.response?.data?.message ||
        "Apple Sign-In failed. Please try again.",
    };
  }
};