import { Carousel, Embla, useAnimationOffsetEffect } from "@mantine/carousel";
import {
  Box,
  Flex,
  Group,
  Image,
  Modal,
  ScrollArea,
  ScrollAreaAutosize,
  Stack,
  Text,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconArrowLeft } from "@tabler/icons-react";
import { useState } from "react";
import { fallbackImage } from "../../../utils/constants";
import { getFileUrlFromKey } from "../../../utils/file-upload/upload";
import { lexend } from "../../../utils/fonts";
import { extractVideoId } from "../../../utils/youtube/url";
import { RateupButtonPrimary } from "../../Button/RateupButtons";
import YoutubeEmbed from "../../youtube/YoutubeEmbed";
import MenuFoodLabelBadge from "../category/tag/MenuFoodLabelBadge";
import { currencyLabel } from "../util/currencyData";
import classes from "./itemDetailedViewModal.module.css";
import { CreditsCard } from "../../Card/CreditsCard";
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
  const TRANSITION_DURATION = 200;
  const smallScreen = useMediaQuery("(max-width: 30em)");
  const [alleryView, setAlleryView] = useState(false);
  const [embla, setEmbla] = useState<Embla | null>(null);

  useAnimationOffsetEffect(embla, TRANSITION_DURATION);

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
          h={"clamp(220px, 162.864px + 9.524vw, 300px)"}
          alt="menu item image"
        />
      </CreditsCard>
    </Carousel.Slide>
  ));

  const videoSlides = item?.videoUrl && (
    <Carousel.Slide>
      <YoutubeEmbed
        embedId={extractVideoId(item?.videoUrl)}
        sx={{
          aspectRatio: "4 / 3",
          borderRadius: "12px",
          border: "unset",
          height: "100%",
          width: "100%",
        }}
      />
    </Carousel.Slide>
  );
  const count = item?.images?.length + (item?.videoUrl ? 1 : 0);

  return (
    <Modal
      centered
      opened={!!item}
      onClose={onClose}
      size={"auto"}
      classNames={{
        content: classes.content,
        title: classes.title,
        close: classes.close,
      }}
      closeButtonProps={{ iconSize: "22px" }}
      ff={lexend.style.fontFamily}
      title={
        alleryView && (
          <IconArrowLeft
            size={22}
            color="var(--grey-color-4)"
            onClick={() => setAlleryView(false)}
          />
        )
      }
      scrollAreaComponent={ScrollArea.Autosize}
    >
      {alleryView ? (
        <Box w={"clamp(220px, 163.6624px + 15.0235vw, 380px)"} h={"500px"}>
          {item?.foodLabels?.length > 0 && (
            <>
              <Text>Allergen Info</Text>
              <Flex gap={"sm"} wrap={"wrap"} mt={"sm"}>
                <MenuFoodLabelBadge
                  foodLabels={item?.foodLabels ?? []}
                  fz={9}
                />
              </Flex>
            </>
          )}
        </Box>
      ) : (
        <Stack align="center" c={"var(--text-color-sp)"} gap={0}>
          <Box
            style={{
              maxWidth: smallScreen
                ? "80vw"
                : "clamp(220px, 163.6624px + 15.0235vw, 380px)",
              height: "clamp(220px, 162.864px + 9.524vw, 300px)",
              overflow: "clip",
            }}
          >
            {item?.images?.length > 0 || item?.videoUrl ? (
              <Carousel
                withIndicators={count > 1}
                withControls={count > 1}
                getEmblaApi={setEmbla}
              >
                {videoSlides}
                {imageSlides}
              </Carousel>
            ) : (
              <Image
                style={{
                  aspectRatio: "4 / 3",
                }}
                mih={220}
                radius={"sm"}
                src={fallbackImage}
                fallbackSrc={fallbackImage}
                alt="Menu Item Images"
              />
            )}
          </Box>

          <Box maw={"350px"} w={"100%"}>
            <Text
              fz="clamp(18px, -268px + 20vw, 20px)"
              fw={600}
              tt={"capitalize"}
              ta={"center"}
              my={"xs"}
            >
              {item.name}
            </Text>
            <ScrollAreaAutosize mah={150}>
              <Text maw={"350px"} px={smallScreen ? "xs" : "lg"}>
                {item.description}
              </Text>
            </ScrollAreaAutosize>
            <Stack gap={0} px={smallScreen ? "xs" : "lg"} py={"sm"}>
              {item?.foodLabels?.length > 0 && (
                <>
                  <Text>Allergen Info</Text>
                  <Flex align={"center"} gap={0} w={"100%"}>
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
                    {item?.foodLabels?.length > 1 && (
                      <RateupButtonPrimary
                        title="Show All"
                        sx={{
                          height: "20px",
                          width: "80px",
                        }}
                        size="xs"
                        onClick={() => setAlleryView(true)}
                      />
                    )}
                  </Flex>
                </>
              )}
            </Stack>
          </Box>
          <Group justify="space-evenly" gap={"sm"}>
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
                  <Text fz="clamp(16px, -270px + 20vw, 18px)" fw={500}>
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
              <Text fz="clamp(16px, -270px + 20vw, 18px)" mt={"md"} fw={500}>
                {item?.price?.price && (
                  <>
                    {currencyLabel[currency]?.symbol}
                    {item?.price?.price}
                  </>
                )}
              </Text>
            )}
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
