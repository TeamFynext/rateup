import ReactCrop, {
  centerCrop,
  convertToPixelCrop,
  Crop,
  makeAspectCrop,
  PixelCrop,
} from "react-image-crop";
import { useDebounceEffect } from "../../../menu/hook/useDebounceEffect";
import { useCallback, useEffect, useRef, useState } from "react";
import { canvasPreview } from "../../../menu/easyCrop/CanvasPreview";
import { mimeTypesForImage } from "../../../../utils/constants";
import { Box, Button, Group, NumberInput, Stack, Image } from "@mantine/core";
import RateupLoader from "../../../Loaders/RateupLoader";
import "react-image-crop/dist/ReactCrop.css";
import styles from "./ImageCropModal.module.css";
import { modals } from "@mantine/modals";

function ImageCropModal({ context, id: thisModalId, innerProps }) {
  const { imageUrl, imageName, onSaveClick, onCancelClick, aspectRatio } =
    innerProps;
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [scale, setScale] = useState(1);
  const fileExtension = imageName?.split(".")?.pop()?.toLowerCase() ?? "jpg";
  const [isImageLoading, setIsImageLoading] = useState(true);

  useEffect(() => {
    setIsImageLoading(true);
  }, [imageUrl]);

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
  }, [imageUrl]);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    setIsImageLoading(false);
    if (aspectRatio) {
      const { width, height } = e.currentTarget;
      const percentCrop = centerAspectCrop(width, height, aspectRatio);
      setCrop(percentCrop);
      setCompletedCrop(convertToPixelCrop(percentCrop, width, height));
    }
  }
  const handleCropSubmit = async () => {
    console.log(imageUrl, "image url in handle crop submit in imageCropModal");
    setScale(1);
    if (!imageUrl.startsWith("blob")) {
      const unsplashLink = generateCroppedLinkForUnsplash({
        crop: completedCrop,
        H: imgRef?.current?.height,
        W: imgRef?.current?.width,
        nW: imgRef?.current?.naturalWidth,
        nH: imgRef?.current?.naturalHeight,
        image: imageUrl,
      });
      const croppedImgLink = encodeURI(
        `https://images.unsplash.com/${unsplashLink}`,
      );
      onSaveClick({
        url: croppedImgLink,
        source: "unsplash",
        file: null,
      });
      modals.closeAll();
    } else {
      previewCanvasRef?.current?.toBlob(
        (blob) => {
          if (!blob) return;
          if (onSaveClick) {
            const file = new File([blob], imageName, {
              type: mimeTypesForImage[fileExtension],
            });
            onSaveClick({
              url: URL.createObjectURL(blob),
              source: "user-device",
              file,
            });
            URL.revokeObjectURL(imageUrl);
            modals.closeAll();
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
    const author = params.get("author");
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

    return `${photoKey}?crop=focalpoint&fit=crop&q=${q}&w=${cropWidth}&h=${cropHeigth}&fp-y=${y}&fp-x=${x}&fp-z=${z}&ixid=${ixid}&ixlib=${ixlib}&author=${author}&username=${username}`;
  };

  const handleCancelClick = useCallback(() => {
    if (onCancelClick) onCancelClick();
    context.closeModal(thisModalId);
  }, [thisModalId, onCancelClick]);

  return (
    <>
      {imageUrl?.startsWith("blob:") && (
        <NumberInput
          label="Scale the Image"
          step={0.1}
          min={0.1}
          max={1}
          defaultValue={scale}
          onChange={(e) => setScale(Number(e))}
          decimalScale={1}
          fixedDecimalScale
        />
      )}

      <Box className={styles["react-crop-container"]}>
        {
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspectRatio}
            minHeight={100}
            keepSelection
            className={styles["react-crop-div"]}
          >
            <Image
              src={imageUrl}
              onLoad={onImageLoad}
              ref={imgRef}
              style={{
                transform: `scale(${scale})`,
              }}
              alt="cropping image"
              fit="contain"
            />
          </ReactCrop>
        }

        {isImageLoading && (
          <Stack miw={350} mih={250} justify="center">
            <RateupLoader />
          </Stack>
        )}
      </Box>

      <canvas
        ref={previewCanvasRef}
        style={{
          display: "none",
          width: completedCrop?.width,
          height: completedCrop?.height,
        }}
      />

      <Group className={styles["cancel-save-btn-container"]} justify="right">
        <Button className={styles["cancel-btn"]} onClick={handleCancelClick}>
          Cancel
        </Button>
        <Button className={styles["save-btn"]} onClick={handleCropSubmit}>
          Save
        </Button>
      </Group>
    </>
  );
}

export default ImageCropModal;
