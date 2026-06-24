import { Image, Modal, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

import { getFileUrlFromKey } from "@/utils/file-upload/upload.ts";

interface Props {
  messageContent: string;
}
export default function WaInboxImage(props: Props) {
  const [link, caption] = props?.messageContent?.split("_caption_") ?? ["", ""];
  const imageUrl = link ? (link.startsWith("http") ? link : `${getFileUrlFromKey(link)}`) : "";
  const [opened, { open, close }] = useDisclosure(false);
  return (
    <>
      <Stack gap={1} p={0}>
        <Image src={imageUrl} alt="image" maw={"150px"} radius={"sm"} onClick={open} />
        <Text size="sm">{caption}</Text>
      </Stack>
      <Modal onClose={close} opened={opened} centered>
        <Image src={imageUrl} alt="image" w={"100%"} h={"100%"} radius={"sm"} />
      </Modal>
    </>
  );
}
