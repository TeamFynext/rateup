import { Box, Group, Paper, Stack, Text } from "@mantine/core";
import { getFileUrlFromKey } from "../../../utils/file-upload/upload";

interface ItemDisplayProps {
  item: MenuItem;
  setSelectedItem: (item: MenuItem) => void;
}
export function ItemDisplay({ item, setSelectedItem }: ItemDisplayProps) {
  const bordeRadius = "12px";
  return (
    <Paper
      mx="sm"
      style={{
        borderRadius: bordeRadius,
        boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.25)",
        height: "100%",
        width: "300px",
      }}
      onClick={() => setSelectedItem(item)}
    >
      <Box
        style={{
          width: "300px",
          aspectRatio: "4 / 3",
          overflow: "clip",
          borderRadius: `${bordeRadius} ${bordeRadius} 0 0}`,
        }}
      >
        <img
          width={"100%"}
          src={
            item.images.length > 0 ? (
              getFileUrlFromKey(item.images[0])
            ) : (
              "/images/no_image_template.jpeg"
            )}
          style={{
            aspectRatio: "4 / 3",
          }} />
      </Box>
      <Stack
        p="md"
      >
        <Text
          fz="1.5rem"
          color="#AF6B2E"
          fw={600}
          truncate
        >
          {item.name}
        </Text>
        <Text
          style={{
            height: "100px"
          }}
          lineClamp={4}
        >
          {item.description}
        </Text>
        <Group
          h="50px"
          justify="center"
          gap={"sm"}
        >
          {item.price.variants?.length > 0 ? (
            item.price.variants.map((v, index) => (
              <Stack
                align="center"
                gap={"0px"}
                key={index}
              >
                <Text
                  fz=".9rem"
                  c="dimmed"

                >{v.name}</Text>
                <Text
                  c="#AF6B2E"
                  fz="1.2rem"
                >₹{v.price}</Text>
              </Stack>
            ))

          ) : (
            <Text
              c="#AF6B2E"
              fz="1.2rem"
            >₹{item.price.price}</Text>
          )}
        </Group>
      </Stack>
    </Paper>
  );
}
