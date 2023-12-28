import { Flex, Popover, LoadingOverlay } from "@mantine/core";
import Button from "../HomePage/components/Button";
import styles from "./ReportBug.module.css";
import popoverStyles from "./PopoverStyles.module.css";
import { useDisclosure } from "@mantine/hooks";
import { useCallback, useEffect, useState } from "react";

function ReportBug() {
  const [opened, { toggle }] = useDisclosure(false);
  const [isIframeLoading, setIsIframeLoading] = useState(false);

  useEffect(() => {
    if (opened) setIsIframeLoading(true);
  }, [opened]);

  const upadateLoadingStateOfIframe = useCallback(() => {
    setIsIframeLoading(false);
  }, []);

  return (
    <Popover
      position="bottom-end"
      withArrow
      shadow="md"
      classNames={popoverStyles}
      opened={opened}
      onChange={toggle}
    >
      <Popover.Target>
        <Flex className={styles["report-bug-container"]}>
          <Button className={styles["report-bug-button"]} onClick={toggle}>
            Report Bug
          </Button>
        </Flex>
      </Popover.Target>

      <Popover.Dropdown>
        <LoadingOverlay
          visible={isIframeLoading}
          zIndex={1000}
          overlayProps={{ radius: "sm", blur: 2 }}
        />
        {opened && (
          <iframe
            onLoad={upadateLoadingStateOfIframe}
            className={styles["bug-report-form-iframe"]}
            src="https://rateup.app/public/survey/89421698-e6dd-43ee-9b63-757a7614bed3"
          />
        )}
      </Popover.Dropdown>
    </Popover>
  );
}

export default ReportBug;
