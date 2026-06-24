"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  ActionIcon,
  Card,
  Center,
  Image,
  LoadingOverlay,
  rem,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { useIntersection, useMediaQuery } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { IconArrowRight, IconSearch } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import {
  useTriggeringDownload,
  useUnsplashPhotosList,
} from "@/backend/unsplash/unsplash.query";
import { mmImageCropModalClassnames } from "@/utils/constants.ts";

import { ContainedTextField } from "../../../input/ContainedInput/ContainedInput.tsx";
import useDebounce from "../../../menu/hook/useDebounce.ts";

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

  const handleImageClick = useCallback((url, name) => {
    modals.openContextModal({
      modal: "imageCropModal",
      title: translations("Crop Image"),
      centered: true,
      classNames: mmImageCropModalClassnames,
      innerProps: {
        imageUrl: url,
        imageName: name,
        onSaveClick: onImageSelected,
        aspectRatio,
      },
    });
  }, []);

  return (
    <Stack mih={"70vh"}>
      <LoadingOverlay
        visible={unsplashPhotosList?.isPending}
        zIndex={1000}
        overlayProps={{ radius: "sm", blur: 2 }}
      />
      {unsplashPhotosList?.isError && (
        <Text c={"red"}>Currently Unsplash Is Unavailable</Text>
      )}
      {!unsplashPhotosList?.isError && (
        <Center mb={"lg"}>
          <ContainedTextField
            w={largeScreen ? "60%" : "90%"}
            leftSection={
              <IconSearch
                style={{ width: rem(18), height: rem(18) }}
                stroke={1.5}
              />
            }
            rightSection={
              <ActionIcon
                size={32}
                radius="xl"
                color={"var(--tertiary-color)"}
                variant="filled"
              >
                <IconArrowRight
                  style={{ width: rem(18), height: rem(18) }}
                  stroke={1.5}
                />
              </ActionIcon>
            }
            onChange={(e) => setSearchQuery(e?.target?.value)}
          />
        </Center>
      )}
      <SimpleGrid
        cols={{ base: 1, xs: 2, sm: 2, md: 3, lg: 4, xl: 5 }}
        mx={"lg"}
      >
        {_photoList?.length === 0 ? (
          <Text>{translations("Images Not Found")}</Text>
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
      </SimpleGrid>
    </Stack>
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
    <Card
      shadow="sm"
      style={{ cursor: "pointer" }}
      onClick={handleImageSelection}
      mb={"lg"}
      ref={reference}
    >
      <Card.Section>
        <Image
          src={regular}
          h={200}
          alt={translations("image from unsplash")}
        />
      </Card.Section>
    </Card>
  );
};
