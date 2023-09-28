import { Box, Drawer, Stack, Text } from "@mantine/core";
import { getFileUrlFromKey } from "../../../utils/file-upload/upload";
import classes from "./CategoriesDrawerStyles.module.css";

interface CategoriesDrawerProps {
  opened: boolean;
  close: () => void;
  categories: FullCategory[];
}
export function CategoriesDrawer({ opened, close, categories }: CategoriesDrawerProps) {

  return (
    <Drawer
      opened={opened}
      onClose={close}
      title="Categories"
      classNames={{
        content: classes.content,
        header: classes.header,
        title: classes.title,
      }}

    >
      <Stack
        align="center"
      >

        {categories.map(c => (
          <Box
            key={c.id}
            mah="300px"
            mih={"200px"}
            miw="200px"
            style={{
              overflow: "clip",
              position: "relative",
              borderRadius: "16px",
              cursor: "pointer"
            }}
            onClick={() => {
              close();
              window.location.href = `#${c.id}`;
            }}
          >
            <img
              src={
                c.image ? (
                  getFileUrlFromKey(c.image)
                ) : (
                  "/images/no_image_template.jpeg"
                )}
              width={"100%"}
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
                transform: "translate(-50%, 0)"
              }}
            >
              <Text
                c="white"
                w={"100%"}
                fw={600}
                style={{
                  textAlign:'center'
                }}  

              >{c.name}</Text>
            </Box>
          </Box>
        ))}

      </Stack>
    </Drawer>
  );
}
