import { IconArrowRight, IconSearch } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useTriggeringDownload, useUnsplashPhotosList } from "@/backend/unsplash/unsplash.query";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { LoadingOverlay } from "@/components/ui/loading-overlay.tsx";
import { useIntersection } from "@/hooks/use-intersection.ts";
import { useMediaQuery } from "@/hooks/use-media-query.ts";
import { useDisclosure } from "@/hooks/useDisclosure";

import useDebounce from "../../../menu/hook/useDebounce.ts";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../../../ui/input-group.tsx";
import ImageCropModal from "../ImageCropModal/index.tsx";

function UnsplashImageSelectorModal({ context, id: thisModalId, innerProps }) {
  const { onImageSelected, aspectRatio } = innerProps;
  const { t: translations } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 600);
  const largeScreen = useMediaQuery("(min-width: 60em)");
  const unsplashPhotosList = useUnsplashPhotosList(true, debouncedSearchQuery);
  const lastImageRef = useRef<HTMLElement>(null);
  const { ref, entry } = useIntersection({
    root: lastImageRef?.current,
    threshold: 1,
  });
  useEffect(() => {
    if (entry?.isIntersecting) {
      unsplashPhotosList?.fetchNextPage();
    }
  }, [entry]);

  const _photoList = (
    unsplashPhotosList?.data?.pages?.flatMap((page) =>
      debouncedSearchQuery?.trim()?.length > 0 ? page?.results : page,
    ) ?? []
  ).filter((item) => item !== undefined);

  const [cropModalOpened, { open: openCropModal, close: closeCropModal }] = useDisclosure(false);
  const [cropModalProps, setCropModalProps] = useState(null);

  const handleImageClick = useCallback((url, name) => {
    setCropModalProps({
      imageUrl: url,
      imageName: name,
      onSaveClick: onImageSelected,
      aspectRatio,
    });
    openCropModal();
  }, []);

  return (
    <div className="relative flex flex-col gap-4 min-h-[70vh]">
      <LoadingOverlay visible={unsplashPhotosList?.isPending} />
      {unsplashPhotosList?.isError && (
        <p className="text-red-500">Currently Unsplash Is Unavailable</p>
      )}
      {!unsplashPhotosList?.isError && (
        <div className="flex items-center justify-center mb-6">
          <InputGroup style={{ width: largeScreen ? "60%" : "90%" }}>
            <InputGroupAddon align="inline-start">
              <IconSearch size={18} stroke={1.5} />
            </InputGroupAddon>
            <InputGroupInput onChange={(e) => setSearchQuery(e?.target?.value)} />
            <InputGroupAddon align="inline-end">
              <Button size="icon-sm" className="rounded-full" aria-label={translations("Search")}>
                <IconArrowRight size={18} stroke={1.5} />
              </Button>
            </InputGroupAddon>
          </InputGroup>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mx-6">
        {_photoList?.length === 0 ? (
          <p>{translations("Images Not Found")}</p>
        ) : (
          _photoList?.map((photo, i) => (
            <UnsplashPhoto
              key={photo ? photo.id + i : i}
              photo={photo}
              handleUnsplashImageSave={handleImageClick}
              close={() => context.closeModal(thisModalId)}
              setSearchQuery={setSearchQuery}
              reference={i === _photoList?.length - 1 ? ref : null}
            />
          ))
        )}
      </div>
      <Dialog
        open={cropModalOpened}
        onOpenChange={(next) => {
          if (!next) closeCropModal();
        }}
      >
        <DialogContent className="flex max-h-[90vh] flex-col gap-5 overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-center">{translations("Crop Image")}</DialogTitle>
          </DialogHeader>
          {cropModalProps && (
            <ImageCropModal
              context={{ closeModal: closeCropModal }}
              id="imageCropModal"
              innerProps={cropModalProps}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default UnsplashImageSelectorModal;

const UnsplashPhoto = ({
  photo,
  handleUnsplashImageSave,
  close,
  setSearchQuery,
  reference = null,
}) => {
  const {
    urls: { regular },
    user: { name, username },
    links: { download_location },
    id,
  } = photo;
  const triggeringDownload = useTriggeringDownload();
  const handleImageSelection = () => {
    handleUnsplashImageSave(
      `${regular}&author=${name}&username=${username}`,
      "unsplashImage" + id + ".jpg",
    );
    triggeringDownload.mutate({
      downloadLocation: download_location,
    });
    setSearchQuery("");
    close();
  };
  const { t: translations } = useTranslation();
  return (
    <Card className="mb-6 cursor-pointer py-0" onClick={handleImageSelection} ref={reference}>
      <img
        src={regular}
        className="h-50 w-full object-cover"
        alt={translations("image from unsplash")}
      />
    </Card>
  );
};
