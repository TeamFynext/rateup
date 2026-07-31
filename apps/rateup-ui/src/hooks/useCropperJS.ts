import type { CropperCanvas, CropperImage, CropperSelection } from "cropperjs";
import { useCallback, useEffect, useRef, useState } from "react";

export function useCropperJS() {
  const canvasRef = useRef<CropperCanvas | null>(null);
  const selectionRef = useRef<CropperSelection | null>(null);
  const imageRef = useRef<CropperImage | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let rafId: number | null = null;

    // Dynamically import cropperjs to avoid SSR HTMLElement crash
    import("cropperjs")
      .then(() => {
        if (cancelled) return;

        // It might take a moment for the web components to upgrade the DOM elements
        const checkReady = () => {
          if (cancelled) return;

          if (
            selectionRef.current &&
            typeof selectionRef.current.$toCanvas === "function" &&
            imageRef.current &&
            typeof imageRef.current.$scale === "function"
          ) {
            setIsReady(true);
          } else {
            rafId = requestAnimationFrame(checkReady);
          }
        };

        checkReady();
      })
      .catch((err) => {
        console.error("Failed to load cropperjs", err);
      });

    return () => {
      cancelled = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);

  const getCroppedCanvas = useCallback(async () => {
    if (!selectionRef.current) return null;
    return await selectionRef.current.$toCanvas();
  }, []);

  const getBounds = useCallback(() => {
    if (!selectionRef.current) return null;
    return {
      x: selectionRef.current.x,
      y: selectionRef.current.y,
      width: selectionRef.current.width,
      height: selectionRef.current.height,
    };
  }, []);

  const getImageDimensions = useCallback(() => {
    // The natural size lives on the `<img>` cropper-image renders in its shadow root; the
    // custom element itself has no naturalWidth/naturalHeight.
    const image = imageRef.current?.$image;
    if (!image) return null;
    return {
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
    };
  }, []);

  const scaleImage = useCallback((scale: number) => {
    if (imageRef.current && typeof imageRef.current.$getTransform === "function") {
      const transform = imageRef.current.$getTransform();
      const currentScale = Math.sqrt(transform[0] * transform[0] + transform[1] * transform[1]);
      if (currentScale > 0) {
        const ratio = scale / currentScale;
        transform[0] *= ratio;
        transform[1] *= ratio;
        transform[2] *= ratio;
        transform[3] *= ratio;
        imageRef.current.$setTransform(transform);
      }
    }
  }, []);

  return {
    canvasRef,
    selectionRef,
    imageRef,
    isReady,
    getCroppedCanvas,
    getBounds,
    getImageDimensions,
    scaleImage,
  };
}
