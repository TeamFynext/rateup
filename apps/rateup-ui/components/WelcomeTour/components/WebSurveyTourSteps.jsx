const WebSurveyTourSteps = ({ styles }) => {
  return [
    {
      element: `.${styles["heading-container"]}`,
      popover: {
        title: "Web Surveys",
        description:
          "You can create surveys in multiple languages and across various teams, catering to a diverse audience.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: `.${styles["create-survey-button"]}`,
      popover: {
        title: "Create Survey",
        description: "Click here to create a new survey.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: `.${styles["team-select-option"]}`,
      popover: {
        title: "Select Team",
        description:
          "Click here to select the team to view team based list of surveys.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: `.${styles["sort-dropdown"]}`,
      popover: {
        title: "Sort Surveys",
        description: "Use this dropdown to sort the surveys.",
        side: "bottom",
        align: "center",
      },
    },
  ];
};

export default WebSurveyTourSteps;
