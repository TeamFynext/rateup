import { GoogleSignin } from "@react-native-google-signin/google-signin";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "@/src/config/axios";
import SuperTokens from "supertokens-react-native";

export const signInWithGoogle = async () => {
  try {
    console.log("Attempting Google Sign-In");

    // Ensure no existing session and Play Services
    await GoogleSignin.signOut();
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // Sign in and get tokens
    const userInfo = await GoogleSignin.signIn();
    console.log("User Info:", JSON.stringify(userInfo, null, 2));

    const tokens = await GoogleSignin.getTokens();
    const idToken = tokens.idToken;
    const accessToken = tokens.accessToken;

    // Send tokens to SuperTokens backend
    const response = await axios.post(`${process.env.EXPO_PUBLIC_API_URL}/api/auth/signinup`, {
      thirdPartyId: "google",
      oAuthTokens: {
        access_token: accessToken,
        id_token: idToken,
      },
    });

    console.log("SuperTokens Response:", response.data);

    // Validate session creation
    const sessionExists = await SuperTokens.doesSessionExist();
    if (!sessionExists) {
      return {
        success: false,
        message: "Session could not be created",
      };
    }

    // Get and store access token
    const token = await SuperTokens.getAccessToken();
    if (!token) {
      return {
        success: false,
        message: "Access token not found",
      };
    }

    await AsyncStorage.setItem("accessToken", token);
    const storedToken = await AsyncStorage.getItem("accessToken");
    console.log("Stored Google Token:", storedToken);

    return {
      success: true,
      data: response.data,
    };
  } catch (err: any) {
    console.log("Error during Google Sign-In:", err.message);
    console.log("Full error object:", JSON.stringify(err, null, 2));
    return {
      success: false,
      message: err?.response?.data?.message || "Google Sign-In failed. Please try again.",
    };
  }
};
