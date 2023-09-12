import { Box, Group, Modal, Stack, Text } from "@mantine/core";
import { IconPlayerPlayFilled } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { ItemDetailedViewModalStyles } from "./itemDetailedViewModal.styles";
import { getFileUrlFromKey } from "../../../utils/file-upload/upload";
import { extractVideoId } from "../../../utils/youtube/url";
import YoutubeEmbed from "../../youtube/YoutubeEmbed";

interface ItemDetailedViewModalProps {
  item: MenuItem;
  onClose: () => void;
}
export function ItemDetailedViewModal({ item, onClose }: ItemDetailedViewModalProps) {
  const { classes } = ItemDetailedViewModalStyles();
  const [selectedMedia, setSelectedMedia] = useState<string>(
    item.videoUrl ? item.videoUrl : item.images[0]
  );

  useEffect(() => {
    if (item.videoUrl) {
      if (!extractVideoId(item.videoUrl)) {
        setSelectedMedia(item.images[0]);
      }
    }
  }, [item]);

  return (
    <Modal centered opened={!!item} onClose={onClose} size={"auto"}
      classNames={{
        content: classes.content,
        header: classes.header,
        title: classes.title,
      }}

    >
      <Stack align="center">
        <Box>
          <Box
            sx={{
              width: "400px",
              height: "300px",
              overflow: "clip",
            }}
          >
            {
              // TODO: reduce number of extractVideoId calls
              //        maybe save videoId in db instead of full url?
              selectedMedia === item.videoUrl && extractVideoId(item.videoUrl) ? (
                <YoutubeEmbed
                  embedId={extractVideoId(item.videoUrl)}
                  sx={{
                    width: "400px",
                    aspectRatio: "4 / 3",
                    borderRadius: "12px",
                    border: "unset"
                  }} />
              ) : (
                <img
                  style={{
                    width: "400px",
                    aspectRatio: "4 / 3",
                    borderRadius: "16px"
                  }}
                  src={getFileUrlFromKey(selectedMedia)} />
              )}
          </Box>

          <Group position="center" mt="sm">
            {item.images.map(imageKey => (
              <img
                key={imageKey}
                width="75px"
                style={{
                  aspectRatio: "4 / 3",
                  cursor: "pointer",
                  borderRadius: "8px",
                }}
                src={getFileUrlFromKey(imageKey)}
                onClick={() => setSelectedMedia(imageKey)} />
            ))}
            <Box
              sx={{
                position: "relative",
              }}
              onClick={() => setSelectedMedia(item.videoUrl)}
            >
              {item.videoUrl && extractVideoId(item.videoUrl) && (
                <img
                  width="75px"
                  style={{
                    cursor: "pointer",
                    aspectRatio: "4 / 3",
                  }}
                  src={`http://img.youtube.com/vi/${extractVideoId(item.videoUrl)}/0.jpg`} />
              )}
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
                }} />
            </Box>
          </Group>
        </Box>

        <Box>
          <Text
            fz="1.5rem"
            fw={600}
            align="center"
          >{item.name}</Text>
          <Text
            align="center"
            c="dimmed"
            w={"350px"}
            h="100px"
            sx={{
              overflowY: "auto"
            }}
          >{item.description}</Text>
        </Box>
        <Group mt="sm">
          {item.price.variants?.length > 0 ? (
            item.price.variants.map((v, i) => (
              <Stack
                align="center"
                spacing={"0px"}
                key={i}
              >
                <Text
                  fz=".9rem"
                  c="dimmed"

                >
                  {v.name}
                </Text>
                <Text
                  color="#AF6B2E"
                  fz="1.2rem"
                >
                  ₹{v.price}
                </Text>
              </Stack>

            ))
          ) : (
            <Text
              color="#AF6B2E"
              fz="1.2rem"
            >
              ₹{item.price.price}
            </Text>

          )}
        </Group>
      </Stack>
    </Modal>
  );

}
