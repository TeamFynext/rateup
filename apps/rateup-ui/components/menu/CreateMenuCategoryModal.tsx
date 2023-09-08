import { useEffect, useState } from "react";
import { Button, FileButton, Group, Modal, Stack, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useCreateMenuCategoryMutation, useUpdateMenuCategoryMutation } from "../../backend/menu/category/mCategory.query";
import { getFileUrlFromKey, uploadFile } from "../../utils/file-upload/upload";
import { showErrorToast, showSuccessToast } from "../../utils/notifications";
import { IconPlus } from "@tabler/icons-react";

interface CreateMenuCategoryModalProps {
  opened: boolean,
  close: () => void,
  menuId: string,
  editingItem?: MenuCategory
}
export function CreateMenuCategoryModal({ opened, close, menuId, editingItem }: CreateMenuCategoryModalProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [imageToUpload, setImageToUpload] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm({
    initialValues: editingItem || {
      name: "",
      menuId: menuId,
      image: ""
    },
    validate: {
      name: (value) => (value.length ? null : "Cannot be empty"),
    },
  });

  useEffect(() => {
    if (editingItem) {
      form.setValues(editingItem)
    } else {
      form.reset()
    }
  }, [editingItem])

  useEffect(() => {
    if (!imageToUpload) return
    setIsUploading(true)
    const uploadAndUpdate = async () => {
      if (imageToUpload) {
        const fileKey = await uploadFile(imageToUpload);
        if (typeof fileKey === "string") {
          form.setFieldValue("image", fileKey)
          setIsUploading(false)
        }
      }
    };
    uploadAndUpdate();
  }, [imageToUpload]);

  const createMenuCategoryMutation = useCreateMenuCategoryMutation(
    menuId,
    () => {
      form.reset();
      close();
      setIsCreating(false);
    },
    () => {
      setIsCreating(false);
    }
  )

  const editMenuCategoryMutation = useUpdateMenuCategoryMutation(
    menuId,
    () => {
      form.reset();
      close();
      setIsCreating(false);
    },
    () => {
      setIsCreating(false);
    }
  )


  const onSubmit = (values) => {
    const validationRes = form.validate();
    if (validationRes.hasErrors) {
      console.error(validationRes.errors);
      return;
    }
    if (!values.image) {
      showErrorToast("Please add an image")
      return;
    }
    setIsCreating(true)
    if (editingItem) {
      editMenuCategoryMutation.mutate({ categoryId: editingItem.id, menuCategory: values })
    } else {
      createMenuCategoryMutation.mutate(values)
    }
  };

  if (!menuId) {
    return null
  }

  return (
    <Modal
      opened={opened}
      onClose={() => {
        close()
      }}
      title={editingItem ? "Edit Category" : "Create Category"}
      centered
    >
      <form onSubmit={form.onSubmit(onSubmit)}>
        <Stack>
          <TextInput
            label="Name"
            placeholder="Name"
            withAsterisk
            {...form.getInputProps("name")}
          />
          <img
            width={"200px"}
            src={form.values.image ? getFileUrlFromKey(form.values.image) : ""}
          />
          <FileButton
            onChange={setImageToUpload}
            accept="image/png,image/jpeg"
            disabled={isUploading}
          >
            {(props) => (

              <Button
                {...props}
                disabled={isUploading}
              >
                {
                  isUploading ? "Uploading..." : (
                    form.values.image ? "Replace Image" : "Add Image"
                  )}
              </Button>
            )}
          </FileButton>
          <Group position="right" pt="xl" mt="lg">
            <Button variant="subtle" onClick={close}>
              Cancel
            </Button>
            <Button variant="filled" type="submit" loading={isCreating} disabled={isUploading}>
              Submit
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}