import { View, Text, TouchableOpacity, Image } from "react-native";
import { signInWithGoogle } from "../api/google_auth";
import { useEffect, useState } from "react";
import { configureGoogleSignIn } from "../config/googleConfig";
import { useRouter } from "expo-router";
import { GoogleIcon } from "../constants/imageExports";

const GoogleLogin = ({setError}:{setError:(msg:string)=> void}) => {
  const router = useRouter();
  const [loading,setLoading] = useState<boolean>(false)

  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  const handleLogin = async () => {
    setLoading(true)
    const res = await signInWithGoogle();
    if (!res.success) {
      setError(res.message);
      setLoading(false)
    } else {
      router.replace("/home");
      setLoading(false)
    }
  };

  return (
    <View className="w-full flex items-center">

      <TouchableOpacity
        className="bg-[#C4D7F5] py-3 rounded-md items-center flex-row justify-center w-[86vw] gap-2"
        onPress={handleLogin}
        disabled={loading}
      >
        <GoogleIcon/>
        <Text className="text-[#004F98] font-medium text-[16px]">{loading?"Please Wait...":"Continue with Google"}</Text>
      </TouchableOpacity>
    </View>
  );
};

export default GoogleLogin;
