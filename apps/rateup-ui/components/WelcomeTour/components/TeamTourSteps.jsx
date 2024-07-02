const TeamTourSteps = ({ styles }) => {
  return [
    {
      element: `.${styles["heading-container"]}`,
      popover: {
        title: "Teams",
        description:
          "You can create teams for your organization in order to distinguish activities based on team.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: `.${styles["create-team-button"]}`,
      popover: {
        title: "Create Team",
        description: "Click here to create a new team.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: `.${styles["sort-dropdown"]}`,
      popover: {
        title: "Sort Teams",
        description: "Use this dropdown to sort the teams.",
        side: "bottom",
        align: "center",
      },
    },
  ];
};

export default TeamTourSteps;
