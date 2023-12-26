import React, { useEffect, useRef, useState } from "react";
import SimpleModalLayout from "./SimpleModalLayout";
import {
  ActionIcon,
  Card,
  Center,
  Image,
  LoadingOverlay,
  SimpleGrid,
  rem,
} from "@mantine/core";
import { ContainedTextField } from "../input/ContainedInput/ContainedInput";
import { IconArrowRight, IconSearch } from "@tabler/icons-react";
import { useUnsplashPhotosList } from "../../backend/unsplash/unsplash.query";
import useDebounce from "../menu/hook/useDebounce";
import { useIntersection, useMediaQuery } from "@mantine/hooks";

export const UnsplashModal = ({ opened, onclose, handleUnsplashImageSave }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 600);
  const largeScreen = useMediaQuery("(min-width: 60em)");
  const unsplashPhotosList = useUnsplashPhotosList(
    opened,
    debouncedSearchQuery,
  );
  const lastImageRef = useRef<HTMLElement>(null);
  const { ref, entry } = useIntersection({
    root: lastImageRef.current,
    threshold: 1,
  });
  useEffect(() => {
    if (entry?.isIntersecting) {
      unsplashPhotosList?.fetchNextPage();
    }
  }, [entry]);
  const _photoList = unsplashPhotosList?.data?.pages?.flatMap((page) =>
    debouncedSearchQuery?.length > 0 ? page?.results : page,
  );
  return (
    <SimpleModalLayout
      title="Unsplash Images"
      onClose={() => {
        onclose();
        setSearchQuery("");
      }}
      opened={opened}
      size={"80vw"}
    >
      <LoadingOverlay
        visible={unsplashPhotosList?.isPending}
        zIndex={1000}
        overlayProps={{ radius: "sm", blur: 2 }}
      />
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
      <SimpleGrid
        cols={{ base: 1, xs: 2, sm: 2, md: 3, lg: 4, xl: 5 }}
        mx={"lg"}
      >
        {_photoList?.length > 0 &&
          _photoList?.map((photo, i) => (
            <UnsplashPhoto
              key={photo?.id}
              photo={photo}
              handleUnsplashImageSave={handleUnsplashImageSave}
              close={onclose}
              reference={i === _photoList?.length - 1 ? ref : null}
            />
          ))}
      </SimpleGrid>
    </SimpleModalLayout>
  );
};

const UnsplashPhoto = ({
  photo,
  handleUnsplashImageSave,
  close,
  reference = null,
}) => {
  const {
    urls: { regular },
    id,
  } = photo;
  const handleImageSelection = () => {
    handleUnsplashImageSave(regular, "unsplashImage" + id + ".jpg");
    close();
  };

  return (
    <Card
      shadow="sm"
      style={{ cursor: "pointer" }}
      onClick={handleImageSelection}
      mb={"lg"}
      ref={reference}
    >
      <Card.Section>
        <Image src={regular} h={200} />
      </Card.Section>
    </Card>
  );
};
