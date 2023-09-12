import { Button, Container, Group, Stack, useMantineTheme } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useRouter } from "next/router";
import SearchBox from "../../../components/input/SearchBox";
import { useState } from "react";
import CenteredSpinner from "../../../components/Loaders/CenteredSpinner";
import { useCategories, useDeleteMenuCategoryMutation } from "../../../backend/menu/category/mCategory.query";
import { useDisclosure } from "@mantine/hooks";
import { CreateMenuCategoryModal } from "../../../components/menu/CreateMenuCategoryModal";
import { CategoryCard } from "../../../components/menu/category/CategoryCard";

export default () => {
  const router = useRouter();
  const { menuId } = router.query as { menuId: string };
  const [searchText, setSearchText] = useState("");
  const [openCreateModal, { close, open }] = useDisclosure(false);
  const deleteMutation = useDeleteMenuCategoryMutation(menuId, () => { }, () => { })
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const theme = useMantineTheme();

  const { isLoading, isError, data: categories } = useCategories(menuId);
  if (isLoading || isError) {
    return <CenteredSpinner />
  }

  function handleCreateCategory() {
    setEditingCategory(null);
    open()
  }

  function handleEditCategory(category: MenuCategory) {
    setEditingCategory(category);
    open()
  }

  function handleClose() {
    setEditingCategory(null);
    close();
  }

  return (
    <Container fluid>
      <Group position="apart">
        <Button
          leftIcon={<IconPlus />}
          onClick={handleCreateCategory}
          variant="gradient"
          radius={"12px"}
          gradient={{ from: '#62CBE6', to: '#3F5BA9' }}
        >
          Add Category
        </Button>
        <SearchBox
          searchText={searchText}
          setSearchText={setSearchText}
        />
      </Group>
      <Stack mt="sm">
        {categories.map((category) => (
          <CategoryCard key={category.id} category={category} handleDelete={deleteMutation.mutate} handleEdit={handleEditCategory} />
        ))}
      </Stack>
      <CreateMenuCategoryModal opened={openCreateModal} close={handleClose} menuId={menuId} editingItem={editingCategory} />
    </Container>
  )
}




