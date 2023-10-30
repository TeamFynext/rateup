import { Flex, Group, Stack, Tabs, Title } from "@mantine/core";
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
import { useMenu } from "../../../backend/menu/menu.query";
import { RateupButtonBlue } from "../../../components/Button/RateupButtons";
import { TeamSelector } from "../../../components/input/TeamSelector";
import MenuSettings from "../../../components/menu/Settings/MenuSettings";
import ShareMenu from "../../../components/menu/Share/ShareMenu";

enum TabEnum {
  Menu = "Menu",
  Settings = "Settings",
  LandingPage = "LandingPage",
  Share = "Share",
}

export default ({ categories: initialCategories }) => {
  const [selectedTeamId, setSelectedTeamId] = useState("");
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
    data: menu,
  } = useMenu(menuId);

  const {
    isLoading,
    isError,
    data: categories,
  } = useCategories(menuId, initialCategories);
  let filteredCategory = categories;

  if (selectedTeamId !== "all") {
    filteredCategory = filteredCategory?.filter(
      (category) => category?.teamId === selectedTeamId,
    );
  }
  const teamId = menu && menu.teamId;

  useEffect(() => {
    if (
      tab &&
      tab !== activeTab &&
      Object.values(TabEnum).includes(tab as any)
    ) {
      setActiveTab(tab as TabEnum);
    }
  }, [tab]);

  if (!categories && (isLoading || isError)) {
    return <CenteredSpinner />;
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
    <Group grow mx={"md"}>
      <StyledTabs
        keepMounted={false}
        value={activeTab}
        onChange={setActiveTab as (tab: string) => void}
      >
        <Group justify="space-between" mb="md">
          {activeTab === TabEnum.Menu && (
            <Title order={3}>
              {menu?.name?.charAt(0)?.toUpperCase() + menu?.name?.slice(1)}
            </Title>
          )}
          <Tabs.List>
            <Tabs.Tab value={TabEnum.Menu}>Menu</Tabs.Tab>
            <Tabs.Tab value={TabEnum.Settings}>Settings</Tabs.Tab>
            <Tabs.Tab value={TabEnum.LandingPage}>Landing Page</Tabs.Tab>
            <Tabs.Tab value={TabEnum.Share}>Share</Tabs.Tab>
          </Tabs.List>
        </Group>
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
                visibility: activeTab === TabEnum.Menu ? "visible" : "hidden",
                // width: "50%",
              }}
            />
            <TeamSelector
              value={selectedTeamId}
              onChange={(teamId) => setSelectedTeamId(teamId)}
              enableAll={true}
              allowDeselect={false}
            />
          </Flex>
          <Stack mt="sm">
            {filteredCategory?.length === 0 ? (
              <>No Category data Avaliable</>
            ) : (
              filteredCategory?.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  handleDelete={deleteMutation.mutate}
                  handleEdit={handleEditCategory}
                  searchText={searchText}
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
        <Tabs.Panel value={TabEnum.LandingPage}>s</Tabs.Panel>
        <Tabs.Panel value={TabEnum.Share}>
          {menu && <ShareMenu menuId={menu.id} teamId={menu.teamId} />}
        </Tabs.Panel>
      </StyledTabs>
    </Group>
  );
};
