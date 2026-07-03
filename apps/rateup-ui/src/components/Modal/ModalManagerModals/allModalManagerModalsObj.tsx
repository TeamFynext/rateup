import { lazy } from "react";

// Lazy-loaded: these are only needed once a user actually opens one of these
// modals, so they shouldn't be part of the bundle every page pays for upfront.
const BookDemoModal = lazy(() => import("./BookDemoModal/index.tsx"));
const ImageCropModal = lazy(() => import("./ImageCropModal/index.tsx"));
const ImageSourceSelectorModal = lazy(() => import("./ImageSourceSelectorModal/index.tsx"));
const UnsplashImageSelectorModal = lazy(() => import("./UnsplashImageSelectorModal/index.tsx"));

const allModalManagerModalsObj = {
  imageSourceSelectorModal: ImageSourceSelectorModal,
  unsplashImageSelectorModal: UnsplashImageSelectorModal,
  imageCropModal: ImageCropModal,
  bookDemoModal: BookDemoModal,
};

export { allModalManagerModalsObj };
