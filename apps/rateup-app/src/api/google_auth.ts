import { GoogleSignin } from "@react-native-google-signin/google-signin";
import axios from "@/config/axios";
import { API_URL } from "@/config/env";
import SuperTokens from "supertokens-react-native";
import { describeError, logger } from "@/utils/logger";

export const signInWithGoogle = async () => {
  try {
    // Ensure no existing session and Play Services
    await GoogleSignin.signOut();
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    await GoogleSignin.signIn();
    // Sign in and get tokens

    const tokens = await GoogleSignin.getTokens();
    const idToken = tokens.idToken;
    const accessToken = tokens.accessToken;

    // Send tokens to SuperTokens backend
    const response = await axios.post(`${API_URL}/api/auth/signinup`, {
      thirdPartyId: "google",
      clientType: "mobile",
      oAuthTokens: {
        access_token: accessToken,
        id_token: idToken,
      },
    });

    // Validate session creation
    const sessionExists = await SuperTokens.doesSessionExist();
    if (!sessionExists) {
      return {
        success: false,
        message: "No account found.",
      };
    }

    // A session needs an access token; SuperTokens keeps it, nothing else should.
    const token = await SuperTokens.getAccessToken();
    if (!token) {
      return {
        success: false,
        message: "Authentication error. Please try again",
      };
    }

    return {
      success: true,
      data: response.data,
    };
  } catch (err: any) {
    // Code and message only: the axios error carries the request body, which holds
    // Google's access and id tokens.
    logger.warn("Error during Google Sign-In:", describeError(err));
    return {
      success: false,
      message: err?.response?.data?.message || "Google Sign-In failed. Please try again.",
    };
  }
};
