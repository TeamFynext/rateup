import { useContext, useState } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import { Button, Flex, Group, useMantineTheme } from "@mantine/core";
import classes from "../TakeSurvey.module.css";
export function OpinionScaleForm() {
  const theme = useMantineTheme();
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const [isHovered, setIsHovered] = useState(null);

  const handleHover = (index) => {
    setIsHovered(index);
  };

  const handleLeave = () => {
    setIsHovered(null);
  };

  const renderButtons = () => {
    const oneToFive = [];
    const fiveToTen = [];
    for (let i = 1; i <= 10; i++) {
      const button = (
        <Button
          className={classes["opinion-scale-interval-btn"]}
          key={i}
          onMouseEnter={() => handleHover(i)}
          onMouseLeave={handleLeave}
          radius="xs"
          onClick={() => updateResponse(i)}
          variant={response === i ? "filled" : "outline"}
          styles={{
            root: {
              backgroundColor:
                response === i
                  ? `var(--mantine-color-${theme.primaryColor}-filled)`
                  : isHovered !== i
                  ? ""
                  : `var(--mantine-color-${theme.primaryColor}-outline-hover)`,
              borderColor:
                response !== i &&
                `var(--mantine-color-${theme.primaryColor}-outline)`,
              color:
                response === i
                  ? "var(--mantine-color-white)"
                  : `var(--mantine-color-${theme.primaryColor}-outline)`,
            },
          }}
        >
          {i}
        </Button>
      );
      if (i <= 5) {
        oneToFive.push(button);
      } else {
        fiveToTen.push(button);
      }
    }
    const firstFiveBtnsContiner = (
      <Flex className={classes["opinion-scale-first-five-btns-container"]}>
        {oneToFive}
      </Flex>
    );
    const secondFiveBtnsContainer = (
      <Flex className={classes["opinion-scale-last-five-btns-container"]}>
        {fiveToTen}
      </Flex>
    );
    return (
      <>
        {firstFiveBtnsContiner}
        {secondFiveBtnsContainer}
      </>
    );
  };

  return <Group className={classes["opinion-scale"]}>{renderButtons()}</Group>;
}
