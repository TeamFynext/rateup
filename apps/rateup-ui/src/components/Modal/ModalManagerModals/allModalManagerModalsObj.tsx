import BookDemoModal from "./BookDemoModal/index.tsx";
import ImageCropModal from "./ImageCropModal/index.tsx";
import ImageSourceSelectorModal from "./ImageSourceSelectorModal/index.tsx";
import UnsplashImageSelectorModal from "./UnsplashImageSelectorModal/index.tsx";

const allModalManagerModalsObj = {
  imageSourceSelectorModal: ImageSourceSelectorModal,
  unsplashImageSelectorModal: UnsplashImageSelectorModal,
  imageCropModal: ImageCropModal,
  bookDemoModal: BookDemoModal,
};

export { allModalManagerModalsObj };
