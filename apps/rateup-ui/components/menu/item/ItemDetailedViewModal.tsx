import {
  Box,
  Flex,
  Group,
  Image,
  Modal,
  ScrollAreaAutosize,
  Stack,
  Text,
} from "@mantine/core";
import { IconArrowLeft, IconPlayerPlayFilled } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { getFileUrlFromKey } from "../../../utils/file-upload/upload";
import { extractVideoId } from "../../../utils/youtube/url";
import YoutubeEmbed from "../../youtube/YoutubeEmbed";
import classes from "./itemDetailedViewModal.module.css";
import { useMediaQuery } from "@mantine/hooks";
import { lexend } from "../../../utils/fonts";
import { currencyLabel } from "../util/currencyData";
import { fallbackImage } from "../../../utils/constants";
import MenuFoodLabelBadge from "../category/tag/MenuFoodLabelBadge";
import { RateupButtonPrimary } from "../../Button/RateupButtons";
interface ItemDetailedViewModalProps {
  item: MenuItem;
  onClose: () => void;
  currency: string;
}
export function ItemDetailedViewModal({
  item,
  onClose,
  currency = "0",
}: ItemDetailedViewModalProps) {
  const [selectedMedia, setSelectedMedia] = useState<string>(
    item?.videoUrl?.length === 0 ? (item?.images[0] as string) : item?.videoUrl,
  );
  const smallScreen = useMediaQuery("(max-width: 30em)");
  const [alleryView, setAlleryView] = useState(false);
  useEffect(() => {
    if (item.videoUrl) {
      if (!extractVideoId(item?.videoUrl)) {
        setSelectedMedia(item?.images[0] as string);
      }
    }
  }, [item]);
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
    >
      <ScrollAreaAutosize mah={"80vh"} scrollbarSize={0}>
        {alleryView ? (
          <Box
            w={
              smallScreen
                ? "80vw"
                : "clamp(220px, 163.6624px + 15.0235vw, 380px)"
            }
            h={"500px"}
          >
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
          <Stack align="center" c={"var(--grey-color)"} gap={0}>
            <Box>
              <Box
                style={{
                  maxWidth: "400px",
                  maxHeight: "300px",
                  minHeight: "180px",
                  overflow: "clip",
                }}
              >
                {
                  // TODO: reduce number of extractVideoId calls
                  //        maybe save videoId in db instead of full url?
                  selectedMedia === item?.videoUrl &&
                  extractVideoId(item?.videoUrl) ? (
                    <YoutubeEmbed
                      embedId={extractVideoId(item?.videoUrl)}
                      sx={{
                        width: smallScreen
                          ? "80vw"
                          : "clamp(220px, 163.6624px + 15.0235vw, 380px)",
                        aspectRatio: "4 / 3",
                        borderRadius: "12px",
                        border: "unset",
                        maxHeight: smallScreen ? "228px" : "278px",
                      }}
                    />
                  ) : (
                    <Image
                      style={{
                        aspectRatio: "4 / 3",
                      }}
                      w={
                        smallScreen
                          ? "80vw"
                          : "clamp(220px, 163.6624px + 15.0235vw, 380px)"
                      }
                      maw={"400px"}
                      mih={220}
                      radius={"lg"}
                      src={
                        selectedMedia
                          ? getFileUrlFromKey(selectedMedia)
                          : fallbackImage
                      }
                      fallbackSrc={fallbackImage}
                      alt="background image of menu"
                    />
                  )
                }
              </Box>
              <Group justify="center" mt="xs">
                {item?.images?.map((imageKey: string) => (
                  <Image
                    key={imageKey}
                    w="75px"
                    style={{
                      aspectRatio: "4 / 3",
                      cursor: "pointer",
                    }}
                    mih={56}
                    radius={"sm"}
                    src={getFileUrlFromKey(imageKey)}
                    onClick={() => setSelectedMedia(imageKey)}
                    fallbackSrc={fallbackImage}
                    alt="background image of menu (thumbnail)"
                  />
                ))}
                <Box
                  pos={"relative"}
                  onClick={() => setSelectedMedia(item?.videoUrl)}
                >
                  {item.videoUrl && extractVideoId(item?.videoUrl) && (
                    <>
                      <Image
                        w="75px"
                        style={{
                          cursor: "pointer",
                          aspectRatio: "4 / 3",
                        }}
                        src={`http://img.youtube.com/vi/${extractVideoId(
                          item?.videoUrl,
                        )}/0.jpg`}
                        alt="video of menu"
                      />
                      <IconPlayerPlayFilled
                        color="white"
                        style={{
                          color: "white",
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          borderRadius: 1000,
                          border: "2px solid white",
                          boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.25)",
                        }}
                      />
                    </>
                  )}
                </Box>
              </Group>
            </Box>

            <Box maw={"350px"}>
              <Text
                fz="clamp(18px, -268px + 20vw, 20px)"
                fw={600}
                tt={"capitalize"}
                ta={"center"}
              >
                {item.name}
              </Text>
              <ScrollAreaAutosize mah={100}>
                <Text maw={"350px"} px={smallScreen ? "xs" : "lg"}>
                  {item.description}
                </Text>
              </ScrollAreaAutosize>
              <Stack gap={0} px={smallScreen ? "xs" : "lg"} py={"sm"}>
                {item?.foodLabels?.length > 0 && (
                  <>
                    <Text>Allergen Info</Text>
                    <Flex align={"center"} gap={0}>
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
                      <RateupButtonPrimary
                        title="Show All"
                        size="xs"
                        onClick={() => setAlleryView(true)}
                      />
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
      </ScrollAreaAutosize>
    </Modal>
  );
}
