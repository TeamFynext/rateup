import type { CropperCanvas, CropperImage, CropperSelection } from "cropperjs";
import * as React from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      // The three elements a ref is ever taken on carry their cropperjs element type, so
      // `ref.current` exposes the custom element's `$…` methods instead of a bare HTMLElement.
      "cropper-canvas": React.DetailedHTMLProps<
        React.HTMLAttributes<CropperCanvas>,
        CropperCanvas
      > & {
        background?: boolean | string;
      };
      "cropper-image": React.DetailedHTMLProps<React.HTMLAttributes<CropperImage>, CropperImage> & {
        src?: string;
        alt?: string;
        rotatable?: boolean;
        scalable?: boolean;
        translatable?: boolean;
        crossOrigin?: string;
      };
      "cropper-selection": React.DetailedHTMLProps<
        React.HTMLAttributes<CropperSelection>,
        CropperSelection
      > & {
        "initial-aspect-ratio"?: number;
        "aspect-ratio"?: number;
        movable?: boolean;
        resizable?: boolean;
        zoomable?: boolean;
        keyboard?: boolean;
      };
      "cropper-handle": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        action?: string;
        "theme-color"?: string;
      };
      "cropper-grid": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        role?: string;
        covered?: boolean;
      };
      "cropper-crosshair": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & { centered?: boolean };
    }
  }
}
