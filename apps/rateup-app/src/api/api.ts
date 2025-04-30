import axios from "@/src/config/axios"
import { router } from "expo-router";
import SuperTokens from "supertokens-react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"

const API_URL =process.env.EXPO_PUBLIC_API_URL;

interface ICreateGoogleUser {
  name: string;
  orgName: string;
  type: string;
  email?: string;
}

export const signIn = async (email: string, password: string) => {
    try{
    const response = await axios.post(`${API_URL}/api/auth/signin`,{
        formFields: [
            { id: "email", value: email },
            { id: "password", value: password }
          ],
    })

    const sessionExists = await SuperTokens.doesSessionExist()
    if(!sessionExists){
        return {
            success:false,
            message:"Session could not be created"
        }
    }
    const token = await SuperTokens.getAccessToken();
    if(!token){
        return {
            success:false,
            message:"Token not found"
        }
    }
    await AsyncStorage.setItem("accessToken",token)
    
    return {
        success:true,
        data:response
    }
}catch(err:any){
    return {
        success:false,
        message: err?.response?.data?.message || "Sign in failed. Please try again."
    }
}
}

export const signOut = async () => {
    try{
    await SuperTokens.signOut();
    await AsyncStorage.removeItem("accessToken")
    router.replace("/SignIn")
    return {success:true}
    }catch(err:any){
        return {
            success:false,
            message:"Sign Out failed. Please try again"
        }
    }
}


export const sendPasswordResetEmail = async (email: string) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/user/password/reset/token`, {
        formFields: [{ id: "email", value: email }],
      });
  
      const data = response.data;
  
      if (data.status === "OK") {
        return {
          success: true,
          message: "Reset link sent successfully",
        };
      } else if (data.status === "FIELD_ERROR") {
        const errorMsg =
          data.formFields?.[0]?.error || "Invalid email format or missing email";
        return {
          success: false,
          message: errorMsg,
        };
      } else {
        return {
          success: false,
          message: "Something went wrong. Please try again.",
        };
      }
    } catch (err) {
      return {
        success: false,
        message: "Send failed. Check your network or try again later.",
      };
    }
  };
  

export const loggedUserDetails = async() => {
  const res = await axios.get("/api/user/info");
  return res.data
}


export const createGoogleUser = async(data: ICreateGoogleUser) =>{
  await axios.post("/user/complete-google-signup",data);
}