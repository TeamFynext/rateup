const defaultStyles = {
  id: undefined,
  surveyId: null,
  landingId: null,
  headerText: "Welcome",
  descText: "Please take the survey",
  buttonText: "Go to Survey",

  headerStyles: {
    fontFamily: "Roboto",
    fontWeight: 600,
    fontSize: 30,
    textAlign: "center",
    color: "#000000",
  },

  descStyles: {
    fontFamily: "Roboto",
    fontWeight: 400,
    fontSize: 14,
    textAlign: "center",
    color: "#000000",
  },

  buttonStyles: {
    fontFamily: "Roboto",
    fontWeight: 600,
    fontSize: 15,
    textAlign: "center",
    color: "#fff",
    borderRadius: 48,
    backgroundColor: "var(--tertiary-color)",
  },

  bgStyles: {
    fontFamily: "Roboto",
    fontWeight: 600,
    fontSize: 15,
    textAlign: "center",
    color: "rgba(143, 70, 70, 1)",
    backgroundColor: "rgba(143, 70, 70, 1)",
    borderRadius: 18,
  },

  logoStyles: {
    height: 50,
    width: 50,
  },

  bgType: "bgcolor",

  bgUrl: "",
  mobileBgUrl: "",
  logoUrl: "",
};
export default defaultStyles;
