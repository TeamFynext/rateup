import type { DriveStep } from "driver.js";

const WaPageTourSteps = ({ styles }: { styles: Record<string, string> }): DriveStep[] => {
  return [
    {
      element: `.${styles["heading-container"]}`,
      popover: {
        title: "All Templates",
        description:
          "WhatsApp Templates offer a structured, consistent format for surveys, enhancing user understanding and standardizing your survey design.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: `.${styles["create-template-button"]}`,
      popover: {
        title: "Create Template",
        description:
          "Click here to create a new Template and enter the required details, and then submit your template.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: `.${styles["sort-dropdown"]}`,
      popover: {
        title: "Sort Templates",
        description: "Use this dropdown to sort the templates.",
        side: "bottom",
        align: "center",
      },
    },
  ];
};

export default WaPageTourSteps;
