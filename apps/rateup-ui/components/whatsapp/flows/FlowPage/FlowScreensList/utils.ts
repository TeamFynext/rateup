type newScreenDataObj = {
  screenId: string;
  screenTitle: string;
  footerBtnLabel: string;
};

const getNewScreenObj = ({
  screenId,
  screenTitle,
  footerBtnLabel,
}: newScreenDataObj) => {
  return {
    id: screenId,
    title: screenTitle,
    success: true,
    terminal: true,
    layout: {
      type: "SingleColumnLayout",
      children: [
        {
          type: "Form",
          name: "form",
          children: [
            {
              type: "Footer",
              label: footerBtnLabel,
              "on-click-action": {
                name: "complete",
                payload: {},
              },
            },
          ],
        },
      ],
    },
  };
};

// We need to pass the draft of immer(used useImmer as state in EditFlow).
const updateFlowJsonNavigateTerminalScreens = (draft) => {
  const screens = draft.screens;
  screens.forEach((screen, currentIndex) => {
    delete screen["success"];
    delete screen["terminal"];

    const layoutFormChildren = screen["layout"]["children"][0]["children"];
    const footerObject = layoutFormChildren[layoutFormChildren.length - 1];
    const currentScreenIsNotLast = currentIndex !== screens.length - 1;
    if (currentScreenIsNotLast) {
      footerObject["on-click-action"] = {
        name: "navigate",
        next: {
          type: "screen",
          name: screens[currentIndex + 1].id,
        },
        payload: {},
      };
    } else if (currentIndex === screens.length - 1) {
      screen["success"] = true;
      screen["terminal"] = true;
      footerObject["on-click-action"] = {
        name: "complete",
        payload: {},
      };
    }
  });
};

const getScreenObjById = (screens, screenId) => {
  return screens.find((screen) => screen.id === screenId);
};

export {
  updateFlowJsonNavigateTerminalScreens,
  getNewScreenObj,
  getScreenObjById,
};
