import { Box } from "@mantine/core";
import TextIllustration from "../../TextIllustration";
import { aIAnalyticsAndInsightsContent } from "../../constants";
import styles from "./AIAnalyticsAndInsights.module.css";
import classNames from "classnames/bind";
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
