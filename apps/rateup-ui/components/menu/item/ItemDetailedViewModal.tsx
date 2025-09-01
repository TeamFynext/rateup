"use client";

import { useState } from "react";

import { Carousel } from "@mantine/carousel";
import {
  Box,
  Card,
  Flex,
  Group,
  Image,
  Modal,
  ScrollArea,
  ScrollAreaAutosize,
  Stack,
  Text,
} from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import { CreditsCard } from "@/components/Card/CreditsCard";
import YoutubeEmbed from "@/components/youtube/YoutubeEmbed";
import { fallbackImage } from "@/utils/constants";
import { getFileUrlFromKey } from "@/utils/file-upload/upload";
import { extractVideoId } from "@/utils/youtube/url";

import MenuFoodLabelBadge from "../category/tag/MenuFoodLabelBadge";
import { currencyLabel } from "../util/currencyData";
import classes from "./BadgeCard.module.css";
import styles from "./itemDetailedViewModal.module.css";

interface ItemDetailedViewModalProps {
  item: MenuItem;
  onClose: () => void;
  currency: string;
}
export function ItemDetailedViewModal({
  item,
  onClose,
  currency = "0",
}: Readonly<ItemDetailedViewModalProps>) {
  const [alleryView, setAlleryView] = useState(false);
  let foodLabelLength = item?.foodLabels?.length;

  const imageStyle = {
    aspectRatio: 3 / 2,
    borderRadius: "12px",
    border: "unset",
    width: "100%",
  };
  const translations = useTranslations();
  const imageSlides = item?.images?.map((url: string) => (
    <Carousel.Slide key={url}>
      <CreditsCard
        // enableCredits={
        //   item?.unsplashImage?.find((data) => data === url)?.length > 0
        // }
        // disabled for now
        enableCredits={false}
        url={url}
      >
        <Image
          src={getFileUrlFromKey(
            url,
            true,
            item?.unsplashImage?.find((data) => data === url)?.length > 0,
          )}
          className={styles.image}
          alt={translations("menu item image")}
        />
      </CreditsCard>
    </Carousel.Slide>
  ));

  const videoSlides = item?.videoUrl && (
    <Carousel.Slide>
      <YoutubeEmbed embedId={extractVideoId(item?.videoUrl)} sx={imageStyle} />
    </Carousel.Slide>
  );
  const count = item?.images?.length + (item?.videoUrl ? 1 : 0);

  return (
    <Modal
      centered
      opened={!!item}
      onClose={onClose}
      size={"sm"}
      classNames={styles}
      scrollAreaComponent={ScrollArea.Autosize}
      radius={"lg"}
    >
      <Card radius="md" className={classes.card}>
        <Card.Section>
          {item?.images?.length > 0 || item?.videoUrl ? (
            <Carousel
              withIndicators={count > 1}
              withControls={count > 1}
              slideGap={"lg"}
            >
              {videoSlides}
              {imageSlides}
            </Carousel>
          ) : (
            <Image
              className={styles.image}
              radius={"sm"}
              src={fallbackImage}
              alt={translations("Menu Item Images")}
            />
          )}
        </Card.Section>
        {alleryView ? (
          item?.foodLabels?.length > 0 && (
            <Card.Section className={classes.section} mt="md">
              <Text className={classes.label} c="dimmed">
                {translations("Allergen Info")}
              </Text>
              <Stack gap={0} justify="space-between" mih={230}>
                <Flex gap={"sm"} wrap={"wrap"} my={"sm"}>
                  <MenuFoodLabelBadge
                    foodLabels={item?.foodLabels ?? []}
                    fz={9}
                  />
                </Flex>
                <RateupButtonPrimary
                  fullWidth
                  onClick={() => setAlleryView(false)}
                  title={translations("Go Back")}
                  leftIcon={<IconArrowLeft />}
                />
              </Stack>
            </Card.Section>
          )
        ) : (
          <>
            <Card.Section className={classes.section} mt="sm">
              <Text className={styles.title}>{item.name}</Text>
              <ScrollAreaAutosize mah={150} my="xs" type="always">
                <Text fz="sm" component="pre" className={styles.preWrap}>
                  {item.description}
                </Text>
              </ScrollAreaAutosize>
              {foodLabelLength > 0 && (
                <Box>
                  <Text className={classes.label} c="dimmed">
                    {translations("Allergen Info")}
                  </Text>

                  <Flex align={"center"} gap={0} w={"100%"} mt={5}>
                    <Group
                      maw={"calc(100% - 80px"}
                      style={{
                        overflow: "hidden",
                      }}
                      gap={4}
                      h={22}
                    >
                      <MenuFoodLabelBadge
                        foodLabels={item?.foodLabels ?? []}
                        fz={9}
                      />
                    </Group>
                    {foodLabelLength > 1 && (
                      <RateupButtonPrimary
                        title={translations("Show All")}
                        sx={{
                          height: "20px",
                          width: "80px",
                        }}
                        size="xs"
                        onClick={() => setAlleryView(true)}
                      />
                    )}
                  </Flex>
                </Box>
              )}
            </Card.Section>
            <Group justify="space-evenly" c="var(--text-color-sp)">
              {item.price.variants?.length > 0 ? (
                item.price.variants.map((varient, index) => (
                  <Stack align="center" gap={"0px"} key={index}>
                    <Text
                      fz={"clamp(14px, -415.008px + 30vw, 17.008px)"}
                      tt={"capitalize"}
                      fw={500}
                    >
                      {varient.name}
                    </Text>
                    <Text className={styles.height1}>
                      {varient?.price && (
                        <>
                          {currencyLabel[currency]?.symbol}
                          {varient.price}
                        </>
                      )}
                    </Text>
                  </Stack>
                ))
              ) : (
                <Stack align="center" gap={"0px"}>
                  <Text className={styles.height1}>
                    {item?.price?.price && (
                      <>
                        {currencyLabel[currency]?.symbol}
                        {item?.price?.price}
                      </>
                    )}
                  </Text>
                </Stack>
              )}
            </Group>
          </>
        )}
      </Card>
    </Modal>
  );
}
