const WaFlowTourSteps = ({ styles }) => {
  return [
    {
      element: `.${styles["heading-container"]}`,
      popover: {
        title: "Flows",
        description:
          " Flows allows to create survey which can be shared in whatsapp and user can respond from whatsapp itself.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: `.${styles["create-flow-button"]}`,
      popover: {
        title: "Create flow",
        description:
          "Click here to create a flow. You can also add a flow by syncing using Sync button in right hand side.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: `.${styles["team-select-option"]}`,
      popover: {
        title: "Select Team",
        description: "Click here to select the team to view team based list of flows",
        side: "bottom",
        align: "center",
      },
    },
  ];
};

export default WaFlowTourSteps;
