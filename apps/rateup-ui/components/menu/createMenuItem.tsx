import { useEffect, useState } from "react";
import { ActionIcon, Box, Button, Center, FileButton, Flex, Group, Modal, Radio, Stack, Text, TextInput, Textarea, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useCreateMenuItemMutation, useUpdateMenuItemMutation } from "../../backend/menu/item/mItem.query";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { getFileUrlFromKey, uploadFile } from "../../utils/file-upload/upload";
import { showErrorToast, showSuccessToast } from "../../utils/notifications";
import { MenuItemPriceType } from "../../types/enums";

interface CreateMenuItemModalProps {
  opened: boolean,
  close: () => void,
  menuId: string,
  categoryId: string,
  editingItem?: MenuItem
}

// If editingItem is passed, then we are editing an existing item
export function CreateMenuItemModal({ opened, close, menuId, categoryId, editingItem }: CreateMenuItemModalProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [imageToUpload, setImageToUpload] = useState<File | null>(null);

  const form = useForm({
    initialValues: editingItem || {
      name: "",
      categoryId: categoryId,
      images: [],
      videoUrl: "",
      description: "",
      price: {
        price: "",
        variants: [{
          name: "",
          price: ""
        }],
        type: MenuItemPriceType.FIXED
      },
    },
    // TODO: display validation errors of price and image near the input.
    validate: {
      name: (value) => (value.length ? null : "Cannot be empty"),
      description: (value) => (value.length ? null : "Cannot be empty"),
      price: (value) => {
        if (value.type === MenuItemPriceType.FIXED) {
          if (value.price < 0) {
            showErrorToast("Price must not be negative");
            return "Price must not be negative"
          }
        } else {
          if (!value.variants.every(v => v.name && v.price && v.price >= 0)) {
            showErrorToast("Please fill in all variant names and prices")
            return "Please fill in all variant names and prices"
          }
        }
      },
    },
  });
  const [selectedImage, setSelectedImage] = useState(form.values.images[0] || "");

  useEffect(() => {
    if (editingItem) {
      form.setValues(editingItem)
    } else {
      form.reset()
      setImageToUpload(null)
    }
  }, [editingItem])

  const createMenuItemMutation = useCreateMenuItemMutation(
    categoryId,
    menuId,
    () => {
      close();
      setIsCreating(false);
      form.reset();
      setImageToUpload(null)
    },
    () => {
      setIsCreating(false);
    }
  )

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
    }
  )

  useEffect(() => {
    const uploadAndUpdate = async () => {
      if (imageToUpload) {
        const fileKey = await uploadFile(imageToUpload);
        if (typeof fileKey === "string") {
          form.insertListItem("images", fileKey)
          setSelectedImage(fileKey)
        }
      }
    };
    uploadAndUpdate();
  }, [imageToUpload]);

  useEffect(() => {
    setSelectedImage(form.values.images[0] || "")
  }, [form.values.images])

  const onSubmit = (values) => {
    const validationRes = form.validate();
    if (validationRes.hasErrors) {
      console.error(validationRes.errors);
      return;
    }

    setIsCreating(true)
    if (values.price.type === MenuItemPriceType.FIXED) {
      delete values.price.variants
    } else {
      delete values.price.price
    }
    if (editingItem) {
      updateMenuItemMutation.mutate({ menuItemId: editingItem.id, menuItem: values })
    } else {
      createMenuItemMutation.mutate(values)
    }
  };

  if (!menuId) {
    return null
  }

  return (
    <Modal
      size={"xl"}
      opened={opened}
      onClose={() => {
        close()
      }}
      title={editingItem ? "Edit Item" : "Create Item"}
      centered
    >
      <form onSubmit={form.onSubmit(onSubmit)}>
        <Flex gap="lg" align={"stretch"}>
          <Stack style={{ flex: 1 }}>
            <Text>
              Add Images (max 3)
            </Text>
            {form.values.images.length > 0 &&
              <Box w="100%">
                <img src={getFileUrlFromKey(selectedImage)} width={"100%"} style={{ borderRadius: "8px", aspectRatio: "1 / 1" }} />
                <Center mt="xs">
                  <Button
                    radius={"xs"}
                    variant="light"
                    color="red"
                    leftSection={<IconTrash />}
                    onClick={() => {
                      // TODO: implement DELETE when s3 delete is implemented
                      form.removeListItem("images", form.values.images.findIndex((image) => image === selectedImage))
                      setSelectedImage(form.values.images[0] || "")
                    }}
                  >Delete</Button>
                </Center>
              </Box>
            }
            <Group>
              {form.values.images.map((image, index) => (
                <img onClick={() => setSelectedImage(image)} style={{ borderRadius: "8px", cursor: "pointer" }} key={index} src={getFileUrlFromKey(image)} width={75} height={75} />
              ))}
              {form.values.images.length < 3 &&
                <FileButton onChange={setImageToUpload} accept="image/png,image/jpeg">
                  {(props) => (

                    <Button
                      color="gray"
                      h={75} w={75}
                      {...props}
                    >
                      <IconPlus />
                    </Button>
                  )}
                </FileButton>
              }
            </Group>
          </Stack>
          <Stack style={{ flex: 1 }}>
            <TextInput
              label="Name"
              placeholder="Name"
              withAsterisk
              {...form.getInputProps("name")}
            />
            <Textarea
              label="Description"
              placeholder="Description"
              withAsterisk
              {...form.getInputProps("description")}
            />
            <TextInput
              label="Video Url"
              placeholder="Video Url"
              {...form.getInputProps("videoUrl")}
            />
            <PriceSection form={form} />
            <Group justify="flex-end" pt="xl" mt="lg">
              <Button variant="subtle" onClick={close}>
                Cancel
              </Button>
              <Button variant="filled" type="submit" loading={isCreating}>
                Submit
              </Button>
            </Group>
          </Stack>
        </Flex>
      </form>
    </Modal>
  )
}

function PriceSection({ form }: { form: any }) {
  return (
    <>
      <Group>
        <Text>
          Price
        </Text>
        <Radio.Group
          {...form.getInputProps("price.type")}
        >
          <Group>
            <Radio
              label="Fixed"
              value={MenuItemPriceType.FIXED}
            />
            <Radio
              label="Variant"
              value={MenuItemPriceType.VARIANT}
            />
          </Group>
        </Radio.Group>
      </Group>
      {form.values.price.type === MenuItemPriceType.FIXED ? (
        <TextInput
          placeholder="399"
          {...form.getInputProps("price.price")}
        />
      ) : (
        <Group>
          {form.values.price.variants.map((_variant, index) => {
            return (
              <Box
                w="100px"
                p={"xs"}
                style={{
                  border: "1px solid gray",
                  borderRadius: "8px",
                  aspectRatio: "1 / 1",
                }}>
                <TextInput
                  placeholder="Small"
                  variant="unstyled"
                  mb="xs"
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
            )
          })}
          {
            form.values.price.variants.length < 3 &&
            (
              <ActionIcon variant="filled" size={"xl"} onClick={() => form.insertListItem("price.variants", {})}>
                <IconPlus />
              </ActionIcon>
            )}
        </Group>
      )}

    </>
  )
}