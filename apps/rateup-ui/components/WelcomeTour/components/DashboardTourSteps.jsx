const DashboardTourSteps = ({ styles }) => {
  return [
    {
      element: `.${styles["heading-container"]}`,
      popover: {
        title: "Dashboard",
        description: `
        <div>
        This page serves as a centralized hub for viewing and interacting with survey-related information.
        </div>`,
        side: "bottom",
        align: "center",
      },
    },
    {
      element: `.${styles["create-button"]}`,
      popover: {
        title: "Create",
        description:
          "Click here to initiate the creation of Web surveys, Teams, WhatsApp flows, and Landing pages directly from the dashboard.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: `.${styles["overall-responses-graph"]}`,
      popover: {
        title: "Overall Responses",
        description: `
        <div>
        It displays the total number of responses gathered over a selected time period through an area chart visualization. 
      <br/>  It allows users to track response trends and patterns over time 
        </div>`,
        side: "bottom",
        align: "center",
      },
    },
    {
      element: `.${styles["active-survey-count"]}`,
      popover: {
        title: "Active Surveys",
        description: `
        <div>
        Here you can see the number of surveys that are actively running and collecting responses. 
        </div>`,
        side: "bottom",
        align: "center",
      },
    },
    {
      element: `.${styles["total-survey-count"]}`,
      popover: {
        title: "Total Surveys",
        description:
          "This indicates the cumulative number of surveys that have been created in the system, regardless of whether they are currently active or not.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: `.${styles["total-team-count"]}`,
      popover: {
        title: "Total Teams",
        description:
          "It shows the total count of teams that have been created within the system.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: `.${styles["active-flow-page"]}`,
      popover: {
        title: "Active Surveys/Flows",
        description:
          "It displays the Web surveys and WhatsApp flows that are currently active and operational.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: `.${styles["survey-type-filter-button"]}`,
      popover: {
        title: "Filter",
        description:
          "It helps to filter the active survey data based on criteria like web surveys or WhatsApp flows",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: `.${styles["sort-dropdown"]}`,
      popover: {
        title: "Sort Surveys",
        description:
          "You can sort surveys or flows in a desired order such as by date or alphabetical sequence.",
        side: "bottom",
        align: "center",
      },
    },
  ];
};

export default DashboardTourSteps;
