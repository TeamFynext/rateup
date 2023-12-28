import React, { useEffect, useRef, useState } from "react";
import FormModalLayout from "./FormModalLayout";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  Crop,
  PixelCrop,
} from "react-image-crop";
import { useDebounceEffect } from "../menu/hook/useDebounceEffect";
import { canvasPreview } from "../menu/easyCrop/CanvasPreview";
import { getCroppedImg } from "../menu/easyCrop/EasyCrop";
import "react-image-crop/dist/ReactCrop.css";

export const ImageCropModal = ({
  opened,
  onclose,
  image,
  imageName,
  handleCropImageSave,
  aspect = 4 / 3,
  landingPage = false,
}) => {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useDebounceEffect(
    async () => {
      if (
        completedCrop?.width &&
        completedCrop?.height &&
        imgRef.current &&
        previewCanvasRef.current
      ) {
        canvasPreview(imgRef.current, previewCanvasRef.current, completedCrop);
      }
    },
    100,
    [completedCrop],
  );

  function centerAspectCrop(
    mediaWidth: number,
    mediaHeight: number,
    aspect: number,
  ) {
    return centerCrop(
      makeAspectCrop(
        {
          unit: "%",
          width: 100,
        },
        aspect,
        mediaWidth,
        mediaHeight,
      ),
      mediaWidth,
      mediaHeight,
    );
  }
  useEffect(() => {
    setCrop({
      unit: "%",
      width: 100,
      height: 100,
      x: 0,
      y: 0,
    });
  }, [image]);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    if (aspect) {
      const { width, height } = e.currentTarget;
      const percentCrop = centerAspectCrop(width, height, aspect);
      setCrop(percentCrop);
      const pixelCrop: PixelCrop = {
        unit: "px",
        x: (percentCrop.x * width) / 100,
        y: (percentCrop.y * height) / 100,
        width: (percentCrop.width * width) / 100,
        height: (percentCrop.height * height) / 100,
      };
      setCompletedCrop(pixelCrop);
    }
  }
  const handleCropSubmit = async () => {
    const croppedImage = await getCroppedImg(
      imgRef,
      previewCanvasRef,
      completedCrop,
      imageName,
      landingPage,
    );
    if (handleCropImageSave) {
      handleCropImageSave(croppedImage);
      onclose();
    }
  };
  return (
    <FormModalLayout
      title="Crop Image"
      onClose={onclose}
      opened={opened}
      buttonTitle="save"
      includeCancelButton
      onSubmit={handleCropSubmit}
    >
      <ReactCrop
        crop={crop}
        onChange={(_, percentCrop) => setCrop(percentCrop)}
        onComplete={(c) => setCompletedCrop(c)}
        aspect={aspect}
        minHeight={100}
      >
        <img src={image} onLoad={onImageLoad} ref={imgRef} />
      </ReactCrop>
      <canvas
        ref={previewCanvasRef}
        style={{
          display: "none",
        }}
      />
    </FormModalLayout>
  );
};
