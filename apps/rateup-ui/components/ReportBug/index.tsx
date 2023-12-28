import { Flex } from "@mantine/core";
import Button from "../HomePage/components/Button";
import styles from "./ReportBug.module.css";

function ReportBug() {
  return (
    <Flex className={styles["report-bug-container"]}>
      <Button className={styles["report-bug-button"]}>Report Bug</Button>
    </Flex>
  );
}

export default ReportBug;
