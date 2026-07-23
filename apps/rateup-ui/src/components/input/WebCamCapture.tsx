import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Webcam from "react-webcam";

import { Button } from "../ui/button.tsx";

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

const WebcamCapture = ({ height = 720, width = 1280, setCapturedImg, close }: WebcamProps) => {
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
    <div className="flex flex-col gap-4">
      {imgSrc ? (
        <img src={imgSrc} alt="Captured Photo" />
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
      <div className="flex justify-center gap-4">
        {imgSrc ? (
          <Button onClick={() => setImgSrc(null)}>{translations("Retake")}</Button>
        ) : (
          <Button onClick={capture}>{translations("Capture photo")}</Button>
        )}
        <Button
          onClick={() => {
            setCapturedImg(imgSrc);
            close();
          }}
        >
          {translations("save")}
        </Button>
      </div>
    </div>
  );
};
export default WebcamCapture;
