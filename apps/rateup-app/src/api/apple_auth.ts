import * as AppleAuthentication from "expo-apple-authentication";
import axios from "@/config/axios";
import { API_URL } from "@/config/env";
import SuperTokens from "supertokens-react-native";
import { describeError, logger } from "@/utils/logger";

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

    const response = await axios.post(`${API_URL}/api/auth/signinup`, {
      thirdPartyId: "apple",
      clientType: "mobile",
      oAuthTokens: {
        id_token: idToken,
      },
    });

    // Validate session
    const sessionExists = await SuperTokens.doesSessionExist();
    if (!sessionExists) {
      return {
        success: false,
        message: "No account found.",
      };
    }

    // Get token
    const token = await SuperTokens.getAccessToken();
    if (!token) {
      return {
        success: false,
        message: "Authentication error. Please try again.",
      };
    }

    return {
      success: true,
      data: response.data,
    };
  } catch (err: any) {
    logger.warn("Error during Apple Sign-In:", describeError(err));

    if (err.code === "ERR_CANCELED") {
      return {
        success: false,
        message: "Apple Sign-In cancelled",
      };
    }

    return {
      success: false,
      message: err?.response?.data?.message || "Apple Sign-In failed. Please try again.",
    };
  }
};
