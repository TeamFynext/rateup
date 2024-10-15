import { Center, Flex, Stack, Text } from "@mantine/core";
import classNames from "classnames/bind";

import LightBlueGradientBg from "@/components/HomePage/components/LightBlueGradientBg";

import { cardsArr } from "./CardsData";
import styles from "./TransformLeadGeneration.module.css";

const cx = classNames.bind(styles);

function TransformLeadGeneration() {
  return (
    <Stack className={cx("transform-lead-generation-root-div")}>
      <h1 className={cx("heading")}>
        <LightBlueGradientBg displayInline>
          TRANSFORM LEAD GENERATION
        </LightBlueGradientBg>
        <span className={cx("heading-small-text-span")}>
          Collect Valuable Feedback and Generate Quality Leads via Web and
          WhatsApp
        </span>
      </h1>
      <Flex className={cx("cards-container")}>
        {cardsArr.map(({ id, text, icon }) => {
          return (
            <Stack key={id} className={cx("card")}>
              <Center className={cx("icon-div")}>{icon}</Center>
              <Text>{text}</Text>
            </Stack>
          );
        })}
      </Flex>
    </Stack>
  );
}

export default TransformLeadGeneration;
