import {
  ActionIcon,
  Group,
  Paper,
  Stack,
  Text,
  Image,
  BackgroundImage,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { IconMenu2 } from "@tabler/icons-react";
import { getFileUrlFromKey } from "../../../../../utils/file-upload/upload";
import { useState } from "react";
import { CategoryChip } from "../../../../../components/menu/category/CategoryChip";
import { CategoryDisplay } from "../../../../../components/menu/category/CategoryDisplay";
import { CategoriesDrawer } from "../../../../../components/menu/category/CategoriesDrawer";
import { ItemDetailedViewModal } from "../../../../../components/menu/item/ItemDetailedViewModal";
import { getFullMenuById } from "../../../../../backend/menu/menu.api";
import { useRouter } from "next/router";
import { lexend } from "../../../../../utils/fonts";

type MenuViewProp = {
  menuId: string;
};

export const getServerSideProps = async (context: { params: MenuViewProp }) => {
  const params = context.params;

  const fullMenu = await getFullMenuById(params.menuId);
  
  return { props: { fullMenu: fullMenu } };
};

export default function ({ fullMenu }) {
  const router = useRouter();
  const largeScreen = useMediaQuery("(min-width: 40em)");
  let categoryChipLabel = [{ id: "1", name: "all" }].concat(
    fullMenu?.categories,
  );
  const [categorys, setCategorys] = useState(fullMenu?.categories);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    categoryChipLabel[0]?.id,
  );
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [drawerOpen, { open, close }] = useDisclosure();

  function handleCategoryChipClick(categoryId: string) {
    setCategorys(
      categoryId === "1"
        ? categoryChipLabel.filter((category) => category.id !== categoryId)
        : categoryChipLabel.filter((category) => category.id === categoryId),
    );
    setSelectedCategory(categoryId);
  }

  const backgroundImageBorderRadius = largeScreen ? "47px" : "22px";
  const backgroundImage = largeScreen
    ? fullMenu?.menuLanding?.backgroundImage
    : fullMenu?.menuLanding?.mobileBackgroundImage;
  const backgroundImageFallback = largeScreen
    ? `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/menu/background.jpg`
    : `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/menu/mobileBackground.jpg`;

  return (
    <Paper mih={"100vh"} ff={lexend.style.fontFamily}>
      <BackgroundImage
        px={largeScreen ? "10vw" : "1vw"}
        py="3vh"
        src={
          backgroundImage
            ? encodeURI(getFileUrlFromKey(backgroundImage))
            : backgroundImageFallback
        }
        style={{
          borderRadius: `0 0 ${backgroundImageBorderRadius} ${backgroundImageBorderRadius}`,
          backgroundColor: "var(--orange-400)",
        }}
        bgp={"center"}
        bgsz={"cover"}
        c={"white"}
        h={"33vh"}
        maw={largeScreen ? "2440px" : "768px"}
      >
        <Stack
          align="center"
          style={{
            padding: "0 20px 0 20px",
          }}
          justify="center"
          h="100%"
          mb="lg"
        >
          {fullMenu?.logo && (
            <Image
              w="100px"
              h={"100px"}
              style={{
                borderRadius: "4px",
              }}
              src={getFileUrlFromKey(fullMenu?.logo)}
            />
          )}
          <div>
            <Text
              ta={"center"}
              fz={
                fullMenu?.menuLanding?.headerStyle?.fontSize
                  ? `clamp(1.125rem, 0.5rem + 1.667vw, ${fullMenu?.menuLanding?.headerStyle?.fontSize}px)`
                  : "clamp(1.125rem, 0.5rem + 1.667vw, 2rem)"
              }
              fw={fullMenu?.menuLanding?.headerStyle?.fontWeight ?? "bold"}
              c={fullMenu?.menuLanding?.headerStyle?.color ?? "inherit"}
            >
              {fullMenu?.menuLanding?.headerText ?? "Welcome To"}
            </Text>
            <Text
              fz={
                fullMenu?.menuLanding?.titleStyle?.fontSize
                  ? `clamp(1.75rem, 0.857rem + 2.381vw,${fullMenu?.menuLanding?.titleStyle?.fontSize}px )`
                  : "clamp(1.75rem, 0.857rem + 2.381vw, 3rem))"
              }
              fw={fullMenu?.menuLanding?.titleStyle?.fontWeight ?? "bold"}
              c={fullMenu?.menuLanding?.titleStyle?.color ?? "inherit"}
              ta={"center"}
            >
              {fullMenu?.displayName ?? "Name"}
            </Text>
          </div>
        </Stack>
      </BackgroundImage>
      <Group
        px="lg"
        m="sm"
        wrap="nowrap"
        py="sm"
        pos={"sticky"}
        top={0}
        bg={"white"}
        style={{ zIndex: 10 }}
      >
        <ActionIcon onClick={open} variant="transparent">
          <IconMenu2 color="var(--grey-color)" />
        </ActionIcon>
        <Group
          wrap="nowrap"
          style={{
            overflowX: "scroll",
          }}
          gap={largeScreen ? "sm" : 0}
        >
          {categoryChipLabel?.map((c) => (
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

      <Stack px={"5.8vw"} mih={"45vh"}>
        {categorys?.map((c) => (
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
        categories={fullMenu?.categories}
        handleCategoryChipClick={handleCategoryChipClick}
      />
      {selectedItem && (
        <ItemDetailedViewModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
      <Stack pos={"fixed"} bottom={40} right={30}>
        <Stack
          w={largeScreen ? "90px" : "70px"}
          h={largeScreen ? "90px" : "70px"}
          bg={"#F8951D"}
          style={{ borderRadius: "100%" }}
          justify="center"
          align="center"
          gap={0}
          onClick={() => {
            router.push(
              `${process.env.NEXT_PUBLIC_FRONTEND_URL}/public/survey/${fullMenu?.menuLanding?.surveyTeamMapId}`,
            );
          }}
        >
          <Image
            src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/menu/whiteRateUpLogo.png`}
            w={largeScreen ? "42px" : "26px"}
            h={largeScreen ? "38px" : "26px"}
          />
          <Text
            fz={"clamp(0.688rem, 0.509rem + 0.476vw, 0.938rem)"}
            c={"white"}
            fw={500}
          >
            Feedback
          </Text>
        </Stack>
      </Stack>
    </Paper>
  );
}
