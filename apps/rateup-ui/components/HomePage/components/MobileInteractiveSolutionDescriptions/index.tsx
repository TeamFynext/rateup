import { Flex, Tabs } from "@mantine/core";
import { Solution } from "../../pages/Reputation/constants";
import styles from "./MobileInteractiveSolutionDescriptions.module.css";

type MobileInteractiveSolutionDescriptionsProps = {
  solutions: Solution[];
};

function MobileInteractiveSolutionDescriptions({
  solutions,
}: MobileInteractiveSolutionDescriptionsProps) {
  let tabs = [],
    tabpanels = [];

  {
    solutions.forEach((solution) => {
      tabs.push(
        <Tabs.Tab key={solution.id} value={solution.heading}>
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

  return (
    <Flex className={styles["mobile-solutions-container"]}>
      <Tabs defaultValue={solutions[0]?.heading}>
        <Tabs.List>{tabs}</Tabs.List>

        {tabpanels}
      </Tabs>
    </Flex>
  );
}

export default MobileInteractiveSolutionDescriptions;
