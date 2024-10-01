import { Stack } from "@mantine/core";
import classNames from "classnames/bind";

import TextIllustration from "@/components/HomePage/components/TextIllustration";

import { data } from "./data";
import styles from "./Section2.module.css";

const cx = classNames.bind(styles);

function Section2() {
  return (
    <Stack
      className={cx("landing-page-section-root-common-styles", "section2-div")}
    >
      {data.map(({ id, heading, description, image }) => {
        return (
          <TextIllustration
            key={id}
            className={cx("section2-text-illustration")}
          >
            <Stack>
              {heading}
              {description}
            </Stack>
            <Stack>{image}</Stack>
          </TextIllustration>
        );
      })}
    </Stack>
  );
}

export default Section2;
