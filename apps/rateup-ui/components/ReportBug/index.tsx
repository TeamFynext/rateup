"use client";

import { useCallback, useEffect, useState } from "react";

import {
  ActionIcon,
  Flex,
  LoadingOverlay,
  Popover,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconBug } from "@tabler/icons-react";
import { useExtracted } from "next-intl";

import Button from "../HomePage/components/Button";
import popoverStyles from "./PopoverStyles.module.css";
import styles from "./ReportBug.module.css";

function ReportBug() {
  const [opened, { toggle }] = useDisclosure(false);
  const [isIframeLoading, setIsIframeLoading] = useState(false);
  const translations = useExtracted();
  useEffect(() => {
    if (opened) setIsIframeLoading(true);
  }, [opened]);

  const upadateLoadingStateOfIframe = useCallback(() => {
    setIsIframeLoading(false);
  }, []);

  return (
    <div className={styles["report-bug-container-wrapper"]}>
      <Popover
        position="top-end"
        withArrow
        shadow="md"
        classNames={popoverStyles}
        opened={opened}
        onChange={toggle}
      >
        <Popover.Target>
          <Flex className={styles["report-bug-container"]}>
            <Tooltip label={translations("Report Bug")} position="left">
              <ActionIcon
                className={styles["report-bug-button"]}
                onClick={toggle}
              >
                <IconBug />
              </ActionIcon>
            </Tooltip>
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
              src="https://rateup.app/public/survey/98c9d3a7-d335-4f03-989d-287588a2e536"
            />
          )}
        </Popover.Dropdown>
      </Popover>
    </div>
  );
}

export default ReportBug;
