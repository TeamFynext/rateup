import { Image } from "@mantine/core";

import { getFileUrlFromKey } from "@/utils/file-upload/upload";

interface Props {
  messageContent: string;
}
export default function WaInboxImage(props: Props) {
  const imageUrl = props?.messageContent.startsWith("http")
    ? props?.messageContent
    : `${getFileUrlFromKey(props?.messageContent)}`;
  return <Image src={imageUrl} alt="image" maw={"150px"} radius={"sm"} />;
}
