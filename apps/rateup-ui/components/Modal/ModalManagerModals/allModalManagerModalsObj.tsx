import AddLabelModal from "@/components/Contacts/AddLabelSettings";

import BookDemoModal from "./BookDemoModal";
import ImageCropModal from "./ImageCropModal";
import ImageSourceSelectorModal from "./ImageSourceSelectorModal";
import UnsplashImageSelectorModal from "./UnsplashImageSelectorModal";

const allModalManagerModalsObj = {
  imageSourceSelectorModal: ImageSourceSelectorModal,
  unsplashImageSelectorModal: UnsplashImageSelectorModal,
  imageCropModal: ImageCropModal,
  bookDemoModal: BookDemoModal,
  addLabelModal: AddLabelModal,
};

export { allModalManagerModalsObj };
