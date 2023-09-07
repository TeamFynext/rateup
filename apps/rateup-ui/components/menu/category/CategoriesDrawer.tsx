import { Box, Drawer, Stack, Text } from "@mantine/core";
import { DrawerStyles } from "./CategoriesDrawerStyles";
import { getFileUrlFromKey } from "../../../utils/file-upload/upload";

interface CategoriesDrawerProps {
  opened: boolean;
  close: () => void;
  categories: FullCategory[];
}
export function CategoriesDrawer({ opened, close, categories }: CategoriesDrawerProps) {
  const { classes } = DrawerStyles();

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
            sx={{
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
              src={getFileUrlFromKey(c.image)}
              width={"100%"} />
            <Box
              px="sm"
              py="2px"
              sx={{
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
                align="center"
                sx={{}}

              >{c.name}</Text>
            </Box>
          </Box>
        ))}

      </Stack>
    </Drawer>
  );
}
