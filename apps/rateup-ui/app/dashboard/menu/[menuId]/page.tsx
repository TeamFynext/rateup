"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import {
  IconFileImport,
  IconLayersSubtract,
  IconPlus,
} from "@tabler/icons-react";
import { useExtracted } from "next-intl";

import {
  useCategories,
  useDeleteMenuCategoryMutation,
} from "@/backend/menu/category/mCategory.query";
import { useMenuLandingById } from "@/backend/menu/LandingPage/landingpage.query";
import RateupLoader from "@/components/Loaders/RateupLoader";
import MenuAnalytics from "@/components/menu/analytics/MenuAnalytics";
import { CategoryCard } from "@/components/menu/category/CategoryCard";
import CategoryItemCsvModal from "@/components/menu/category/CategoryItemCsvModal";
import { CreateMenuCategoryModal } from "@/components/menu/CreateMenuCategoryModal";
import GeneralSettings from "@/components/menu/Settings/GeneralSettings";
import ShareMenu from "@/components/menu/Share/ShareMenu";
import BannerAddAndViewModal from "@/components/Modal/BannerAddAndViewModal";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouteParams } from "@/context/RouteParamsContext";

enum TabEnum {
  Menu = "Menu",
  Settings = "Settings",
  Share = "Share",
  Analytics = "Analytics",
}

export default function MenuById() {
  const router = useRouter();
  const params = useParams();
  const menuId = params?.menuId as string;

  const { update } = useRouteParams();
  const translations = useExtracted();
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openUploadCsv, setOpenUploadCsv] = useState(false);
  const [openBanner, setOpenBanner] = useState(false);
  const deleteMutation = useDeleteMenuCategoryMutation(
    menuId,
    () => {},
    () => {},
  );
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(
    null,
  );
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as TabEnum) || TabEnum.Menu;

  const activeTab = tab?.toString() as TabEnum;

  const { isLoading: isLoadingMenu, data: menuLandingData } =
    useMenuLandingById(menuId);

  const {
    isLoading,
    isError,
    data: categories,
  } = useCategories(menuId, undefined);
  const filteredCategory = categories;

  useEffect(() => {
    update({ menuId: menuLandingData?.menu?.name });
  }, [menuLandingData?.menu?.name, update]);

  if ((!categories && (isLoading || isError)) || isLoadingMenu) {
    return <RateupLoader />;
  }
  const menu: any = {
    ...menuLandingData?.menu,
    surveyTeamMapId: menuLandingData?.surveyTeamMapId,
  };

  function handleCreateCategory() {
    setEditingCategory(null);
    setOpenCreateModal(true);
  }

  function handleEditCategory(category: MenuCategory) {
    setEditingCategory(category);
    setOpenCreateModal(true);
  }

  function handleClose() {
    setEditingCategory(null);
    setOpenCreateModal(false);
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => {
        router.push(`${menuId}?tab=${value}`);
      }}
    >
      <TabsList>
        <TabsTrigger value={TabEnum.Menu}>{translations("Menu")}</TabsTrigger>
        <TabsTrigger value={TabEnum.Settings}>
          {translations("Settings")}
        </TabsTrigger>
        <TabsTrigger value={TabEnum.Share}>{translations("Share")}</TabsTrigger>
        <TabsTrigger value={TabEnum.Analytics}>
          {translations("Analytics")}
        </TabsTrigger>
      </TabsList>

      <TabsContent value={TabEnum.Menu}>
        <div className="flex h-full flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handleCreateCategory}>
                <IconPlus data-icon="inline-end" />
                {translations("Add Category")}
              </Button>
              <Button
                variant="outline"
                onClick={() => setOpenUploadCsv((prev) => !prev)}
              >
                <IconFileImport data-icon="inline-end" />
                {translations("Import Menu")}
              </Button>
            </div>

            <Button
              variant="secondary"
              onClick={() => setOpenBanner((prev) => !prev)}
            >
              <IconLayersSubtract data-icon="inline-end" />
              {translations("Manage Banners")}
            </Button>
            <BannerAddAndViewModal
              menuId={menuId}
              opened={openBanner}
              onCloseAction={() => setOpenBanner(false)}
              currency={menu?.currency}
            />
          </div>
          <div className="h-full max-h-200 flex-1 overflow-auto p-1">
            {filteredCategory?.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <IconLayersSubtract />
                  </EmptyMedia>
                  <EmptyTitle>
                    {translations("No Category available.")}
                  </EmptyTitle>
                  <EmptyDescription>
                    {translations("Add a category to get started.")}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              filteredCategory?.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  handleDelete={deleteMutation}
                  handleEdit={handleEditCategory}
                  searchText=""
                  currency={menu?.currency}
                  headerOrder={filteredCategory?.map(({ id, name, image }) => ({
                    id,
                    name,
                    image,
                  }))}
                />
              ))
            )}
          </div>
          <CategoryItemCsvModal
            opened={openUploadCsv}
            close={() => setOpenUploadCsv(false)}
            menuId={menuId}
          />
          <CreateMenuCategoryModal
            opened={openCreateModal}
            close={handleClose}
            menuId={menuId}
            editingItem={editingCategory}
          />
        </div>
      </TabsContent>
      <TabsContent value={TabEnum.Settings}>
        <GeneralSettings editingItem={menuLandingData} />
      </TabsContent>
      <TabsContent value={TabEnum.Share}>
        {menu && <ShareMenu menu={menu} />}
      </TabsContent>
      <TabsContent value={TabEnum.Analytics}>
        <MenuAnalytics
          surveyTeamMapId={menuLandingData?.surveyTeamMapId}
          visited={menuLandingData?.visited}
          surveyId={menuLandingData?.surveyTeamMap?.surveyId}
          subscription={menuLandingData?.subscription}
        />
      </TabsContent>
    </Tabs>
  );
}
