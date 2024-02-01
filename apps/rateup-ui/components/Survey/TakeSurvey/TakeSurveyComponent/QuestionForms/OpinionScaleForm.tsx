import { useContext, useState } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import { Button, Flex, Group, useMantineTheme } from "@mantine/core";
import classes from "../TakeSurvey.module.css";
import { returnColorsForTheme } from "../../../SurveyTheme/SurveyTheme.utils";
import { styleAttributeTypesEnum } from "../../../SurveyTheme/SurveyTheme.enums";

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
      const color = returnColorsForTheme(styleAttributeTypesEnum.TEXT, theme);
      const bgColor = returnColorsForTheme(
        styleAttributeTypesEnum.BACKGROUND,
        theme,
      );
      const button = (
        <Button
          className={classes["opinion-scale-interval-btn"]}
          key={i}
          onMouseEnter={() => handleHover(i)}
          onMouseLeave={handleLeave}
          radius="xs"
          onClick={() => updateResponse(i)}
          color={"var(--tertiary-color)"}
          variant={response === i ? "filled" : "outline"}
          styles={{
            root: {
              backgroundColor:
                response !== i && isHovered !== i ? bgColor : color,
              borderColor: response !== i && color,
              borderWidth: "1px",
              color: response !== i && isHovered !== i ? color : "white",
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
