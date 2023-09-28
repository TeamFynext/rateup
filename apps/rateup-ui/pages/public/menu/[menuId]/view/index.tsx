import { ActionIcon, Container, Group, Paper, Stack, Text } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { IconMenu2 } from "@tabler/icons-react";
import { getFileUrlFromKey } from "../../../../../utils/file-upload/upload";
import { useEffect, useState } from "react";
import { CategoryChip } from "../../../../../components/menu/category/CategoryChip";
import { CategoryDisplay } from "../../../../../components/menu/category/CategoryDisplay";
import { CategoriesDrawer } from "../../../../../components/menu/category/CategoriesDrawer";
import { ItemDetailedViewModal } from "../../../../../components/menu/item/ItemDetailedViewModal";
import { getFullMenuPublicById } from "../../../../../backend/menu/menu.api";
import axios from "axios";

export default function ({ fullMenu }) {
  const largeScreen = useMediaQuery('(min-width: 60em)');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [drawerOpen, { open, close }] = useDisclosure()

  useEffect(() => {
    if (!fullMenu || selectedCategory || fullMenu.categories.length === 0) return
    setSelectedCategory(fullMenu.categories[0].id)
  }, [fullMenu])

  function handleCategoryChipClick(categoryId: string) {
    setSelectedCategory(categoryId)
  }

  const backgroundImageBorderRadius = largeScreen ? "32px" : "16px"

  return (
    <Paper
      style={{
        height: "100vh",
      }}

    >
      <Container
        fluid
        px={largeScreen ? "10vw" : "1vw"} py="3vh"
        style={{
          // TODO: add blur to background image
          background: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), ${fullMenu.backgroundImage ? `url(${getFileUrlFromKey(fullMenu.backgroundImage)})` : ""}`,
          backgroundColor: "#121212",
          backgroundPosition: "center",
          backgroundSize: "cover",
          height: "33vh",
          color: "white",
          borderRadius: `0 0 ${backgroundImageBorderRadius} ${backgroundImageBorderRadius}`,
        }}
      >
        <Stack
          align="center"
          style={{
            padding: "0 20px 0 20px"
          }}
          justify="center"
          h="100%"
          mb="lg"
        >
          {fullMenu.logo && (
            <img
              width="100px"
              height={"100px"}
              style={{
                borderRadius: "4px"
              }}
              src={getFileUrlFromKey(fullMenu.logo)}
            />
          )}
          <div>
            <Text style={{ textAlign: 'center' }} >Welcome To</Text>
            {/* TODO: make this text responsive. (if longer name, smaller font) */}
            <Text fz={"max(3vw, 2rem)"} fw="bold" >{fullMenu.displayName}</Text>
          </div>
        </Stack>
      </Container>
      <Group
        px="2vw"
        m="sm"
        wrap="nowrap"
        pb="md"

      >
        <ActionIcon
          onClick={open}
        >
          <IconMenu2 />
        </ActionIcon>
        <Group
          wrap="nowrap"
          style={{
            overflowX: "scroll",
          }}
        >
          {fullMenu.categories.map(c => (
            <CategoryChip
              key={c.id}
              categoryId={c.id}
              name={c.name}
              selected={selectedCategory === c.id}
              onClick={handleCategoryChipClick}
            />
          ))}
        </Group>
      </Group>

      <Stack
        px={largeScreen ? "10vw" : "2vw"}
      >
        {fullMenu.categories.map(c => (
          <CategoryDisplay
            key={c.id}
            setSelectedItem={setSelectedItem}
            category={c}
          />
        ))}
      </Stack>
      <CategoriesDrawer
        opened={drawerOpen}
        close={close}
        categories={fullMenu.categories}
      />
      {
        selectedItem && (<ItemDetailedViewModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />)
      }
    </Paper>
  )
}

export async function getServerSideProps({ params }) {
  const { menuId } = params
  const fullMenu = await getFullMenuPublicById(menuId)
  if (!fullMenu) {
    return {
      notFound: true,
    }
  } else {
    return {
      props: {
        fullMenu
      }
    }
  }
}