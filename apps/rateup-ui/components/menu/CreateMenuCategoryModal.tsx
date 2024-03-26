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
  getImageValue,
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
import {
  MAX_FILE_SIZE_IN_BYTE,
  MAX_FILE_SIZE_IN_MB,
  fallbackImage,
} from "../../utils/constants";
import { showErrorToast } from "../../utils/notifications";

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
  const resetRef = useRef<() => void>(null);
  const [
    openedCropDialog,
    { toggle: toggleCropDialog, close: closeCropDialog },
  ] = useDisclosure(false);

  const form = useForm({
    initialValues: editingItem ?? {
      name: "",
      menuId: menuId,
      image: "",
      scheduleEnabled: false,
      startTime: "",
      endTime: "",
    },
    validate: {
      name: (value) => (value.length ? null : "Cannot be empty"),
    },
  });

  useEffect(() => {
    if (editingItem) {
      const updatedEditingItem = {
        ...editingItem,
        startTime: formatToCustomTime(editingItem.startTime),
        endTime: formatToCustomTime(editingItem.endTime),
      };
      form.setValues(updatedEditingItem);
    } else {
      form.reset();
      setImageToUpload(null);
    }
    //if form add then infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const onSubmit = (values: typeof form.values) => {
    setIsCreating(true);
    let temp = "";
    const formatedData: any = values;
    const processSubmit = async () => {
      if (imageToUpload) {
        const fileKey = await uploadFile(imageToUpload);
        if (typeof fileKey === "string") {
          temp = fileKey;
        }
      }
      if (values?.scheduleEnabled) {
        formatedData.startTime =
          values.startTime && createCustomTimestamp(values.startTime);
        formatedData.endTime =
          values.endTime && createCustomTimestamp(values.endTime);
      } else {
        formatedData.startTime = undefined;
        formatedData.endTime = undefined;
        values.startTime = undefined;
        values.endTime = undefined;
      }

      if (editingItem) {
        if (editingItem?.image && editingItem?.image !== values?.image) {
          await deleteUploadedFiles({
            fileKeyArray: [{ Key: editingItem?.image }],
          });
        }
        formatedData.image = temp;
        editMenuCategoryMutation.mutate({
          categoryId: editingItem.id,
          menuCategory: formatedData,
        });
      } else {
        formatedData.image = temp;
        createMenuCategoryMutation.mutate(formatedData);
      }
      setIsCreating(false);
    };
    processSubmit();
  };

  if (!menuId) {
    return null;
  }
  const onChangePicture = (event: File | null) => {
    if (!event) return;
    if (event.size > MAX_FILE_SIZE_IN_BYTE) {
      showErrorToast(`Max file size is ${MAX_FILE_SIZE_IN_MB} MB`);
      return;
    }
    setSelectedImage({
      url: URL.createObjectURL(event),
      name: event.name,
    });
    toggleCropDialog();
    resetRef?.current?.();
  };
  const handleCropImageSave = (cropedImage: File) => {
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
                  src={getImageValue(form.values?.image)}
                  alt="image of menu category"
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
                    let buttonText = form.values.image
                      ? "Replace Image"
                      : "Add Image";
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
                Timed Menu
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
