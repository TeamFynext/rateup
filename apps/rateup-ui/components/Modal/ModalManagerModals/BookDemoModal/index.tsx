"use client";

import { useCallback, useState } from "react";

import { LoadingOverlay } from "@mantine/core";

import styles from "./BookDemoModal.module.css";

function BookDemoModal() {
  const [isIframeLoading, setIsIframeLoading] = useState(true);

  const upadateLoadingStateOfIframe = useCallback(() => {
    setIsIframeLoading(false);
  }, []);

  return (
    <>
      <LoadingOverlay
        visible={isIframeLoading}
        zIndex={1000}
        overlayProps={{ radius: "sm", blur: 2 }}
      />
      <iframe
        onLoad={upadateLoadingStateOfIframe}
        className={styles["contact-form-iframe"]}
        src="https://rateup.app/ws/8hKp9bb9"
      />
    </>
  );
}

export default BookDemoModal;
