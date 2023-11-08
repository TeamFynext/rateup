import { Card, Group, Image, Stack, Text } from "@mantine/core";
import { getFileUrlFromKey } from "../../../utils/file-upload/upload";
import { useMediaQuery } from "@mantine/hooks";

interface ItemDisplayProps {
  item: MenuItem;
  setSelectedItem: (item: MenuItem) => void;
}
export function ItemDisplay({ item, setSelectedItem }: ItemDisplayProps) {
  const fallbackImage = "/images/no_image_template.jpeg";
  const smallScreen = useMediaQuery("(max-width: 40em)");

  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="lg"
      mx={smallScreen ? "auto" : "sm"}
      w={"300px"}
      onClick={() => setSelectedItem(item)}
    >
      <Card.Section>
        <Image
          width={"100%"}
          h={"100%"}
          maw={"300px"}
          src={
            item.images.length > 0
              ? getFileUrlFromKey(item.images[0])
              : fallbackImage
          }
          style={{
            aspectRatio: "4 / 3",
          }}
          fallbackSrc={fallbackImage}
          alt="image of menu item"
        />
      </Card.Section>
      <Group justify="space-between" mt="md" mb="xs">
        <Text
          fw={500}
          fz="xl"
          c="var(--shade-of-brown)"
          truncate
          tt={"capitalize"}
        >
          {item.name}
        </Text>
      </Group>

      <Text size="sm" c="dimmed" lineClamp={4} h={"82px"}>
        {item.description}
      </Text>
      <Group justify="space-evenly" gap={"sm"} mt="md">
        {item.price.variants?.length > 0 ? (
          item.price.variants.map((varient, index) => (
            <Stack align="center" gap={"0px"} key={index}>
              <Text fz="sm" c="dimmed">
                {varient.name}
              </Text>
              <Text c="var(--shade-of-brown)" fz="xl">
                ₹{varient.price}
              </Text>
            </Stack>
          ))
        ) : (
          <Text c="var(--shade-of-brown)" fz="xl" mt={"md"}>
            ₹{item?.price?.price}
          </Text>
        )}
      </Group>
    </Card>
  );
}
