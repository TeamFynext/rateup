import {
  ActionIcon,
  Container,
  Group,
  Paper,
  Stack,
  Text,
  Image,
  Flex,
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
import { GilroyBold, GilroyMedium } from "../../../../../public/fonts";
import Link from "next/link";
import { useRouter } from "next/router";

type MenuViewProp = {
  menuId: string;
};

export const getServerSideProps = async (context: { params: MenuViewProp }) => {
  const params = context.params;

  const fullMenu = await getFullMenuById(params.menuId);

  return { props: { fullMenu: fullMenu } };
};

export default function ({ fullMenu }) {
  const largeScreen = useMediaQuery("(min-width: 40em)");
  let categoryChipLabel = [{ id: "1", name: "all" }].concat(
    fullMenu?.categories,
  );
  const [categorys, setcategorys] = useState(fullMenu?.categories);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    categoryChipLabel[0]?.id,
  );
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [drawerOpen, { open, close }] = useDisclosure();

  function handleCategoryChipClick(categoryId: string) {
    setcategorys(
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
    ? "/images/menu/background.jpg"
    : "/images/menu/mobileBackground.jpg";
  const router = useRouter();

  return (
    <Paper mih={"100vh"}>
      <Container
        fluid
        px={largeScreen ? "10vw" : "1vw"}
        py="3vh"
        style={{
          // TODO: add blur to background image
          background: `linear-gradient(111deg, rgba(251, 181, 75, 0.73) -12.96%, rgba(246, 67, 0, 0.73) 57.7%), ${
            backgroundImage
              ? `url(${encodeURI(getFileUrlFromKey(backgroundImage))})`
              : `url(${backgroundImageFallback})`
          }`,
          backgroundColor: "var(--orange-400)",
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
              tt={"capitalize"}
              className={GilroyMedium.className}
              fz={"clamp(1.125rem, 0.5rem + 1.667vw, 2rem)"}
            >
              Welcome To
            </Text>
            {/* TODO: make this text responsive. (if longer name, smaller font) */}
            <Text
              fz={"clamp(1.75rem, 0.857rem + 2.381vw, 3rem)"}
              tt={"uppercase"}
              className={GilroyBold.className}
              ta={"center"}
            >
              {fullMenu?.displayName ?? "Name"}
            </Text>
          </div>
        </Stack>
      </Container>
      <Group
        px="2vw"
        m="sm"
        wrap="nowrap"
        py="md"
        pos={"sticky"}
        top={0}
        bg={"white"}
        style={{ zIndex: 10 }}
      >
        <ActionIcon onClick={open} variant="transparent">
          <IconMenu2 />
        </ActionIcon>
        <Group
          wrap="nowrap"
          style={{
            overflowX: "scroll",
          }}
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

      <Stack px={largeScreen ? "7vw" : "2vw"}>
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
      <Flex
        justify={"end"}
        pos={"sticky"}
        bottom={"0"}
        display={router?.query?.surveyId === undefined && "none"}
      >
        <Link
          href={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/public/survey/${router?.query?.surveyId}`}
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <Stack
            w={largeScreen ? "80px" : "50px"}
            h={largeScreen ? "80px" : "50px"}
            p={"lg"}
            m={"lg"}
            bg={"#F8951D"}
            style={{ borderRadius: "100%" }}
            justify="center"
            align="center"
            gap={0}
          >
            <Image
              src={"/images/menu/whiteRateUpLogo.png"}
              w={largeScreen ? "42px" : "26px"}
              h={largeScreen ? "38px" : "26px"}
            />
            <Text
              fz={"clamp(0.5rem, 0.243rem + 0.685vw, 0.859rem)"}
              c={"white"}
            >
              Feedback
            </Text>
          </Stack>
        </Link>
      </Flex>
    </Paper>
  );
}
