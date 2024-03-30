import { Stack, Image, Text } from "@mantine/core";

interface NothingFoundProps {
  text: string;
}
export default function NothingFound({ text }: NothingFoundProps) {
  return (
    <Stack h={"100%"} align={"center"} justify="center" p={"xl"} flex={1}>
      <Image
        src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/nodata.svg`}
        alt="Nothing found"
        maw={140}
        opacity={0.35}
      />
      <Text c={"dimmed"} fw={500}>
        {text ? text : "Nothing found"}
      </Text>
    </Stack>
  );
}
