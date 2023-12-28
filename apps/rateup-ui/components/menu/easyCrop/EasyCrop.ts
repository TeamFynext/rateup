export const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "Anonymous";
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });
export const getCroppedImg = async (
  imgRef,
  previewCanvasRef,
  completedCrop,
  imageName,
  landingPage = false,
) => {
  const image = (await createImage(imgRef?.current?.src)) as HTMLImageElement;
  const previewCanvas = previewCanvasRef.current;
  if (!image || !previewCanvas || !completedCrop) {
    throw new Error("Crop canvas does not exist");
  }
  const scaleX = landingPage ? 3 : 1;
  const scaleY = landingPage ? 3 : 1;

  const offscreen = new OffscreenCanvas(
    completedCrop.width * scaleX,
    completedCrop.height * scaleY,
  );
  const ctx = offscreen.getContext("2d");
  if (!ctx) {
    throw new Error("No 2d context");
  }

  ctx.drawImage(
    previewCanvas,
    0,
    0,
    previewCanvas.width,
    previewCanvas.height,
    0,
    0,
    offscreen.width,
    offscreen.height,
  );
  const blob = await offscreen.convertToBlob({
    type: "image/png",
  });
  const file = new File([blob], imageName || "filename.png", {
    type: "image/png",
  });
  return file;
};
