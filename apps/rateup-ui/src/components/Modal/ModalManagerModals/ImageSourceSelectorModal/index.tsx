import { Button, FileButton, Group, Modal } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconBrandUnsplash, IconUpload } from "@tabler/icons-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import { mmImageCropModalClassnames } from "@/utils/constants.ts";

import ImageCropModal from "../ImageCropModal/index.tsx";
import UnsplashImageSelectorModal from "../UnsplashImageSelectorModal/index.tsx";

import commonStyles from "../mmCommonStyles.module.css";
import styles from "./ImageSourceSelectorModal.module.css";

function ImageSourceSelectorModal({ context: _context, id: _thisModalId, innerProps }) {
  const { onImageSelected, forDevice } = innerProps;
  const aspectRatio = forDevice === "desktop" ? 16 / 9 : 9 / 16;
  const { t: translations } = useTranslation();

  const [cropModalOpened, { open: openCropModal, close: closeCropModal }] = useDisclosure(false);
  const [cropModalProps, setCropModalProps] = useState(null);

  const handleFileBtnValueChange = useCallback(
    (fileObj) => {
      if (!fileObj) {
        onImageSelected(null);
      } else if (fileObj) {
        const { name } = fileObj;
        const url = URL.createObjectURL(fileObj);
        setCropModalProps({
          imageUrl: url,
          imageName: name,
          onSaveClick: onImageSelected,
          aspectRatio,
        });
        openCropModal();
      }
    },
    [onImageSelected],
  );

  const [unsplashModalOpened, { open: openUnsplashModal, close: closeUnsplashModal }] =
    useDisclosure(false);

  const handleUnsplashBtnClick = useCallback(() => {
    openUnsplashModal();
  }, [openUnsplashModal]);

  return (
    <Group className={styles["container"]}>
      <FileButton onChange={handleFileBtnValueChange}>
        {(props) => {
          return (
            <Button className={styles["card"]} {...props} rightSection={<IconUpload size={16} />}>
              {translations("Upload from Device")}
            </Button>
          );
        }}
      </FileButton>
      <Button
        className={styles["card"]}
        rightSection={<IconBrandUnsplash size={16} />}
        onClick={handleUnsplashBtnClick}
      >
        {translations("Select from Unsplash")}
      </Button>
      <Modal
        opened={cropModalOpened}
        onClose={closeCropModal}
        title={translations("Crop Image")}
        centered
        classNames={mmImageCropModalClassnames}
      >
        {cropModalProps && (
          <ImageCropModal
            context={{ closeModal: closeCropModal }}
            id="imageCropModal"
            innerProps={cropModalProps}
          />
        )}
      </Modal>
      <Modal
        opened={unsplashModalOpened}
        onClose={closeUnsplashModal}
        title={translations("Unsplash Images")}
        centered
        className={commonStyles["mm-modal"]}
        classNames={{
          header: commonStyles["unsplash-image-selector-modal-header"],
        }}
        size="80vw"
      >
        <UnsplashImageSelectorModal
          context={{ closeModal: closeUnsplashModal }}
          id="unsplashImageSelectorModal"
          innerProps={{ onImageSelected, aspectRatio }}
        />
      </Modal>
    </Group>
  );
}

export default ImageSourceSelectorModal;
