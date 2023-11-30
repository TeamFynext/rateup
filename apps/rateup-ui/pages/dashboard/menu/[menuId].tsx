import { Flex, Grid, Group, Stack, Tabs } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useRouter } from "next/router";
import SearchBox from "../../../components/input/SearchBox";
import { useEffect, useState } from "react";
import CenteredSpinner from "../../../components/Loaders/CenteredSpinner";
import {
  useCategories,
  useDeleteMenuCategoryMutation,
} from "../../../backend/menu/category/mCategory.query";
import { useDisclosure } from "@mantine/hooks";
import { CreateMenuCategoryModal } from "../../../components/menu/CreateMenuCategoryModal";
import { CategoryCard } from "../../../components/menu/category/CategoryCard";
import StyledTabs from "../../../components/styled/StyledTabs/StyledTabs";
import { RateupButtonBlue } from "../../../components/Button/RateupButtons";
import MenuSettings from "../../../components/menu/Settings/MenuSettings";
import ShareMenu from "../../../components/menu/Share/ShareMenu";
import LandingPage from "../../../components/menu/landingPage/LandingPage";
import { useMenuLandingById } from "../../../backend/menu/LandingPage/landingpage.query";
import { transformData } from "../../../components/menu/util/transformData";
import Heading from "../../../components/styled/Heading/Heading";
import NothingFound from "../../../components/NothingFound/NothingFound";
import MenuAnalytics from "../../../components/menu/analytics/MenuAnalytics";

enum TabEnum {
  Menu = "Menu",
  Settings = "Settings",
  LandingPage = "LandingPage",
  Share = "Share",
  Analytics = "Analytics",
}

export default ({ categories: initialCategories }) => {
  const router = useRouter();
  const { menuId } = router.query as { menuId: string };
  const [searchText, setSearchText] = useState("");

  const [openCreateModal, { close, open }] = useDisclosure(false);
  const deleteMutation = useDeleteMenuCategoryMutation(
    menuId,
    () => {},
    () => {},
  );
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(
    null,
  );

  const { tab } = router.query;
  const [activeTab, setActiveTab] = useState<TabEnum | null>(
    tab == TabEnum.Share ? TabEnum.Share : TabEnum.Menu,
  );

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
    if (
      tab &&
      tab !== activeTab &&
      Object.values(TabEnum).includes(tab as any)
    ) {
      setActiveTab(tab as TabEnum);
    }
  }, [tab]);

  if ((!categories && (isLoading || isError)) || isLoadingMenu) {
    return <CenteredSpinner />;
  }
  let menu: any = menuLandingData?.menu;
  if (menuLandingData?.surveyTeamMapId) {
    menu.surveyTeamMapId = menuLandingData?.surveyTeamMapId;
  }

  const transformedData = transformData(menuLandingData);
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
    <Group grow mx={"md"}>
      <StyledTabs
        keepMounted={false}
        value={activeTab}
        onChange={(value) => {
          router.push(`${menuId}?tab=${value}`);
          setActiveTab(value as TabEnum);
        }}
      >
        <Grid columns={10} mb="md">
          <Grid.Col span={2}>
            <Heading title={menu?.name} titleprops={{ tt: "capitalize" }} />
          </Grid.Col>
          <Grid.Col span={6}>
            <Tabs.List>
              <Tabs.Tab value={TabEnum.Menu}>Menu</Tabs.Tab>
              <Tabs.Tab value={TabEnum.Settings}>Settings</Tabs.Tab>
              <Tabs.Tab value={TabEnum.LandingPage}>Landing Page</Tabs.Tab>
              <Tabs.Tab value={TabEnum.Share}>Share</Tabs.Tab>
              <Tabs.Tab value={TabEnum.Analytics}>Analytics</Tabs.Tab>
            </Tabs.List>
          </Grid.Col>
        </Grid>
        <Tabs.Panel value={TabEnum.Menu}>
          <Flex justify={"space-between"} wrap={"wrap"}>
            <RateupButtonBlue
              title="Add Category"
              rightIcon={<IconPlus />}
              radius="xl"
              size="md"
              onClick={handleCreateCategory}
            />
            <SearchBox
              searchText={searchText}
              setSearchText={setSearchText}
              sx={{
                // visibility: activeTab === TabEnum.Menu ? "visible" : "hidden",
                visibility: "hidden",
              }}
            />
          </Flex>
          <Stack mt="sm">
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
                  headerOrder={filteredCategory?.map(({ id, name, image }) => ({
                    id,
                    name,
                    image,
                  }))}
                />
              ))
            )}
          </Stack>
          <CreateMenuCategoryModal
            opened={openCreateModal}
            close={handleClose}
            menuId={menuId}
            editingItem={editingCategory}
          />
        </Tabs.Panel>
        <Tabs.Panel value={TabEnum.Settings}>
          <MenuSettings menu={menu} />
        </Tabs.Panel>
        <Tabs.Panel value={TabEnum.LandingPage}>
          <LandingPage editingItem={transformedData} />
        </Tabs.Panel>
        <Tabs.Panel value={TabEnum.Share}>
          {menu && <ShareMenu menu={menu} />}
        </Tabs.Panel>
        <Tabs.Panel value={TabEnum.Analytics}>
          <MenuAnalytics
            surveyTeamMapId={menuLandingData?.surveyTeamMapId}
            visited={menuLandingData?.visited}
            surveyId={menuLandingData?.surveyTeamMap?.surveyId}
          />
        </Tabs.Panel>
      </StyledTabs>
    </Group>
  );
};
