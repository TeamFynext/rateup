import { useCallback } from "react";
import styles from "./ImageSourceSelectorModal.module.css";
import { Box, Button, FileButton, Group, Image } from "@mantine/core";
import { IconUpload } from "@tabler/icons-react";
import { getFileUrlFromKey } from "../../../../utils/file-upload/upload";
import { modals } from "@mantine/modals";
import commonStyles from "../mmCommonStyles.module.css";
import imageCropModalStyles from "../ImageCropModal/ImageCropModal.module.css";

function ImageSourceSelectorModal({ context, id: thisModalId, innerProps }) {
  const { onImageSelected, forDevice } = innerProps;
  const aspectRatio = forDevice === "desktop" ? 16 / 9 : 9 / 16;

  const handleFileBtnValueChange = useCallback((fileObj) => {
    if (!fileObj) {
      // context.closeModal(thisModalId);
      onImageSelected(null);
    } else if (fileObj) {
      const { name } = fileObj;
      const url = URL.createObjectURL(fileObj);
      modals.openContextModal({
        modal: "imageCropModal",
        title: "Crop Image",
        centered: true,
        classNames: {
          content: imageCropModalStyles["modal-content"],
          header: imageCropModalStyles["modal-header"],
          body: imageCropModalStyles["modal-body"],
        },
        innerProps: {
          imageUrl: url,
          imageName: name,
          onSaveClick: onImageSelected,
          aspectRatio,
        },
      });
    }
  }, []);

  const handleUnsplashBtnClick = useCallback(() => {
    modals.openContextModal({
      modal: "unsplashImageSelectorModal",
      title: "Unsplash Images",
      centered: true,
      className: commonStyles["mm-modal"],
      classNames: {
        header: commonStyles["unsplash-image-selector-modal-header"],
      },
      size: "80vw",
      innerProps: {
        onImageSelected,
        aspectRatio,
      },
    });
  }, []);

  return (
    <Group className={styles["container"]}>
      <FileButton onChange={handleFileBtnValueChange}>
        {(props) => {
          return (
            <Button
              className={styles["card"]}
              {...props}
              rightSection={<IconUpload size={16} />}
            >
              {"Upload from Device"}
            </Button>
          );
        }}
      </FileButton>

      <Button
        className={styles["card"]}
        rightSection={
          <Image
            width={16}
            height={16}
            src={getFileUrlFromKey("/images/menu/unsplash.png", false)}
            alt="unsplash logo"
          />
        }
        onClick={handleUnsplashBtnClick}
      >
        Select from Unsplash
      </Button>
    </Group>
  );
}

export default ImageSourceSelectorModal;
