import { Group, Stack } from "@mantine/core";
import styles from "./TextIllustration.module.css";
import classNames from "classnames/bind";

const cx = classNames.bind(styles);

function TextIllustration({ children, imageAsFirstElement = false }) {
  return (
    <Group
      className={cx("text-illustration-root-div", "ti-root-div", {
        "image-as-first-element": imageAsFirstElement,
      })}
    >
      <Stack className={cx("text-container", "ti-text-container")}>
        {children[0]}
      </Stack>
      <Stack className={cx("img-container", "ti-img-container")}>
        {children[1]}
      </Stack>
    </Group>
  );
}

export default TextIllustration;
