export function transformData(inputData: any) {
  const defaultStyles = {
    headerStyle: {
      fontWeight: "400",
      fontSize: 28,
      color: "#ffffff",
    },
    titleStyle: {
      fontWeight: "700",
      fontSize: 50,
      color: "#ffffff",
    },
    otherStyle: {
      color: "#ffffff",
    },
  };

  const defaultTexts = {
    headerText: inputData?.headerText ?? "Welcome To",
    titleText: inputData?.menu?.displayName || "HOTEL NAME",
    locationText: inputData?.menu?.locationText || "",
    websiteText: inputData?.menu?.websiteText || "",
    logo: inputData?.menu?.logo || "",
  };

  if (inputData?.landingData) {
    return {
      headerStyle: {
        fontWeight: inputData?.headerStyle?.fontWeight ?? "400",
        fontSize: inputData?.headerStyle?.fontSize ?? 28,
        color: inputData?.headerStyle?.color ?? "#ffffff",
      },
      titleStyle: {
        fontWeight: inputData?.titleStyle?.fontWeight ?? "700",
        fontSize: inputData?.titleStyle?.fontSize ?? 50,
        color: inputData?.titleStyle?.color ?? "#ffffff",
      },
      otherStyle: {
        color: inputData?.otherStyle?.color ?? "#ffffff",
      },
      ...defaultTexts,
      backgroundImage: inputData?.backgroundImage || "",
      menuId: inputData?.menuId,
      menuPageEnabled: inputData?.menuPageEnabled,
      feedbackPageEnabled: inputData?.feedbackPageEnabled,
      surveyTeamMapId: inputData?.surveyTeamMapId,
      mobileBackgroundImage: inputData?.mobileBackgroundImage || "",
      catalogue: inputData?.catalogue || false,
    };
  } else {
    return {
      ...defaultStyles,
      ...defaultTexts,
      menuId: inputData?.menu?.id,
      menuPageEnabled: inputData?.menu?.menuPageEnabled,
      feedbackPageEnabled: inputData?.menu?.feedbackPageEnabled,
      surveyTeamMapId: inputData?.surveyTeamMapId,
      catalogue: inputData?.catalogue || false,
    };
  }
}
