import { useEffect, useRef, useState } from "react";
import {
  FileButton,
  LoadingOverlay,
  Stack,
  Image,
  SimpleGrid,
  Title,
  Switch,
  Group,
} from "@mantine/core";
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
import {
  ContainedTextField,
  ContainedTimeInput,
} from "../input/ContainedInput/ContainedInput";
import { RateupButtonSecondary } from "../Button/RateupButtons";
import { ImageCropModal } from "../Modal/ImageCropModal";
import { useDisclosure } from "@mantine/hooks";
import {
  createCustomTimestamp,
  formatToCustomTime,
} from "../../utils/dateTime";
import { fallbackImage } from "../../utils/constants";

interface CreateMenuCategoryModalProps {
  readonly opened: boolean;
  readonly close: () => void;
  readonly menuId: string;
  readonly editingItem?: MenuCategory;
}
export function CreateMenuCategoryModal({
  opened,
  close,
  menuId,
  editingItem,
}: CreateMenuCategoryModalProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [imageToUpload, setImageToUpload] = useState<File | null>(null);
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
      scheduleEnabled: false,
      startTime: "",
      endTime: "",
    },
    validate: {
      name: (value) => (value.length ? null : "Cannot be empty"),
      endTime: (value, values) => {
        const startTime = values.startTime;
        const scheduleEnabled = values.scheduleEnabled;
        return (
          scheduleEnabled &&
          (value?.length === 0 ||
            startTime?.length === 0 ||
            value < startTime) &&
          "End time cannot be before start time"
        );
      },
    },
  });

  let menuCategoryData;
  // updates form values when editingItem changes
  useEffect(() => {
    if (editingItem) {
      menuCategoryData = editingItem;
      menuCategoryData.startTime = formatToCustomTime(
        menuCategoryData.startTime,
      );
      menuCategoryData.endTime = formatToCustomTime(menuCategoryData.endTime);
      form.setValues(menuCategoryData);
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

  const onSubmit = (values) => {
    setIsCreating(true);
    let temp = "";
    const processSubmit = async () => {
      if (imageToUpload) {
        const fileKey = await uploadFile(imageToUpload);
        if (typeof fileKey === "string") {
          temp = fileKey;
        }
      }
      if (values?.scheduleEnabled) {
        values.startTime &&
          (values.startTime = createCustomTimestamp(values.startTime));
        values.endTime &&
          (values.endTime = createCustomTimestamp(values.endTime));
      } else {
        values.startTime = undefined;
        values.endTime = undefined;
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
    processSubmit();
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
      size="55rem"
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
        <SimpleGrid cols={{ base: 1, md: 2 }}>
          <Stack>
            <Title order={3} c={"var(--grey-color)"}>
              Category Details
            </Title>
            <ContainedTextField
              label="Name"
              placeholder="Name"
              withAsterisk
              {...form.getInputProps("name")}
            />
            <SimpleGrid cols={{ base: 1, md: 2 }}>
              {form.values.image && (
                <Image
                  w={186}
                  h={125}
                  mah={125}
                  fallbackSrc={fallbackImage}
                  src={
                    form.values?.image?.startsWith("blob")
                      ? form.values.image
                      : getFileUrlFromKey(form.values?.image)
                  }
                />
              )}
              <Stack justify="center">
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
            </SimpleGrid>
          </Stack>
          <Stack>
            <Group>
              <Title order={3} c={"var(--grey-color)"}>
                Schedule Category
              </Title>
              <Switch
                {...form.getInputProps("scheduleEnabled")}
                checked={form?.values?.scheduleEnabled}
              />
            </Group>
            <ContainedTimeInput
              label={"Start Time:"}
              disabled={!form?.values?.scheduleEnabled}
              {...form.getInputProps("startTime")}
            />
            <ContainedTimeInput
              label={"End Time:"}
              disabled={!form?.values?.scheduleEnabled}
              {...form.getInputProps("endTime")}
            />
          </Stack>
        </SimpleGrid>
      </Stack>
    </FormModalLayout>
  );
}
