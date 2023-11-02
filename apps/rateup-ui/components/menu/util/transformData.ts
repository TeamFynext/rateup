export function transformData(inputData: any) {
  const defaultHeaderStyle = {
    fontFamily: "Roboto",
    fontWeight: "400",
    fontSize: 18,
    color: "#ffffff",
  };

  const defaultTitleStyle = {
    fontFamily: "Roboto",
    fontWeight: "700",
    fontSize: 32,
    color: "#ffffff",
  };

  const defaultOtherStyle = {
    fontFamily: "Roboto",
    color: "#ffffff",
  };

  const defaultHeaderText = "Welcome To";
  const defaultTitleText = "HOTEL NAME";

  if (inputData?.landingData) {
    return {
      headerStyle: {
        ...defaultHeaderStyle,
        ...inputData?.headerStyle,
      },
      titleStyle: {
        ...defaultTitleStyle,
        ...inputData?.titleStyle,
      },
      otherStyle: {
        ...defaultOtherStyle,
        ...inputData?.otherStyle,
      },
      headerText: inputData?.headerText || defaultHeaderText,
      titleText: inputData?.menu?.displayName || defaultTitleText,
      locationText: inputData?.menu?.locationText || "",
      websiteUrl: inputData?.menu?.websiteUrl || "",
      logo: inputData?.menu?.logo || "",
      backgroundImage: inputData?.backgroundImage || "",
      menuId: inputData?.menuId,
      menuPageEnabled: inputData?.menuPageEnabled,
      feedbackPageEnabled: inputData?.feedbackPageEnabled,
    };
  } else {
    return {
      headerStyle: {
        ...defaultHeaderStyle,
        fontSize: defaultTitleStyle.fontSize,
      },
      titleStyle: defaultTitleStyle,
      otherStyle: defaultOtherStyle,
      headerText: defaultHeaderText,
      titleText: inputData?.displayName || defaultTitleText,
      locationText: inputData?.locationText || "",
      websiteUrl: inputData?.websiteUrl || "",
      logo: inputData?.logo || "",
      backgroundImage: inputData?.backgroundImage || "",
      menuId: inputData?.id,
      menuPageEnabled: inputData?.menuPageEnabled,
      feedbackPageEnabled: inputData?.feedbackPageEnabled,
    };
  }
}
