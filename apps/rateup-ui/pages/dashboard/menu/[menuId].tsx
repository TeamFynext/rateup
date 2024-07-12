import {
  Flex,
  Grid,
  Group,
  MantineProvider,
  Stack,
  Tabs,
  rem,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconFileImport,
  IconLayersSubtract,
  IconPlus,
} from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useMenuLandingById } from "../../../backend/menu/LandingPage/landingpage.query";
import {
  useCategories,
  useDeleteMenuCategoryMutation,
} from "../../../backend/menu/category/mCategory.query";
import { RateupButtonPrimary } from "../../../components/Button/RateupButtons";
import RateupLoader from "../../../components/Loaders/RateupLoader";
import { BannerAddAndViewModal } from "../../../components/Modal/BannerAddAndViewModal";
import NothingFound from "../../../components/NothingFound/NothingFound";
import { MotionTransition } from "../../../components/animation/MotionTransition";
import SearchBox from "../../../components/input/SearchBox";
import { CreateMenuCategoryModal } from "../../../components/menu/CreateMenuCategoryModal";
import MenuSettings from "../../../components/menu/Settings/MenuSettings";
import ShareMenu from "../../../components/menu/Share/ShareMenu";
import MenuAnalytics from "../../../components/menu/analytics/MenuAnalytics";
import { CategoryCard } from "../../../components/menu/category/CategoryCard";
import CategoryItemCsvModal from "../../../components/menu/category/CategoryItemCsvModal";
import Heading from "../../../components/styled/Heading/Heading";
import StyledTabs from "../../../components/styled/StyledTabs/StyledTabs";
import { useRouteParams } from "../../../context/RouteParamsContext";
import styles from "./menuId.module.css";
import { menuTheme } from "config/mantineTheme";

enum TabEnum {
  Menu = "Menu",
  Settings = "Settings",
  Share = "Share",
  Analytics = "Analytics",
}

export default function MenuById({ categories: initialCategories }) {
  const router = useRouter();
  const { menuId } = router.query as { menuId: string };
  const [searchText, setSearchText] = useState("");
  const { update } = useRouteParams();

  const [openCreateModal, { close, open }] = useDisclosure(false);
  const [openUploadCsv, { close: closeUploadCsv, toggle }] =
    useDisclosure(false);
  const [openBanner, { close: closeBanner, toggle: toggleBannerModal }] =
    useDisclosure(false);
  const deleteMutation = useDeleteMenuCategoryMutation(
    menuId,
    () => {},
    () => {},
  );
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(
    null,
  );
  const { tab = TabEnum.Menu } = router.query as { tab: string };
  let activeTab = tab?.toString() as TabEnum;

  const {
    isLoading: isLoadingMenu,
    isError: isErrorMenu,
    data: menuLandingData,
  } = useMenuLandingById(menuId);

  const {
    isLoading,
    isError,
    data: categories,
  } = useCategories(menuId, initialCategories);
  let filteredCategory = categories;

  useEffect(() => {
    update({ menuId: menuLandingData?.menu?.name });
  }, [menuLandingData?.menu?.name, update]);

  if ((!categories && (isLoading || isError)) || isLoadingMenu) {
    return (
      <MantineProvider theme={menuTheme}>
        <RateupLoader />
      </MantineProvider>
    );
  }
  let menu: any = menuLandingData?.menu;
  if (menuLandingData?.surveyTeamMapId) {
    menu.surveyTeamMapId = menuLandingData?.surveyTeamMapId;
  }

  function handleCreateCategory() {
    setEditingCategory(null);
    open();
  }

  function handleEditCategory(category: MenuCategory) {
    setEditingCategory(category);
    open();
  }

  function handleClose() {
    setEditingCategory(null);
    close();
  }

  return (
    <MantineProvider theme={menuTheme}>
      <Group grow h={"100%"} className={styles["menu-id-container"]}>
        <StyledTabs
          keepMounted={false}
          value={activeTab}
          onChange={(value) => {
            router.push(`${menuId}?tab=${value}`);
          }}
          h={"100%"}
        >
          <Grid columns={10} mb="md">
            <Grid.Col span={2}>
              <Heading title={menu?.name} titleprops={{ tt: "capitalize" }} />
            </Grid.Col>
            <Grid.Col span={6}>
              <Tabs.List>
                <Tabs.Tab value={TabEnum.Menu}>Menu</Tabs.Tab>
                <Tabs.Tab value={TabEnum.Settings}>Settings</Tabs.Tab>
                <Tabs.Tab value={TabEnum.Share}>Share</Tabs.Tab>
                <Tabs.Tab value={TabEnum.Analytics}>Analytics</Tabs.Tab>
              </Tabs.List>
            </Grid.Col>
          </Grid>
          <MotionTransition
            keyValue={{ id: activeTab ? activeTab : null }}
            duration={0.6}
            apEnable={false}
            type="fade"
            style={{ height: "100%", flex: 1, overflow: "auto" }}
          >
            <Tabs.Panel
              className={styles["menu-id-panel"]}
              value={TabEnum.Menu}
            >
              <Stack h={"100%"}>
                <Flex justify={"space-between"} wrap={"wrap"} pt={"0.3125rem"}>
                  <Group>
                    <RateupButtonPrimary
                      title="Add Category"
                      rightIcon={<IconPlus />}
                      radius="xl"
                      size="md"
                      onClick={handleCreateCategory}
                    />
                    <RateupButtonPrimary
                      title="Import Menu"
                      rightIcon={<IconFileImport size={16} />}
                      radius="xl"
                      size="md"
                      onClick={toggle}
                      variant="outline"
                    />
                  </Group>

                  <SearchBox
                    searchText={searchText}
                    setSearchText={setSearchText}
                    sx={{
                      // visibility: activeTab === TabEnum.Menu ? "visible" : "hidden",
                      display: "none",
                    }}
                  />
                  <RateupButtonPrimary
                    title="Manage Banners"
                    rightIcon={
                      <IconLayersSubtract
                        style={{ width: rem(18), height: rem(18) }}
                        stroke={1.5}
                      />
                    }
                    radius="xl"
                    size="md"
                    onClick={toggleBannerModal}
                    variant="light"
                    sx={{
                      borderColor: "var(--mantine-primary-color-filled)",
                    }}
                  />
                  <BannerAddAndViewModal
                    menuId={menuId}
                    opened={openBanner}
                    onClose={closeBanner}
                    currency={menu?.currency}
                  />
                </Flex>
                <Stack
                  p={"0.3125rem"}
                  pb={""}
                  h={"100%"}
                  flex={1}
                  style={{ overflow: "auto" }}
                  mah={800}
                >
                  {filteredCategory?.length === 0 ? (
                    <NothingFound text="No Category available." />
                  ) : (
                    filteredCategory?.map((category) => (
                      <CategoryCard
                        key={category.id}
                        category={category}
                        handleDelete={deleteMutation}
                        handleEdit={handleEditCategory}
                        searchText={searchText}
                        currency={menu?.currency}
                        headerOrder={filteredCategory?.map(
                          ({ id, name, image }) => ({
                            id,
                            name,
                            image,
                          }),
                        )}
                      />
                    ))
                  )}
                </Stack>
                <CategoryItemCsvModal
                  opened={openUploadCsv}
                  close={closeUploadCsv}
                  menuId={menuId}
                />
                <CreateMenuCategoryModal
                  opened={openCreateModal}
                  close={handleClose}
                  menuId={menuId}
                  editingItem={editingCategory}
                />
              </Stack>
            </Tabs.Panel>
            <Tabs.Panel
              className={styles["menu-id-panel"]}
              value={TabEnum.Settings}
            >
              <MenuSettings menuLandingData={menuLandingData} />
            </Tabs.Panel>
            <Tabs.Panel
              className={styles["menu-id-panel"]}
              value={TabEnum.Share}
            >
              {menu && <ShareMenu menu={menu} />}
            </Tabs.Panel>
            <Tabs.Panel
              className={styles["menu-id-panel"]}
              value={TabEnum.Analytics}
            >
              <MenuAnalytics
                surveyTeamMapId={menuLandingData?.surveyTeamMapId}
                visited={menuLandingData?.visited}
                surveyId={menuLandingData?.surveyTeamMap?.surveyId}
                subscription={menuLandingData?.subscription}
              />
            </Tabs.Panel>
          </MotionTransition>
        </StyledTabs>
      </Group>
    </MantineProvider>
  );
}
