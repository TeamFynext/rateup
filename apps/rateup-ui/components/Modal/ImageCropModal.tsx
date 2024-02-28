import React, { useEffect, useRef, useState } from "react";
import FormModalLayout from "./FormModalLayout";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  Crop,
  PixelCrop,
  convertToPixelCrop,
} from "react-image-crop";
import { useDebounceEffect } from "../menu/hook/useDebounceEffect";
import { canvasPreview } from "../menu/easyCrop/CanvasPreview";
import "react-image-crop/dist/ReactCrop.css";
import { Image, NumberInput, Stack } from "@mantine/core";
import { mimeTypesForImage } from "../../utils/constants";
import RateupLoader from "../Loaders/RateupLoader";

interface ImageCropModalProps {
  opened: boolean;
  onclose: () => void;
  image: string;
  imageName: string;
  handleCropImageSave: (file: File | string) => void;
  aspect?: number;
}

export const ImageCropModal = ({
  opened,
  onclose,
  image,
  imageName,
  handleCropImageSave,
  aspect = 4 / 3,
}: ImageCropModalProps) => {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [scale, setScale] = useState(1);
  const fileExtension = imageName?.split(".")?.pop()?.toLowerCase() ?? "jpg";

  useDebounceEffect(
    () => {
      if (
        completedCrop?.width &&
        completedCrop?.height &&
        imgRef.current &&
        previewCanvasRef.current
      ) {
        canvasPreview(
          imgRef.current,
          previewCanvasRef.current,
          completedCrop,
          scale,
          fileExtension,
        );
      }
    },
    100,
    [completedCrop, scale],
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
      setCompletedCrop(convertToPixelCrop(percentCrop, width, height));
    }
  }
  const handleCropSubmit = async () => {
    setScale(1);
    if (!image?.startsWith("blob:")) {
      const unsplashLink = generateCroppedLinkForUnsplash({
        crop: completedCrop,
        H: imgRef?.current?.height,
        W: imgRef?.current?.width,
        nW: imgRef?.current?.naturalWidth,
        nH: imgRef?.current?.naturalHeight,
        image,
      });
      handleCropImageSave(unsplashLink);
      onclose();
    } else {
      previewCanvasRef?.current?.toBlob(
        (blob) => {
          if (!blob) return;
          const file = new File([blob], imageName, {
            type: mimeTypesForImage[fileExtension],
          });

          if (handleCropImageSave) {
            handleCropImageSave(file);
            onclose();
          }
        },
        mimeTypesForImage[fileExtension],
        0.9,
      );
    }
  };
  const generateCroppedLinkForUnsplash = ({ crop, W, H, nW, nH, image }) => {
    const urlParts = image?.split("?");
    const baseUrl = urlParts?.[0];
    const urlSegments = baseUrl?.split("/");
    const photoKey = urlSegments?.[urlSegments?.length - 1];
    const params = new URLSearchParams(urlParts[1]);
    const auther = params.get("auther");
    const username = params.get("username");
    const ixid = params.get("ixid");
    const ixlib = params.get("ixlib");
    const q = params.get("q");
    const errorFraction = 0.04;
    //fp-z value
    let z = 2 - crop.width / W;
    //fp-x value
    let x = crop.x / (W - crop.width) + errorFraction;
    //fp-x value
    let y = crop.y / (H - crop.height) + errorFraction;
    const cropWidth = (crop.width / W) * nW;
    const cropHeigth = (crop.height / H) * nH;

    return `${photoKey}?crop=focalpoint&fit=crop&q=${q}&w=${cropWidth}&h=${cropHeigth}&fp-y=${y}&fp-x=${x}&fp-z=${z}&ixid=${ixid}&ixlib=${ixlib}&auther=${auther}&username=${username}`;
  };
  return (
    <FormModalLayout
      title="Crop Image"
      onClose={() => {
        onclose();
        setScale(1);
      }}
      opened={opened}
      buttonTitle="save"
      includeCancelButton
      onSubmit={handleCropSubmit}
    >
      {image?.startsWith("blob:") && (
        <NumberInput
          label="Scale the Image"
          step={0.1}
          min={0.1}
          max={1}
          defaultValue={scale}
          onChange={(e) => setScale(Number(e))}
          decimalScale={1}
          fixedDecimalScale
          w={150}
          mb={"sm"}
        />
      )}

      <ReactCrop
        crop={crop}
        onChange={(_, percentCrop) => setCrop(percentCrop)}
        onComplete={(c) => setCompletedCrop(c)}
        aspect={aspect}
        minHeight={100}
        keepSelection
      >
        <Image
          src={image}
          onLoad={onImageLoad}
          ref={imgRef}
          style={{
            transform: `scale(${scale})`,
          }}
          alt="cropping image"
        />
      </ReactCrop>
      {!imgRef.current && (
        <Stack miw={350} mih={250} justify="center">
          <RateupLoader />
        </Stack>
      )}
      <canvas
        ref={previewCanvasRef}
        style={{
          display: "none",
          width: completedCrop?.width,
          height: completedCrop?.height,
        }}
      />
    </FormModalLayout>
  );
};
