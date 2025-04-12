import { Image, Modal } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

import { getFileUrlFromKey } from "@/utils/file-upload/upload";

interface Props {
  messageContent: string;
}
export default function WaInboxImage(props: Props) {
  const imageUrl = props?.messageContent.startsWith("http")
    ? props?.messageContent
    : `${getFileUrlFromKey(props?.messageContent)}`;
  const [opened, { open, close }] = useDisclosure(false);
  return (
    <>
      <Image
        src={imageUrl}
        alt="image"
        maw={"150px"}
        radius={"sm"}
        onClick={open}
      />
      <Modal onClose={close} opened={opened} centered>
        <Image src={imageUrl} alt="image" w={"100%"} h={"100%"} radius={"sm"} />
      </Modal>
    </>
  );
}
