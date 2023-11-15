import { useEffect, useState } from "react";
import {
  FileButton,
  LoadingOverlay,
  Stack,
  Image
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  useCreateMenuCategoryMutation,
  useUpdateMenuCategoryMutation,
} from "../../backend/menu/category/mCategory.query";
import { getFileUrlFromKey, uploadFile } from "../../utils/file-upload/upload";
import FormModalLayout from "../Modal/FormModalLayout";
import { ContainedTextField } from "../input/ContainedInput/ContainedInput";
import {
  RateupButtonSecondary,
} from "../Button/RateupButtons";

interface CreateMenuCategoryModalProps {
  opened: boolean;
  close: () => void;
  menuId: string;
  editingItem?: MenuCategory;
}
export function CreateMenuCategoryModal({
  opened,
  close,
  menuId,
  editingItem,
}: CreateMenuCategoryModalProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [imageToUpload, setImageToUpload] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fallbackImage = "/images/no_image_template.jpeg";

  const form = useForm({
    initialValues: editingItem || {
      name: "",
      menuId: menuId,
      image: "",
    },
    validate: {
      name: (value) => (value.length ? null : "Cannot be empty"),
    },
  });

  // updates form values when editingItem changes
  useEffect(() => {
    if (editingItem) {
      form.setValues(editingItem);
    } else {
      form.reset();
    }
  }, [editingItem]);

  // upload image when imageToUpload changes
  useEffect(() => {
    if (!imageToUpload) return;
    setIsUploading(true);
    const uploadAndUpdate = async () => {
      if (imageToUpload) {
        const fileKey = await uploadFile(imageToUpload);
        if (typeof fileKey === "string") {
          form.setFieldValue("image", fileKey);
          setIsUploading(false);
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
  );

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
  );

  const onSubmit = (values) => {
    const validationRes = form.validate();
    if (validationRes.hasErrors) {
      console.error(validationRes.errors);
      return;
    }
    setIsCreating(true);
    if (editingItem) {
      editMenuCategoryMutation.mutate({
        categoryId: editingItem.id,
        menuCategory: values,
      });
    } else {
      createMenuCategoryMutation.mutate(values);
    }
  };

  if (!menuId) {
    return null;
  }

  return (
    <FormModalLayout
      opened={opened}
      onClose={close}
      title={editingItem ? "Edit Category" : "Create Category"}
      centered
      onSubmit={form.onSubmit(onSubmit)}
      buttonTitle={editingItem ? "Save Category" : "Create Category"}
    >
      <Stack>
        <LoadingOverlay
          visible={createMenuCategoryMutation.isPending || editMenuCategoryMutation.isPending}
          zIndex={1000}
          overlayProps={{ radius: "sm", blur: 2 }}
          loaderProps={{ type: "bars" }}
        />
        <ContainedTextField
          label="Name"
          placeholder="Name"
          withAsterisk
          {...form.getInputProps("name")}
        />
        {form.values.image && (
          <Image
            width={"200px"}
            height={100}
            fallbackSrc={fallbackImage}
            src={form.values.image ? getFileUrlFromKey(form.values.image) : ""}
          />
        )}
        <FileButton
          onChange={setImageToUpload}
          accept="image/png,image/jpeg"
          disabled={isUploading}
        >
          {(props) => {
            let buttonText = "";
            if (form.values.image) {
              buttonText = "Replace Image";
            } else {
              buttonText = "Add Image";
            }
            return (
              <RateupButtonSecondary
                title={buttonText}
                {...props}
                loading={isUploading}
                disabled={isUploading}
              />
            );
          }}
        </FileButton>
      </Stack>
    </FormModalLayout>
  );
}
