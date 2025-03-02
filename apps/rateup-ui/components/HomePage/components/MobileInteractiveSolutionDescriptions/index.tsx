import { useCallback, useEffect } from "react";

import { Flex, Tabs } from "@mantine/core";

import { Solution } from "../../pages/Home/OursolutionsSection/DescriptionsCarouselSlides";
import styles from "./MobileInteractiveSolutionDescriptions.module.css";
import tabStyles from "./Tabs.module.css";

type MobileInteractiveSolutionDescriptionsProps = {
  solutions: Solution[];
  setActiveSlideIndex: any;
};

function MobileInteractiveSolutionDescriptions({
  solutions,
  setActiveSlideIndex,
}: MobileInteractiveSolutionDescriptionsProps) {
  let tabs = [],
    tabpanels = [];

  {
    solutions.forEach((solution, index) => {
      tabs.push(
        <Tabs.Tab key={solution.id} value={solution.heading} data-index={index}>
          {solution.heading}
        </Tabs.Tab>,
      );
      tabpanels.push(
        <Tabs.Panel key={solution.id + "panel"} value={solution.heading}>
          {solution.description}
        </Tabs.Panel>,
      );
    });
  }

  const handleTabChange = useCallback(
    (value) => {
      if (solutions) {
        const solutionIndex = solutions.findIndex(
          (solution) => solution.heading === value,
        );
        setActiveSlideIndex(solutionIndex);
      }
    },
    [solutions],
  );

  useEffect(() => {
    setActiveSlideIndex(0);
  }, []);

  return (
    <Flex className={styles["mobile-solutions-container"]}>
      <Tabs
        classNames={tabStyles}
        defaultValue={solutions[0]?.heading}
        onChange={handleTabChange}
      >
        <Tabs.List>{tabs}</Tabs.List>

        {tabpanels}
      </Tabs>
    </Flex>
  );
}

export default MobileInteractiveSolutionDescriptions;
