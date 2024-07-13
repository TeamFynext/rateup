import { Avatar, Box, Drawer, Image, Stack, Text } from "@mantine/core";
import { getFileUrlFromKey } from "../../../utils/file-upload/upload";
import classes from "./CategoriesDrawerStyles.module.css";
import { fallbackImage } from "../../../utils/constants";
import FloatingMenu from "pages/public/menu/[menuId]/feedback/FloatingMenu";

interface CategoriesDrawerProps {
  opened: boolean;
  close: () => void;
  categories: FullCategory[];
  handleCategoryChipClick: any;
  displayName?: string;
  logo?: string;
  menuButtons: any;
}
export function CategoriesDrawer({
  opened,
  close,
  categories,
  handleCategoryChipClick,
  displayName,
  logo,
  menuButtons,
}: CategoriesDrawerProps) {
  return (
    <Drawer
      opened={opened}
      onClose={close}
      title={
        <Avatar
          src={logo && getFileUrlFromKey(logo)}
          radius={"sm"}
          alt="logo of brand"
          name={displayName}
          color="initials"
        />
      }
      size={"xs"}
      classNames={{
        title: classes.title,
        header: classes.header,
        close: classes.close,
      }}
      closeButtonProps={{ iconSize: "30px" }}
    >
      <Stack align="center">
        {displayName && (
          <Text ta={"center"} tt={"uppercase"}>
            {displayName}
          </Text>
        )}
        <FloatingMenu dynamicVariables={menuButtons} />
        {categories?.length === 0 ? (
          <Text>No Categories Found</Text>
        ) : (
          categories?.map((c) => {
            const imageSrc = c.image
              ? getFileUrlFromKey(c.image)
              : fallbackImage;
            return (
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
                  src={imageSrc}
                  width={"100%"}
                  maw={"240px"}
                  alt="image of category"
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
            );
          })
        )}
      </Stack>
    </Drawer>
  );
}
