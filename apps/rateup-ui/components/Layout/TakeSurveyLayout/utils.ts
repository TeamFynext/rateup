function getBgImgAndBgColor(surveyThemeData, surveyThemeObjKey, isMobile) {
  const bgObj = surveyThemeData[surveyThemeObjKey].bg;

  if (
    typeof bgObj.desktopbg === "string" &&
    typeof bgObj.mobilebg === "string"
  ) {
    const desktopBgUrl = surveyThemeData[surveyThemeObjKey].bg.desktopbg || "";
    const mobileBgUrl = surveyThemeData[surveyThemeObjKey].bg.mobilebg || "";

    const bgImgUrl = isMobile ? desktopBgUrl : mobileBgUrl;
    const backgroundColor =
      surveyThemeData[surveyThemeObjKey]?.bg?.styles?.backgroundColor ?? {};

    const isUnsplashImage = bgImgUrl?.startsWith("https://images.unsplash.com");

    let backgroundImageSrc = bgImgUrl;
    if (!bgImgUrl.startsWith("http://") && !bgImgUrl.startsWith("https://")) {
      backgroundImageSrc = `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}/${bgImgUrl}`;
    } else if (isUnsplashImage) {
      backgroundImageSrc = encodeURI(bgImgUrl);
    }

    return {
      backgroundColor,
      backgroundImageSrc,
    };
  } else if (
    typeof bgObj.desktopBg === "object" &&
    typeof bgObj.mobileBg === "object"
  ) {
    const desktopBgObj = bgObj.desktopBg;
    const mobileBgObj = bgObj.mobileBg;

    const {
      bgColor: desktopBgColor,
      chooseBgRadioInputValue: desktopChoosedBg,
      imageUrl: desktopBgImgUrl,
    } = desktopBgObj;

    const {
      bgColor: mobileBgColor,
      chooseBgRadioInputValue: mobileChoosedBg,
      imageUrl: mobileBgImgUrl,
    } = mobileBgObj;

    const bgColor = isMobile ? mobileBgColor : desktopBgColor;
    const bgImg = isMobile ? mobileBgImgUrl : desktopBgImgUrl;
    const choosedBg = isMobile ? mobileChoosedBg : desktopChoosedBg;

    return {
      backgroundColor: choosedBg === "color" ? bgColor : "#f7f7f7",
      backgroundImageSrc: choosedBg === "image" ? bgImg : "",
    };
  }
}

export { getBgImgAndBgColor };
