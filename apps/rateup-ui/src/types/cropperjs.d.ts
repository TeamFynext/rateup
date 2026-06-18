import * as React from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "cropper-canvas": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & { background?: boolean | string };
      "cropper-image": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        src?: string;
        alt?: string;
        rotatable?: boolean;
        scalable?: boolean;
        translatable?: boolean;
        crossOrigin?: string;
      };
      "cropper-selection": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        "initial-aspect-ratio"?: number;
        "aspect-ratio"?: number;
        movable?: boolean;
        resizable?: boolean;
        zoomable?: boolean;
        keyboard?: boolean;
      };
      "cropper-handle": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & { action?: string; "theme-color"?: string };
      "cropper-grid": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & { role?: string; covered?: boolean };
      "cropper-crosshair": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & { centered?: boolean };
    }
  }
}
