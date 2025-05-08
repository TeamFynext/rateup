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