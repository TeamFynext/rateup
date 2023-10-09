import {
  Button,
  Container,
  Group,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
} from "@mantine/core";
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
import StyledTabs from "../../../components/styled/StyledTabs";
import ShareQR from "../../../components/Survey/ShareSurvey/ShareQR";
import { useSurveysByTeam } from "../../../backend/surveys/surveys.query";
import { useMenu } from "../../../backend/menu/menu.query";
import { CopyLinkComponent } from "../../../components/Survey/ShareSurvey/ShareSurvey";

enum TabEnum {
  Edit = "Edit",
  Share = "Share",
}
import { GetServerSidePropsContext } from "next";
import supertokensNode from "supertokens-node";
import { backendConfig } from "../../../config/backendConfig";
import { getMenuCategoriesByMenuIdWithCustomToken } from "../../../backend/menu/category/mCategory.api";
import { checkTokenExpiry } from "../../../utils/supertoken";

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
    tab == TabEnum.Share ? TabEnum.Share : TabEnum.Edit,
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
    <Container fluid>
      <StyledTabs
        keepMounted={false}
        value={activeTab}
        onChange={setActiveTab as (tab: string) => void}
      >
        <Group justify="space-between" mb="md">
          <Button
            leftSection={<IconPlus />}
            onClick={handleCreateCategory}
            variant="gradient"
            radius={"12px"}
            gradient={{ from: "#62CBE6", to: "#3F5BA9" }}
            style={{
              visibility: activeTab === TabEnum.Edit ? "visible" : "hidden",
            }}
          >
            Add Category
          </Button>
          <Tabs.List>
            <Tabs.Tab value={TabEnum.Edit}>Edit</Tabs.Tab>
            <Tabs.Tab value={TabEnum.Share}>Share</Tabs.Tab>
          </Tabs.List>
          <SearchBox
            searchText={searchText}
            setSearchText={setSearchText}
            sx={{
              visibility: activeTab === TabEnum.Edit ? "visible" : "hidden",
            }}
          />
        </Group>
        <Tabs.Panel value={TabEnum.Edit}>
          <Stack mt="sm">
            {categories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                handleDelete={deleteMutation.mutate}
                handleEdit={handleEditCategory}
              />
            ))}
          </Stack>
          <CreateMenuCategoryModal
            opened={openCreateModal}
            close={handleClose}
            menuId={menuId}
            editingItem={editingCategory}
          />
        </Tabs.Panel>
        <Tabs.Panel value={TabEnum.Share}>
          {menu && <ShareMenu teamId={menu.teamId} menuId={menu.id} />}
        </Tabs.Panel>
      </StyledTabs>
    </Container>
  );
};

function ShareMenu({ teamId, menuId }) {
  const [selectedSurveyId, setSelectedSurveyId] = useState("");
  const { data: surveys, isLoading, isError } = useSurveysByTeam(teamId, !!teamId);

  if (isLoading || isError || !surveys) {
    return null;
  }

  const shareLink = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/public/menu/${menuId}/feedback/${selectedSurveyId}`;
  return (
    <Stack>
      <Paper px="md" py="lg" radius="md" shadow="lg">
        <SimpleGrid
          cols={2}
          spacing="xl"
          // style={{
          //   '& .mantine-InputWrapper-label': {
          //     fontWeight: 600,
          //     fontSize: "1.1rem",
          //   }
          // }}
          //TODO VERIFY MANTINE
        >
          <Select
            label="Survey to share with"
            placeholder="Select survey"
            data={surveys.map((survey) => ({
              value: survey.id,
              label: survey.title,
            }))}
            value={selectedSurveyId}
            onChange={setSelectedSurveyId}
          />
          <CopyLinkComponent
            value={!selectedSurveyId ? `Select survey first` : shareLink}
            disabled={!selectedSurveyId}
            label="Share Link"
          />
        </SimpleGrid>
      </Paper>
      <ShareQR url={shareLink} />
    </Stack>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  try {
    supertokensNode.init(backendConfig());
    const { menuId } = context.params as { menuId: string };

    let accessToken =
      context.req.cookies["st-access-token"] ||
      context.req.cookies["sAccessToken"];
    if (!accessToken) {
      return { props: { categories: [] } };
    }

    const categories = await getMenuCategoriesByMenuIdWithCustomToken(
      accessToken,
      { menuId },
    );

    const tokenExpiryCheck = checkTokenExpiry([categories]);
    if (tokenExpiryCheck) {
      return tokenExpiryCheck;
    }

    return {
      props: {
        categories: categories,
      },
    };
  } catch (err) {
    console.error(err);
    return {
      props: {
        categories: [],
      },
    };
  }
}
