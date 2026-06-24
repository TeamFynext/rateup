import { forwardRef, useEffect, useImperativeHandle } from "react";

import { useCropperJS } from "@/hooks/useCropperJS.ts";

export interface CropperRef {
  getBounds: () => {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  getImageDimensions: () => {
    naturalWidth: number;
    naturalHeight: number;
  } | null;
  getCroppedCanvas: () => Promise<HTMLCanvasElement | null>;
  scaleImage: (scale: number) => void;
  reset: () => void;
}

export interface CropperProps {
  src: string;
  alt?: string;
  crossOrigin?: "anonymous" | "use-credentials" | "";
  aspectRatio?: number;
  freeMode?: boolean;
  onReady?: () => void;
  onChange?: (event: any) => void;
  className?: string;
}

export const Cropper = forwardRef<CropperRef, CropperProps>(
  (
    { src, alt = "crop", crossOrigin, aspectRatio, freeMode = false, onReady, onChange, className },
    ref,
  ) => {
    const {
      canvasRef,
      imageRef,
      selectionRef,
      isReady,
      getBounds,
      getImageDimensions,
      getCroppedCanvas,
      scaleImage,
    } = useCropperJS();

    useImperativeHandle(
      ref,
      () => ({
        getBounds,
        getImageDimensions,
        getCroppedCanvas,
        scaleImage,
        reset: () => {
          if (imageRef.current && typeof imageRef.current.$resetTransform === "function") {
            imageRef.current.$resetTransform();
          } else if (imageRef.current && typeof imageRef.current.$setTransform === "function") {
            // fallback if $resetTransform doesn't exist
            imageRef.current.$setTransform([1, 0, 0, 1, 0, 0]);
          }

          if (selectionRef.current && typeof selectionRef.current.$center === "function") {
            selectionRef.current.$center();
          }
        },
      }),
      [getBounds, getImageDimensions, getCroppedCanvas, scaleImage, imageRef, selectionRef],
    );

    useEffect(() => {
      if (isReady && onReady) {
        onReady();
      }
    }, [isReady, onReady]);

    useEffect(() => {
      const selectionEl = selectionRef.current;
      if (!isReady || !selectionEl || !onChange) return;

      const handleChange = (e: Event) => {
        onChange(e);
      };

      selectionEl.addEventListener("change", handleChange);
      return () => {
        selectionEl.removeEventListener("change", handleChange);
      };
    }, [isReady, onChange, selectionRef]);

    return (
      <cropper-canvas
        ref={canvasRef}
        className={className}
        style={{ height: "100%", width: "100%" }}
        background
      >
        <cropper-image
          ref={imageRef}
          src={src}
          alt={alt}
          crossOrigin={crossOrigin}
          rotatable
          scalable
          translatable
        />
        <cropper-selection
          ref={selectionRef}
          initial-aspect-ratio={aspectRatio}
          initial-coverage={0.8}
          {...(!freeMode && aspectRatio ? { "aspect-ratio": aspectRatio } : {})}
          movable
          resizable
          zoomable
          keyboard
        >
          <cropper-grid role="grid" covered />
          <cropper-crosshair centered />
          <cropper-handle action="move" theme-color="rgba(255, 255, 255, 0.35)" />
          <cropper-handle action="n-resize" />
          <cropper-handle action="e-resize" />
          <cropper-handle action="s-resize" />
          <cropper-handle action="w-resize" />
          <cropper-handle action="ne-resize" />
          <cropper-handle action="nw-resize" />
          <cropper-handle action="se-resize" />
          <cropper-handle action="sw-resize" />
        </cropper-selection>
      </cropper-canvas>
    );
  },
);

Cropper.displayName = "Cropper";
