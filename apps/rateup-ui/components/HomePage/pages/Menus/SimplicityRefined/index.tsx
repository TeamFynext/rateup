import { Flex, Stack, Title } from "@mantine/core";
import { menusOnboardingSteps } from "./constants";
import styles from "./SimplicityRefined.module.css";
import OnBoardingStepInfo from "./OnBoardingStepInfo";

function SimplicityRefined() {
  return (
    <Stack className={styles["simplicity-refined-section"]}>
      <Title order={1} className={styles["heading"]}>
        <span>Simplicity Redefined</span>
        <span>Seamlessly Navigate, Effortlessly Explore—As Easy as 123!</span>
      </Title>

      <Flex className={styles["menus-feature-steps-container"]}>
        {menusOnboardingSteps.map(({ imageLink, description, id }) => {
          return (
            <OnBoardingStepInfo
              key={id}
              imageLink={imageLink}
              description={description}
            />
          );
        })}
      </Flex>
    </Stack>
  );
}

export default SimplicityRefined;
