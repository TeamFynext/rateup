"use client";

import React, { useCallback, useRef, useState } from "react";

import { Group, Image, Stack } from "@mantine/core";
import { useTranslation } from "react-i18next";
import Webcam from "react-webcam";

import { RateupButtonBlue } from "../Button/RateupButtons.tsx";

const videoConstraints = {
  width: 1280,
  height: 720,
  facingMode: "user",
};

interface WebcamProps {
  height?: string | number;
  width?: string | number;
  setCapturedImg: any;
  close;
}

const WebcamCapture = ({
  height = 720,
  width = 1280,
  setCapturedImg,
  close,
}: WebcamProps) => {
  const webcamRef = useRef(null);
  const [imgSrc, setImgSrc] = useState(null);
  const { t: translations } = useTranslation();
  const capture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot({
      width: 200,
      height: 200,
    });
    setImgSrc(imageSrc);
  }, [webcamRef]);
  return (
    <Stack>
      {imgSrc ? (
        <Image src={imgSrc} alt="Captured Photo" />
      ) : (
        <Webcam
          audio={false}
          height={height}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          width={width}
          videoConstraints={videoConstraints}
        />
      )}
      <Group justify="center">
        {imgSrc ? (
          <RateupButtonBlue
            title={translations("Retake")}
            onClick={() => setImgSrc(null)}
          />
        ) : (
          <RateupButtonBlue
            title={translations("Capture photo")}
            onClick={capture}
          />
        )}
        <RateupButtonBlue
          title={translations("save")}
          onClick={() => {
            setCapturedImg(imgSrc);
            close();
          }}
        />
      </Group>
    </Stack>
  );
};
export default WebcamCapture;
