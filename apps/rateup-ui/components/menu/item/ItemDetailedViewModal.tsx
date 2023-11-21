import { Box, Group, Image, Modal, Stack, Text } from "@mantine/core";
import { IconPlayerPlayFilled } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { getFileUrlFromKey } from "../../../utils/file-upload/upload";
import { extractVideoId } from "../../../utils/youtube/url";
import YoutubeEmbed from "../../youtube/YoutubeEmbed";
import classes from "./itemDetailedViewModal.module.css";

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
    >
      <Stack align="center">
        <Box>
          <Box
            style={{
              maxWidth: "400px",
              maxHeight: "300px",
              minHeight: "230px",
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
                    width: "400px",
                    aspectRatio: "4 / 3",
                    borderRadius: "12px",
                    border: "unset",
                  }}
                />
              ) : (
                <Image
                  style={{
                    aspectRatio: "4 / 3",
                  }}
                  w={"400px"}
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

          <Group justify="center" mt="sm">
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
            c="dimmed"
            w={"350px"}
            h="100px"
            style={{
              overflowY: "auto",
              textAlign: "center",
            }}
          >
            {item.description}
          </Text>
        </Box>
        <Group justify="space-evenly" gap={"sm"}>
          {item.price.variants?.length > 0 ? (
            item.price.variants.map((varient, index) => (
              <Stack align="center" gap={"0px"} key={index}>
                <Text fz="sm" c="dimmed">
                  {varient.name}
                </Text>
                <Text fz="xl">
                  ₹{varient.price}
                </Text>
              </Stack>
            ))
          ) : (
            <Text fz="xl" mt={"md"}>
              ₹{item?.price?.price}
            </Text>
          )}
        </Group>
      </Stack>
    </Modal>
  );
}
