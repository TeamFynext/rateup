const LPTourSteps = ({ styles }) => {
  return [
    {
      element: `.${styles["heading-container"]}`,
      popover: {
        title: "Landing Pages",
        description:
          "Landing Page is to combine one or more surveys or links through Landing page.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: `.${styles["create-landingPage-btn"]}`,
      popover: {
        title: "Create Landing Page",
        description: "Click here to create a new Landing page.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: `.${styles["sort-dropdown"]}`,
      popover: {
        title: "Sort Landing Pages",
        description: "Use this dropdown to sort the landing pages.",
        side: "bottom",
        align: "center",
      },
    },
  ];
};

export default LPTourSteps;
