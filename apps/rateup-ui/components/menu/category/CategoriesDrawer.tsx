import { Box, Drawer, Image, Stack, Text } from "@mantine/core";
import { getFileUrlFromKey } from "../../../utils/file-upload/upload";
import classes from "./CategoriesDrawerStyles.module.css";

interface CategoriesDrawerProps {
  opened: boolean;
  close: () => void;
  categories: FullCategory[];
}
export function CategoriesDrawer({
  opened,
  close,
  categories,
}: CategoriesDrawerProps) {
  return (
    <Drawer
      opened={opened}
      onClose={close}
      title="Categories"
      size={"xs"}
      classNames={{
        content: classes.content,
        header: classes.header,
        title: classes.title,
        close: classes.close
      }}
    >
      <Stack align="center" mt={"lg"}>
        {categories?.map((c) => (
          <Box
            key={c.id}
            h={"125px"}
            w="243px"
            my={"sm"}
            style={{
              overflow: "clip",
              position: "relative",
              borderRadius: "16px",
              cursor: "pointer",
            }}
            onClick={() => {
              close();
              window.location.href = `#${c.id}`;
            }}
          >
            <Image
              src={
                c.image
                  ? getFileUrlFromKey(c.image)
                  : "/images/no_image_template.jpeg"
              }
              width={"100%"}
              maw={"240px"}
            />
            <Box
              px="sm"
              py="2px"
              style={{
                backgroundColor: "black",
                borderRadius: "8px",
                position: "absolute",
                bottom: "10px",
                left: "50%",
                transform: "translate(-50%, 0)",
              }}
            >
              <Text
                c="white"
                w={"100%"}
                fw={600}
                style={{
                  textAlign: "center",
                }}
              >
                {c.name}
              </Text>
            </Box>
          </Box>
        ))}
      </Stack>
    </Drawer>
  );
}
