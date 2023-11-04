export function transformData(inputData: any) {
  const defaultStyles = {
    headerStyle: {
      fontFamily: "Roboto",
      fontWeight: "400",
      fontSize: 18,
      color: "#ffffff",
    },
    titleStyle: {
      fontFamily: "Roboto",
      fontWeight: "700",
      fontSize: 32,
      color: "#ffffff",
    },
    otherStyle: {
      fontFamily: "Roboto",
      color: "#ffffff",
    },
  };

  const defaultTexts = {
    headerText: "Welcome To",
    titleText: inputData?.menu?.displayName || "HOTEL NAME",
    locationText: inputData?.menu?.locationText || "",
    websiteUrl: inputData?.menu?.websiteUrl || "",
    logo: inputData?.menu?.logo || "",
  };

  if (inputData?.landingData) {
    return {
      ...defaultStyles,
      ...defaultTexts,
      backgroundImage: inputData?.backgroundImage || "",
      menuId: inputData?.menuId,
      menuPageEnabled: inputData?.menuPageEnabled,
      feedbackPageEnabled: inputData?.feedbackPageEnabled,
    };
  } else {
    return {
      headerStyle: {
        ...defaultStyles.headerStyle,
        fontSize: defaultStyles.titleStyle.fontSize,
      },
      titleStyle: defaultStyles.titleStyle,
      otherStyle: defaultStyles.otherStyle,
      ...defaultTexts,
      menuId: inputData?.menu?.id,
      menuPageEnabled: inputData?.menu?.menuPageEnabled,
      feedbackPageEnabled: inputData?.menu?.feedbackPageEnabled,
    };
  }
}
