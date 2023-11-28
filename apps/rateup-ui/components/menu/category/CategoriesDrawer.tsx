import { Box, Drawer, Image, Stack, Text } from "@mantine/core";
import { getFileUrlFromKey } from "../../../utils/file-upload/upload";
import classes from "./CategoriesDrawerStyles.module.css";

interface CategoriesDrawerProps {
  opened: boolean;
  close: () => void;
  categories: FullCategory[];
  handleCategoryChipClick: any;
}
export function CategoriesDrawer({
  opened,
  close,
  categories,
  handleCategoryChipClick,
}: CategoriesDrawerProps) {
  return (
    <Drawer
      opened={opened}
      onClose={close}
      title="Categories"
      size={"xs"}
      classNames={{
        title: classes.title,
        header: classes.header,
        close: classes.close,
      }}
      closeButtonProps={{ iconSize: "30px" }}
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
              handleCategoryChipClick(c.id);
            }}
          >
            <Image
              src={
                c.image
                  ? getFileUrlFromKey(c.image)
                  : `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/no_image_template.jpeg`
              }
              width={"100%"}
              maw={"240px"}
            />
            <Box
              px="sm"
              py="2px"
              bg={"var(--orange-400)"}
              pos={"absolute"}
              bottom={"10px"}
              left={"50%"}
              style={{
                borderRadius: "8px",
                transform: "translate(-50%, 0)",
              }}
            >
              <Text
                c="white"
                w={"100%"}
                fw={600}
                ta={"center"}
                tt={"capitalize"}
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
