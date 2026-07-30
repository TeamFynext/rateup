import { IconTrash, IconUpload } from "@tabler/icons-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { useDisclosure } from "@/hooks/useDisclosure";

import ImageSourceSelectorModal from "../Modal/ModalManagerModals/ImageSourceSelectorModal/index.tsx";

import styles from "./LocalOrUnsplashImagePicker.module.css";

function LocalOrUnsplashImagePicker({
  value,
  label,
  forDevice,
  onImageSelected,
}: {
  value: string;
  label: string;
  forDevice: string;
  onImageSelected: (result: { file?: File; url: string; source?: string } | null) => void;
}) {
  const { t: translations } = useTranslation();
  const [uploadModalOpened, { open: openUploadModal, close: closeUploadModal }] =
    useDisclosure(false);
  const handleUploadBtnClick = useCallback(() => {
    openUploadModal();
  }, [openUploadModal]);

  return (
    <div
      className={`${styles["local-or-unsplash-image-picker-div"]} local-or-unsplash-image-picker-div`}
    >
      <p className={`${styles["label-p"]} local-or-unsplash-image-picker-label`}>
        <span>{`${label}`}</span>
        <span>{` :`}</span>
      </p>
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          className="min-w-25 flex-[0.4] rounded-2xl font-normal"
          onClick={handleUploadBtnClick}
        >
          <IconUpload size={16} />
          {translations("Upload")}
        </Button>
        <div className="flex-[0.2]">
          <Button
            size="icon-sm"
            className="size-7.5 rounded-full bg-red-600 text-white hover:bg-red-700 disabled:bg-muted disabled:text-muted-foreground"
            disabled={!value}
            onClick={() => onImageSelected(null)}
            aria-label={translations("Delete")}
          >
            <IconTrash size={16} />
          </Button>
        </div>
      </div>
      <Dialog
        open={uploadModalOpened}
        onOpenChange={(next) => {
          if (!next) closeUploadModal();
        }}
      >
        <DialogContent className="w-auto sm:max-w-fit">
          <DialogHeader>
            <DialogTitle>{translations("Select Upload Method")}</DialogTitle>
          </DialogHeader>
          <ImageSourceSelectorModal
            context={{ closeModal: closeUploadModal }}
            id="imageSourceSelectorModal"
            innerProps={{ onImageSelected, forDevice }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default LocalOrUnsplashImagePicker;
