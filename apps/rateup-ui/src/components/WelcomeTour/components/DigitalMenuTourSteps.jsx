const DigitalMenuTourSteps = ({ styles }) => {
  return [
    {
      element: `.${styles["heading-container"]}`,
      popover: {
        title: "Digital Menu",
        description: "It is for creating, editing, and sorting menus.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: `.${styles["create-menu-button"]}`,
      popover: {
        title: "Create Menu",
        description:
          "Click here to create a Menu. then select the team, enter a descriptive name, and submit",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: `.${styles["team-select-option"]}`,
      popover: {
        title: "Select Team",
        description: "Click here to select the team to view team-based list of menus.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: `.${styles["sort-dropdown"]}`,
      popover: {
        title: "Sort Surveys",
        description: "Use this dropdown to sort the menus.",
        side: "bottom",
        align: "center",
      },
    },
  ];
};

export default DigitalMenuTourSteps;
