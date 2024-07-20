const initialState = {
  background: {
    styles: {
      backgroundColor: "#f7f7f7",
    },
    desktopBgImgUrl: null,
    mobileBgImgUrl: null,
  },
  title: {
    styles: {
      color: "#000000",
      fontWeight: 500,
      fontSize: 30,
    },
    text: "Welcome",
  },
  subtitle: {
    styles: {
      color: "#000000",
      fontWeight: 300,
      fontSize: 16,
    },
    text: "Please fill the survey",
  },
  logo: {
    styles: {
      height: 50,
      width: 50,
    },
    logoUrl: null,
  },
  linkListItem: {
    styles: {
      backgroundColor: "#0A000D",
      color: "#FFFFFF",
      borderRadius: 16,
    },
  },
};

export { initialState };
