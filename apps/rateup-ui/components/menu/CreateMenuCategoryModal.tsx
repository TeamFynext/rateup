import { useEffect, useRef, useState } from "react";
import { FileButton, LoadingOverlay, Stack, Image } from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  useCreateMenuCategoryMutation,
  useUpdateMenuCategoryMutation,
} from "../../backend/menu/category/mCategory.query";
import {
  deleteUploadedFiles,
  getFileUrlFromKey,
  uploadFile,
} from "../../utils/file-upload/upload";
import FormModalLayout from "../Modal/FormModalLayout";
import { ContainedTextField } from "../input/ContainedInput/ContainedInput";
import { RateupButtonSecondary } from "../Button/RateupButtons";
import { ImageCropModal } from "../Modal/ImageCropModal";
import { useDisclosure } from "@mantine/hooks";

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
  const fallbackImage = `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/no_image_template.jpeg`;
  const [selectedImage, setSelectedImage] = useState({
    url: "",
    name: "",
  });
  const resetRef = useRef(null);
  const [
    openedCropDialog,
    { toggle: toggleCropDialog, close: closeCropDialog },
  ] = useDisclosure(false);

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
      setImageToUpload(null);
    }
  }, [editingItem]);

  const createMenuCategoryMutation = useCreateMenuCategoryMutation(
    menuId,
    () => {
      form.reset();
      close();
      setIsCreating(false);
      setImageToUpload(null);
    },
    () => {
      setIsCreating(false);
    },
  );

  const editMenuCategoryMutation = useUpdateMenuCategoryMutation(
    menuId,
    () => {
      form.reset();
      close();
      setIsCreating(false);
      setImageToUpload(null);
    },
    () => {
      setIsCreating(false);
    },
  );

  const onSubmit = async (values) => {
    const validationRes = form.validate();
    if (validationRes.hasErrors) {
      console.error(validationRes.errors);
      return;
    }
    setIsCreating(true);
    let temp = "";
    if (imageToUpload) {
      const fileKey = await uploadFile(imageToUpload);
      if (typeof fileKey === "string") {
        temp = fileKey;
      }
    }
    if (editingItem) {
      if (editingItem?.image && editingItem?.image !== values?.image) {
        await deleteUploadedFiles({
          fileKeyArray: [{ Key: editingItem?.image }],
        });
      }
      values.image = temp;
      editMenuCategoryMutation.mutate({
        categoryId: editingItem.id,
        menuCategory: values,
      });
    } else {
      values.image = temp;
      createMenuCategoryMutation.mutate(values);
    }
    setIsCreating(false);
  };

  if (!menuId) {
    return null;
  }
  const onChangePicture = (event: File) => {
    if (!event) return;
    setSelectedImage({
      url: URL.createObjectURL(event),
      name: event.name,
    });
    toggleCropDialog();
    resetRef?.current?.();
  };
  const handleCropImageSave = (cropedImage) => {
    form.setFieldValue("image", URL.createObjectURL(cropedImage));
    setImageToUpload(cropedImage);
  };
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
        <ImageCropModal
          opened={openedCropDialog}
          onclose={closeCropDialog}
          imageName={selectedImage.name}
          handleCropImageSave={handleCropImageSave}
          image={selectedImage.url}
          aspect={16 / 9}
        />
        <LoadingOverlay
          visible={
            createMenuCategoryMutation.isPending ||
            editMenuCategoryMutation.isPending ||
            isCreating
          }
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
            w={"200px"}
            h={200}
            mah={200}
            fallbackSrc={fallbackImage}
            src={
              form.values?.image?.startsWith("blob")
                ? form.values.image
                : getFileUrlFromKey(form.values?.image)
            }
          />
        )}
        <FileButton
          onChange={onChangePicture}
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          disabled={isCreating}
          resetRef={resetRef}
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
                loading={isCreating}
                disabled={isCreating}
              />
            );
          }}
        </FileButton>
      </Stack>
    </FormModalLayout>
  );
}
