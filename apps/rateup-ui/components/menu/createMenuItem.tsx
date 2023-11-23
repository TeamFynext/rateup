import { useEffect, useState } from "react";
import {
  ActionIcon,
  Box,
  Button,
  Center,
  FileButton,
  Flex,
  Group,
  Image,
  LoadingOverlay,
  Radio,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  useCreateMenuItemMutation,
  useUpdateMenuItemMutation,
} from "../../backend/menu/item/mItem.query";
import { IconMinus, IconPlus, IconTrash } from "@tabler/icons-react";
import {
  deleteUploadedFiles,
  getFileUrlFromKey,
  uploadFile,
} from "../../utils/file-upload/upload";
import { showErrorToast } from "../../utils/notifications";
import { MenuItemPriceType } from "../../types/enums";
import FormModalLayout from "../Modal/FormModalLayout";
import {
  ContainedTextArea,
  ContainedTextField,
} from "../input/ContainedInput/ContainedInput";

interface CreateMenuItemModalProps {
  readonly opened: boolean;
  readonly close: () => void;
  readonly menuId: string;
  readonly categoryId: string;
  readonly editingItem?: MenuItem;
}
// type PromiseFulfilledResult<T> = {
//   status: "fulfilled";
//   value: T;
// };
// If editingItem is passed, then we are editing an existing item
export function CreateMenuItemModal({
  opened,
  close,
  menuId,
  categoryId,
  editingItem,
}: CreateMenuItemModalProps) {
  const [imageLoading, setImageLoading] = useState(false);
  const [deleteImageArray, setDeleteImageArray] = useState([]);

  const fallbackImage = `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/no_image_template.jpeg`;
  const form = useForm({
    initialValues: editingItem || {
      name: "",
      categoryId: categoryId,
      images: [],
      videoUrl: "",
      description: "",
      price: {
        price: "",
        variants: [
          {
            name: "",
            price: "",
          },
        ],
        type: MenuItemPriceType.FIXED,
      },
    },
    validate: {
      name: (value) => (value.length ? null : "Cannot be empty"),
      description: (value) => (value.length ? null : "Cannot be empty"),
    },
  });
  const [selectedImage, setSelectedImage] = useState(
    form.values.images[0] || "",
  );

  useEffect(() => {
    if (editingItem) {
      form.setValues(editingItem);
      if (!editingItem.price?.variants) {
        form.setFieldValue("price.variants", []);
      }
    } else {
      form.reset();
    }
  }, [editingItem]);

  const createMenuItemMutation = useCreateMenuItemMutation(
    categoryId,
    menuId,
    () => {
      close();
      form.reset();
    },
    () => {},
  );

  const updateMenuItemMutation = useUpdateMenuItemMutation(
    categoryId,
    menuId,
    () => {
      close();
      form.reset();
    },
    () => {},
  );

  useEffect(() => {
    setSelectedImage(form?.values.images[0] || "");
  }, [form.values.images]);

  const onSubmit = async (values) => {
    try {
      const validationRes = form.validate();
      if (validationRes.hasErrors) {
        return;
      }

      if (values?.price?.type === MenuItemPriceType.FIXED) {
        delete values?.price?.variants;
      } else {
        delete values?.price?.price;
      }

      const imageArray = values?.images;
      let errors = [];
      if (editingItem) {
        const newImages = [];

        for (const image of imageArray) {
          setImageLoading(true);
          if (typeof image !== "string") {
            newImages.push(image);
          }
        }

        if (deleteImageArray?.length > 0) {
          await deleteUploadedFiles({ fileKeyArray: deleteImageArray });
          setDeleteImageArray([]);
        }
        if (newImages?.length > 0) {
          const imageResponse = newImages?.map((data) => uploadFile(data));
          const response = await Promise.allSettled(imageResponse);
          errors = response.filter(
            (r) => r.status === "rejected",
          ) as PromiseRejectedResult[];
          const successes = response
            .filter(
              (r): r is PromiseFulfilledResult<string> =>
                r.status === "fulfilled",
            )
            .map((r) => r?.value);
          let i = 0;
          for (const index in imageArray) {
            if (typeof imageArray[index] === "object") {
              imageArray[index] = successes[i];
              i++;
            }
          }
          values.images = imageArray;
        }
        updateMenuItemMutation.mutate({
          menuItemId: editingItem.id,
          menuItem: values,
        });
        setImageLoading(false);
      } else {
        setImageLoading(true);
        const imageResponse = imageArray?.map((data) => uploadFile(data));
        const response = await Promise.allSettled(imageResponse);
        errors = response?.filter(
          (r) => r.status === "rejected",
        ) as PromiseRejectedResult[];
        const successes = response
          .filter(
            (r): r is PromiseFulfilledResult<string> =>
              r.status === "fulfilled",
          )
          .map((r) => r?.value);

        values.images = successes;
        createMenuItemMutation.mutate(values);
        for (const imageUploadError of errors) {
          showErrorToast(imageUploadError.reason);
        }
        setImageLoading(false);
      }
      for (const imageUploadError of errors) {
        showErrorToast(imageUploadError.reason);
      }
    } catch (error) {
      setImageLoading(false);
    } finally {
      form.reset();
      close();
    }
  };

  if (!menuId) {
    return null;
  }
  const imageProps = {
    radius: "md",
    h: 200,
    w: 200,
    fallbackSrc: fallbackImage,
  };
  const onChangePicture = (event: File) => {
    form.setFieldValue("images", [...form.values.images, event]);
  };
  return (
    <FormModalLayout
      opened={opened}
      onClose={close}
      title={editingItem ? "Edit Item" : "Create Item"}
      centered
      onSubmit={form.onSubmit(onSubmit)}
      buttonTitle={editingItem ? "Save Item" : "Create Item"}
      size={"lg"}
    >
      <Flex>
        <LoadingOverlay
          visible={
            createMenuItemMutation.isPending ||
            updateMenuItemMutation.isPending ||
            imageLoading
          }
          zIndex={1000}
          overlayProps={{ radius: "sm", blur: 2 }}
          loaderProps={{ type: "bars" }}
        />
        <Stack style={{ flex: 1 }}>
          <Group>
            <Text>Add Images (max 3)</Text>
            {form?.values?.images?.length > 0 ? (
              <Box>
                <Image
                  src={
                    typeof selectedImage === "object"
                      ? URL.createObjectURL(selectedImage)
                      : getFileUrlFromKey(selectedImage)
                  }
                  {...imageProps}
                  alt="image of menu"
                />
                <Center mt="xs">
                  <Button
                    radius={"xs"}
                    variant="light"
                    color="red"
                    leftSection={<IconTrash />}
                    onClick={() => {
                      if (typeof selectedImage !== "object") {
                        setDeleteImageArray((prev) => [
                          ...prev,
                          {
                            Key: form?.values?.images?.find(
                              (image) => image === selectedImage,
                            ),
                          },
                        ]);
                      }
                      form.removeListItem(
                        "images",
                        form?.values?.images?.findIndex(
                          (image) => image === selectedImage,
                        ),
                      );
                    }}
                  >
                    Delete
                  </Button>
                </Center>
              </Box>
            ) : (
              <Image
                src={fallbackImage}
                {...imageProps}
                alt="placholder image of menu"
              />
            )}
          </Group>
          <Group>
            {form.values.images?.map((image) => (
              <Image
                onClick={() => setSelectedImage(image)}
                style={{ borderRadius: "8px", cursor: "pointer" }}
                key={typeof image === "object" ? image?.fileName : image}
                src={
                  typeof image === "object"
                    ? URL.createObjectURL(image)
                    : getFileUrlFromKey(image)
                }
                w={50}
                h={50}
                miw={50}
                fallbackSrc={fallbackImage}
                alt="thumbnail image of menu item"
              />
            ))}
            {form?.values?.images?.length < 3 && (
              <FileButton
                onChange={onChangePicture}
                accept="image/png,image/jpeg"
                key={form?.values?.images?.length}
              >
                {(props) => (
                  <Button color="gray" h={75} w={75} {...props}>
                    <IconPlus />
                  </Button>
                )}
              </FileButton>
            )}
          </Group>
        </Stack>
        <Stack style={{ flex: 1.5 }}>
          <Flex columnGap={30}>
            <ContainedTextField
              label="Name"
              placeholder="Name"
              withAsterisk
              {...form.getInputProps("name")}
            />
            <ContainedTextField
              label="Video Url"
              placeholder="Video Url"
              {...form.getInputProps("videoUrl")}
            />
          </Flex>
          <ContainedTextArea
            label="Description"
            placeholder="Description"
            withAsterisk
            autosize
            minRows={5}
            {...form.getInputProps("description")}
          />
          <PriceSection form={form} />
        </Stack>
      </Flex>
    </FormModalLayout>
  );
}

function PriceSection({ form }: { readonly form: any }) {
  return (
    <>
      <Group>
        <Text>Price</Text>
        <Radio.Group {...form.getInputProps("price.type")}>
          <Group>
            <Radio label="Fixed" value={MenuItemPriceType.FIXED} />
            <Radio label="Variant" value={MenuItemPriceType.VARIANT} />
          </Group>
        </Radio.Group>
      </Group>
      {form?.values?.price?.type === MenuItemPriceType.FIXED ? (
        <ContainedTextField
          placeholder="$ 399"
          {...form.getInputProps("price.price")}
        />
      ) : (
        <Group>
          {form?.values?.price?.variants?.map((_variant, index) => {
            return (
              <Box
                w="82px"
                p={"xs"}
                key={_variant}
                style={{
                  border: "1px solid gray",
                  borderRadius: "15px",
                }}
              >
                {form?.values?.price?.variant}
                <TextInput
                  placeholder="Small"
                  variant="unstyled"
                  sx={{
                    borderBottom: "1px solid gray",
                  }}
                  {...form.getInputProps(`price.variants.${index}.name`)}
                />
                <TextInput
                  placeholder="$ 399"
                  radius={"100px"}
                  {...form.getInputProps(`price.variants.${index}.price`)}
                />
              </Box>
            );
          })}
          <SimpleGrid>
            {form?.values?.price?.variants?.length < 3 && (
              <ActionIcon
                variant="filled"
                size={"lg"}
                onClick={() => form.insertListItem("price.variants", {})}
              >
                <IconPlus size={16} />
              </ActionIcon>
            )}
            {form?.values?.price?.variants?.length > 1 && (
              <ActionIcon
                variant="filled"
                size={"lg"}
                onClick={() => {
                  const newVariants = form?.values?.price?.variants?.slice(
                    0,
                    -1,
                  );
                  form.setFieldValue("price.variants", newVariants);
                }}
              >
                <IconMinus size={16} />
              </ActionIcon>
            )}
          </SimpleGrid>
        </Group>
      )}
    </>
  );
}
