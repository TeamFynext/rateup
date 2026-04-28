import { GoogleSignin } from "@react-native-google-signin/google-signin";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "@/config/axios";
import SuperTokens from "supertokens-react-native";

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
    const response = await axios.post(
      `${process.env.EXPO_PUBLIC_API_URL}/api/auth/signinup`,
      {
        thirdPartyId: "google",
        clientType: "mobile",
        oAuthTokens: {
          access_token: accessToken,
          id_token: idToken,
        },
      },
    );

    // Validate session creation
    const sessionExists = await SuperTokens.doesSessionExist();
    if (!sessionExists) {
      return {
        success: false,
        message: "No account found.",
      };
    }

    // Get and store access token
    const token = await SuperTokens.getAccessToken();
    if (!token) {
      return {
        success: false,
        message: "Authentication error. Please try again",
      };
    }

    await AsyncStorage.setItem("accessToken", token);

    return {
      success: true,
      data: response.data,
    };
  } catch (err: any) {
    console.log("Error during Google Sign-In:", err.message);
    console.log("Full error object:", JSON.stringify(err, null, 2));
    return {
      success: false,
      message:
        err?.response?.data?.message ||
        "Google Sign-In failed. Please try again.",
    };
  }
};
