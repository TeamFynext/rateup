import { Box } from "@mantine/core";
import classNames from "classnames/bind";

import TextIllustration from "../../../../components/TextIllustration";
import { aIAnalyticsAndInsightsContent } from "../../constants";
import styles from "./AIAnalyticsAndInsights.module.css";

const cx = classNames.bind(styles);

function AIAnalyticsAndInsights() {
  const { heading, description, image } = aIAnalyticsAndInsightsContent;
  return (
    <Box className={cx("root-div")}>
      <TextIllustration>
        <>
          {heading}
          {description}
        </>
        <>{image}</>
      </TextIllustration>
    </Box>
  );
}

export default AIAnalyticsAndInsights;
