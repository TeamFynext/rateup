import EditFlow from "./EditFlow/EditFlow";

// Flow Page header tabs list.
const headerTabsList = ["Edit", "Settings", "Share", "Result"];

const tabPanelsList = [
  {
    id: "panel-flow-edit",
    tabValue: "Edit",
    component: EditFlow,
  },
];

export { headerTabsList, tabPanelsList };
