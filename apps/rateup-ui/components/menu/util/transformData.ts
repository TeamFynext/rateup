export function transformData(inputData: any) {
  const defaultStyles = {
    headerStyle: {
      fontFamily: "Roboto",
      fontWeight: "400",
      fontSize: 30,
      color: "#000000",
    },
    titleStyle: {
      fontFamily: "Roboto",
      fontWeight: "700",
      fontSize: 60,
      color: "#000000",
    },
    otherStyle: {
      fontFamily: "Roboto",
      color: "#000000",
    },
  };

  const defaultTexts = {
    headerText: inputData?.titleText ?? "Welcome To",
    titleText: inputData?.menu?.displayName || "HOTEL NAME",
    locationText: inputData?.menu?.locationText || "",
    websiteText: inputData?.menu?.websiteText || "",
    logo: inputData?.menu?.logo || "",
  };

  if (inputData?.landingData) {
    return {
      headerStyle: {
        fontFamily: inputData?.headerStyle?.fontFamily ?? "Roboto",
        fontWeight: inputData?.headerStyle?.fontWeight ?? "400",
        fontSize: inputData?.headerStyle?.fontSize ?? 30,
        color: inputData?.headerStyle?.color ?? "#000000",
      },
      titleStyle: {
        fontFamily: inputData?.titleStyle?.fontFamily ?? "Roboto",
        fontWeight: inputData?.titleStyle?.fontWeight ?? "700",
        fontSize: inputData?.titleStyle?.fontSize ?? 60,
        color: inputData?.titleStyle?.color ?? "#000000",
      },
      otherStyle: {
        fontFamily: inputData?.otherStyle?.fontFamily ?? "Roboto",
        color: inputData?.otherStyle?.color ?? "#000000",
      },
      ...defaultTexts,
      backgroundImage: inputData?.backgroundImage || "",
      menuId: inputData?.menuId,
      menuPageEnabled: inputData?.menuPageEnabled,
      feedbackPageEnabled: inputData?.feedbackPageEnabled,
      surveyTeamMapId: inputData?.surveyTeamMapId,
    };
  } else {
    return {
      ...defaultStyles,
      ...defaultTexts,
      menuId: inputData?.menu?.id,
      menuPageEnabled: inputData?.menu?.menuPageEnabled,
      feedbackPageEnabled: inputData?.menu?.feedbackPageEnabled,
      surveyTeamMapId: inputData?.surveyTeamMapId,
    };
  }
}
