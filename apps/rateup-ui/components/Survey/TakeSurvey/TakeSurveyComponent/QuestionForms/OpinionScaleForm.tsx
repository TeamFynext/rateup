import { useContext, useState } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import { Button, Flex, Group } from "@mantine/core";
import classes from "../TakeSurvey.module.css";

export function OpinionScaleForm() {
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
    const colorMapping = {
      1: { c: "rgba(255, 92, 85, 1)", bg: "rgba(255, 92, 85, 0.2)" },
      2: { c: "rgba(255, 133, 128, 1)", bg: "rgba(255, 133, 128, 0.2)" },
      3: { c: "rgba(254, 183, 92, 1)", bg: "rgba(254, 183, 92, 0.2)" },
      4: { c: "rgba(254, 201, 133, 1)", bg: "rgba(254, 201, 133, 0.2)" },
      5: { c: "rgba(254, 220, 78, 1)", bg: "rgba(254, 220, 78, 0.2)" },
      6: { c: "rgba(254, 229, 122, 1)", bg: "rgba(254, 229, 122, 0.2)" },
      7: { c: "rgba(188, 234, 116, 1)", bg: "rgba(188, 234, 116, 0.2)" },
      8: { c: "rgba(166, 227, 70, 1)", bg: "rgba(166, 227, 70, 0.2)" },
      9: { c: "rgba(125, 203, 140, 1)", bg: "rgba(125, 203, 140, 0.2)" },
      10: { c: "rgba(82, 186, 102, 1)", bg: "rgba(82, 186, 102, 0.2)" },
    };

    for (let i = 1; i <= 10; i++) {
      const color = colorMapping[i].c;
      const bgColor = colorMapping[i].bg;

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
              borderWidth: "2px",
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
