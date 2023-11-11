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
import { getFileUrlFromKey, uploadFile } from "../../utils/file-upload/upload";
import { showErrorToast } from "../../utils/notifications";
import { MenuItemPriceType } from "../../types/enums";
import FormModalLayout from "../Modal/FormModalLayout";
import {
  ContainedTextArea,
  ContainedTextField,
} from "../input/ContainedInput/ContainedInput";

interface CreateMenuItemModalProps {
  opened: boolean;
  close: () => void;
  menuId: string;
  categoryId: string;
  editingItem?: MenuItem;
}

// If editingItem is passed, then we are editing an existing item
export function CreateMenuItemModal({
  opened,
  close,
  menuId,
  categoryId,
  editingItem,
}: CreateMenuItemModalProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [imageToUpload, setImageToUpload] = useState<File | null>(null);
  const fallbackImage = "/images/no_image_template.jpeg";
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
      price: {
        price: (value) => {
          if (form.values.price.type !== MenuItemPriceType.FIXED) return null;
          if (!value.length) return "Price can't be empty";
          if (isNaN(value)) return "Price must be a number";
          if (value <= 0) return "Price must not be negative";
          return null;
        },

        variants: {
          name: (value) => {
            if (form.values.price.type !== MenuItemPriceType.VARIANT)
              return null;
            if (!value.length) {
              showErrorToast("Name can't be empty");
              return " ";
            }
            return null;
          },
          price: (value) => {
            if (form.values.price.type !== MenuItemPriceType.VARIANT)
              return null;
            if (!value.length) return "Price can't be empty";
            if (isNaN(value)) return "Price must be a number";
            if (value <= 0) return "Price must not be negative";
            return null;
          },
        },
      },
    },
  });
  const [selectedImage, setSelectedImage] = useState(
    form.values.images[0] || "",
  );

  useEffect(() => {
    if (editingItem) {
      form.setValues(editingItem);
    } else {
      form.reset();
      setImageToUpload(null);
    }
  }, [editingItem]);

  const createMenuItemMutation = useCreateMenuItemMutation(
    categoryId,
    menuId,
    () => {
      close();
      setIsCreating(false);
      form.reset();
      setImageToUpload(null);
    },
    () => {
      setIsCreating(false);
    },
  );

  const updateMenuItemMutation = useUpdateMenuItemMutation(
    categoryId,
    menuId,
    () => {
      close();
      setIsCreating(false);
      form.reset();
    },
    () => {
      setIsCreating(false);
    },
  );

  useEffect(() => {
    const uploadAndUpdate = async () => {
      if (imageToUpload) {
        const fileKey = await uploadFile(imageToUpload);
        if (typeof fileKey === "string") {
          form.insertListItem("images", fileKey);
          setSelectedImage(fileKey);
        }
      }
    };
    uploadAndUpdate();
  }, [imageToUpload]);

  useEffect(() => {
    setSelectedImage(form.values.images[0] || "");
  }, [form.values.images]);

  const onSubmit = (values) => {
    const validationRes = form.validate();
    if (validationRes.hasErrors) {
      console.error(validationRes.errors);
      return;
    }

    setIsCreating(true);
    if (values.price.type === MenuItemPriceType.FIXED) {
      delete values.price.variants;
    } else {
      delete values.price.price;
    }
    if (editingItem) {
      updateMenuItemMutation.mutate({
        menuItemId: editingItem.id,
        menuItem: values,
      });
    } else {
      createMenuItemMutation.mutate(values);
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
        <Stack style={{ flex: 1 }}>
          <Group>
            <Text>Add Images (max 3)</Text>
            {form.values.images.length > 0 ? (
              <Box>
                <Image
                  src={getFileUrlFromKey(selectedImage)}
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
                      form.removeListItem(
                        "images",
                        form.values.images.findIndex(
                          (image) => image === selectedImage,
                        ),
                      );
                      setSelectedImage(form.values.images[0] || "");
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
            {form.values.images.map((image) => (
              <Image
                onClick={() => setSelectedImage(image)}
                style={{ borderRadius: "8px", cursor: "pointer" }}
                key={image}
                src={getFileUrlFromKey(image)}
                width={50}
                height={50}
                fallbackSrc={fallbackImage}
                alt="thumbnail image of menu item"
              />
            ))}
            {form.values.images.length < 3 && (
              <FileButton
                onChange={setImageToUpload}
                accept="image/png,image/jpeg"
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

function PriceSection({ form }: { form: any }) {
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
      {form.values.price.type === MenuItemPriceType.FIXED ? (
        <ContainedTextField
          placeholder="399"
          {...form.getInputProps("price.price")}
        />
      ) : (
        <Group>
          {form.values.price.variants.map((_variant, index) => {
            return (
              <Box
                w="80px"
                p={"xs"}
                key={_variant}
                style={{
                  border: "1px solid gray",
                  borderRadius: "15px",
                }}
              >
                <TextInput
                  placeholder="Small"
                  variant="unstyled"
                  sx={{
                    borderBottom: "1px solid gray",
                  }}
                  {...form.getInputProps(`price.variants.${index}.name`)}
                />
                <TextInput
                  placeholder="399"
                  radius={"100px"}
                  {...form.getInputProps(`price.variants.${index}.price`)}
                />
              </Box>
            );
          })}
          <SimpleGrid>
            {form.values.price.variants.length < 3 && (
              <ActionIcon
                variant="filled"
                size={"lg"}
                onClick={() => form.insertListItem("price.variants", {})}
              >
                <IconPlus size={16} />
              </ActionIcon>
            )}
            {form.values.price.variants.length > 1 && (
              <ActionIcon
                variant="filled"
                size={"lg"}
                onClick={() => {
                  const newVariants = form.values.price.variants.slice(0, -1);
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
