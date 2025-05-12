import { useToast } from "react-native-toast-notifications";
import axios from "../config/axios";

export const getFileUrlFromKey = (
    key: string,
    s3Upload = true,
    unsplashImage = false,
  ) => {
    if (!key) return;
    if (unsplashImage)
      return key?.startsWith("https")
        ? key
        : `${process.env.EXPO_PUBLIC_UNSPLASH_URL}${key}`;
  
    const imgUrl = s3Upload
      ? `${process.env.EXPO_PUBLIC_AWS_CLOUDFRONT_URL}${key}`
      : `${process.env.EXPO_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}${key}`;
    return imgUrl;
  };


  export const deleteUploadedFiles = async (data:any) => {
    const toast = useToast();
    try {
      const response = await axios.put(
        `/api/public/upload/file/delete`,
        data,
        {
          headers: {
            Accept: "application/json",
          },
        },
      );
      toast.show("File deleted successfully",{
        type:"danger"
      });
      return response?.data;
    } catch (error) {
      console.log('error',error)
    }
  };
