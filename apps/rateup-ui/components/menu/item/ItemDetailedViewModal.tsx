import { Box, Group, Image, Modal, Stack, Text } from "@mantine/core";
import { IconPlayerPlayFilled } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { getFileUrlFromKey } from "../../../utils/file-upload/upload";
import { extractVideoId } from "../../../utils/youtube/url";
import YoutubeEmbed from "../../youtube/YoutubeEmbed";
import classes from "./itemDetailedViewModal.module.css";
import { useMediaQuery } from "@mantine/hooks";
import { lexend300 } from "../../../utils/fonts";

interface ItemDetailedViewModalProps {
  item: MenuItem;
  onClose: () => void;
}
export function ItemDetailedViewModal({
  item,
  onClose,
}: ItemDetailedViewModalProps) {
  const [selectedMedia, setSelectedMedia] = useState<string>(
    item?.videoUrl ? item?.videoUrl : item?.images[0],
  );
  const smallScreen = useMediaQuery("(max-width: 30em)");

  useEffect(() => {
    if (item.videoUrl) {
      if (!extractVideoId(item?.videoUrl)) {
        setSelectedMedia(item?.images[0]);
      }
    }
  }, [item]);
  const fallbackImage = `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/no_image_template.jpeg`;
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
      ff={lexend300.style.fontFamily}
    >
      <Stack align="center" c={"var(--grey-color)"}>
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
            {item?.images?.map((imageKey) => (
              <Image
                key={imageKey}
                w="75px"
                style={{
                  aspectRatio: "4 / 3",
                  cursor: "pointer",
                }}
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

        <Box>
          <Text fz="xl" fw={600} tt={"capitalize"} ta={"center"}>
            {item.name}
          </Text>
          <Text
            maw={"350px"}
            h="100px"
            px={"lg"}
            style={{
              overflowY: "auto",
            }}
          >
            {item.description}
          </Text>
        </Box>
        <Group justify="space-evenly" gap={"sm"}>
          {item.price.variants?.length > 0 ? (
            item.price.variants.map((varient, index) => (
              <Stack align="center" gap={"0px"} key={index}>
                <Text
                  fz={"clamp(14px, 6.864px + 1.19vw, 24px)"}
                  tt={"capitalize"}
                  fw={500}
                >
                  {varient.name}
                </Text>
                <Text fz="clamp(16px, 7.424px + 1.429vw, 28px)" fw={500}>
                  {varient.price}
                </Text>
              </Stack>
            ))
          ) : (
            <Text fz="clamp(16px, 7.424px + 1.429vw, 28px)" mt={"md"} fw={500}>
              {item?.price?.price}
            </Text>
          )}
        </Group>
      </Stack>
    </Modal>
  );
}
