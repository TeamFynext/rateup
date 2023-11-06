export function transformData(inputData: any) {
  const defaultStyles = {
    headerStyle: {
      fontFamily: "Roboto",
      fontWeight: "400",
      fontSize: 30,
      color: "#ffffff",
    },
    titleStyle: {
      fontFamily: "Roboto",
      fontWeight: "700",
      fontSize: 60,
      color: "#ffffff",
    },
    otherStyle: {
      fontFamily: "Roboto",
      color: "#ffffff",
    },
  };

  const defaultTexts = {
    headerText: inputData?.titleText ?? "Welcome To",
    titleText: inputData?.menu?.displayName || "HOTEL NAME",
    locationText: inputData?.menu?.locationText || "",
    websiteUrl: inputData?.menu?.websiteUrl || "",
    logo: inputData?.menu?.logo || "",
  };

  if (inputData?.landingData) {
    return {
      headerStyle: {
        fontFamily: inputData?.headerStyle?.fontFamily ?? "Roboto",
        fontWeight: inputData?.headerStyle?.fontWeight ?? "400",
        fontSize: inputData?.headerStyle?.fontSize ?? 30,
        color: inputData?.headerStyle?.color ?? "#ffffff",
      },
      titleStyle: {
        fontFamily: inputData?.titleStyle?.fontFamily ?? "Roboto",
        fontWeight: inputData?.titleStyle?.fontWeight ?? "700",
        fontSize: inputData?.titleStyle?.fontSize ?? 60,
        color: inputData?.titleStyle?.color ?? "#ffffff",
      },
      otherStyle: {
        fontFamily: inputData?.otherStyle?.fontFamily ?? "Roboto",
        color: inputData?.otherStyle?.color ?? "#ffffff",
      },
      ...defaultTexts,
      backgroundImage: inputData?.backgroundImage || "",
      menuId: inputData?.menuId,
      menuPageEnabled: inputData?.menuPageEnabled,
      feedbackPageEnabled: inputData?.feedbackPageEnabled,
    };
  } else {
    return {
      ...defaultStyles,
      ...defaultTexts,
      menuId: inputData?.menu?.id,
      menuPageEnabled: inputData?.menu?.menuPageEnabled,
      feedbackPageEnabled: inputData?.menu?.feedbackPageEnabled,
    };
  }
}
