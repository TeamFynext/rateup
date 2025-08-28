"use client";

import { useCallback, useEffect, useRef } from "react";

import { Flex, Stack } from "@mantine/core";
import { useIntersection } from "@mantine/hooks";

import styles from "../../index.module.css";

function IllustrationTextLayout({
  children,
  imageContainerAsFirstElement = undefined,
  className = "",
}) {
  const { ref, entry } = useIntersection({
    threshold: 0.5,
  });

  const getVideoElement = useCallback((target) => {
    const videoElementClassName = styles["illustration-txt-section-video"];
    const illustrationVideoElement: HTMLVideoElement = target.querySelector(
      `.${videoElementClassName}`,
    );
    return illustrationVideoElement;
  }, []);

  const stopAndPlayVideo = useCallback(
    (target: Element, play: boolean = true) => {
      const videoElement = getVideoElement(target);
      if (videoElement && videoElement.tagName === "VIDEO") {
        videoElement.pause();
        videoElement.currentTime = 0;
        if (play && videoElement.paused) videoElement.play();
      }
    },
    [],
  );

  useEffect(() => {
    if (entry) {
      const target = entry.target;
      switch (entry.isIntersecting) {
        case true: {
          stopAndPlayVideo(target);
          break;
        }
        case false: {
          stopAndPlayVideo(target, false);
          break;
        }
      }
    }
  }, [entry]);

  return (
    <Flex
      ref={ref}
      className={`${styles["illustration-txt-section"]} ${
        imageContainerAsFirstElement
          ? styles["illustration-container-as-first-element"]
          : ""
      } ${className}`}
    >
      <Stack
        className={`${styles["api-and-sdk-text-section-text-container"]}
           ${styles["illustration-txt-section-text-container"]}`}
      >
        {children[0]}
      </Stack>

      <Flex className={`${styles["illustration-txt-section-video-container"]}`}>
        {children[1]}
      </Flex>
    </Flex>
  );
}

export default IllustrationTextLayout;
