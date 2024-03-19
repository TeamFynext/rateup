import { Image } from "@mantine/core";

interface Props {
  messageContent: string;
}
export default function WaInboxImage(props: Props) {
  return (
    <Image
      src={`${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${props?.messageContent}`}
      alt="image"
      maw={"150px"}
      radius={"sm"}
    />
  );
}
