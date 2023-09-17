import { useCreateMenuMutation, useUpdateMenuMutation } from "../../backend/menu/menu.query";
import { useContext, useEffect, useState } from "react";
import { Button, Center, FileInput, Group, Modal, SimpleGrid, Stack, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import SelectedTeamContext from "../../context/SelectedTeam";
import { getFileUrlFromKey, uploadFile } from "../../utils/file-upload/upload";
import { showErrorToast } from "../../utils/notifications";

export function CreateMenuModal({ opened, close, editingItem }) {
  const { selectedTeamId } = useContext(SelectedTeamContext)
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const createMenuMutation = useCreateMenuMutation(selectedTeamId, close, setIsCreating)
  const updateMenuMutation = useUpdateMenuMutation(
    selectedTeamId,
    () => {
      close();
      setIsCreating(false);
    },
    () => {
      setIsCreating(false);
    }
  )
  const [logo, setLogo] = useState<File | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<File | null>(null);

  useEffect(() => {
    if (!logo) return;

    setIsUploading(true)
    uploadFile(logo)
      .then((key) => {
        form.setFieldValue("logo", key);
        setIsUploading(false)
      })
      .catch((err) => {
        showErrorToast("Error uploading logo. Please try again.");
        console.error(err);
        setIsUploading(false)
      });
  }, [logo])

  useEffect(() => {
    if (!backgroundImage) return;

    setIsUploading(true)
    uploadFile(backgroundImage)
      .then((key) => {
        form.setFieldValue("backgroundImage", key);
        setIsUploading(false)
      })
      .catch((err) => {
        showErrorToast("Error uploading background image. Please try again.");
        console.error(err);
        setIsUploading(false)
      });
  }, [backgroundImage])

  const form = useForm({
    initialValues: editingItem || {
      name: "",
      displayName: "",
      locationUrl: "",
      locationText: "",
      websiteUrl: "",
      websiteText: "",
      logo: "",
      backgroundImage: "",
      teamId: selectedTeamId,
    },
    validate: {
      name: (value) => (value.length ? null : "Cannot be empty"),
      displayName: (value) => (value.length ? null : "Cannot be empty"),
    },
  });

  useEffect(() => {
    if (editingItem) {
      form.setValues(editingItem)
    } else {
      form.reset()
    }
  }, [editingItem])

  const onSubmit = (values) => {
    const validationRes = form.validate();
    if (validationRes.hasErrors) {
      console.error(validationRes.errors);
      return;
    }
    setIsCreating(true)

    if (editingItem) {
      updateMenuMutation.mutate({ menuId: editingItem.id, updatedData: values })
    } else {
      createMenuMutation.mutate(values)
    }
  };

  if (!selectedTeamId) {
    return null
  }

  return (
    <Modal
      opened={opened}
      onClose={() => {
        close()
      }}
      title={editingItem ? "Edit Menu" : "Create Menu"}
      centered
      size="auto"
    >
      <form onSubmit={form.onSubmit(onSubmit)}>
        <Stack>
          <TextInput
            label="Menu Name"
            placeholder="Only displayed in dashboard"
            withAsterisk
            {...form.getInputProps("name")}
          />
          <TextInput
            label="Display Name"
            placeholder="Paragon Restaurant"
            withAsterisk
            {...form.getInputProps("displayName")}
          />
          <Group
            noWrap
            sx={{
              "& > *": {
                flex: "1 1 50%",
              }
            }}
          >
            <TextInput
              label="Location Label"
              placeholder="Kannur Rd, near CH Over bridge"
              {...form.getInputProps("locationText")}
            />
            <TextInput
              label="Location URL"
              placeholder="https://goo.gl/maps/xyz1234"
              {...form.getInputProps("locationUrl")}
            />
          </Group>
          <Group
            noWrap
            sx={{
              "& > *": {
                flex: "1 1 50%",
              }
            }}
          >
            <TextInput
              label="Website Label"
              placeholder="paragonHotels.in"
              {...form.getInputProps("websiteText")}
            />
            <TextInput
              label="Website URL"
              placeholder="https://paragonHotels.in"
              {...form.getInputProps("websiteUrl")}
            />
          </Group>
          <SimpleGrid
            cols={2}
            spacing="md"
            sx={{
              "& img": {
                borderRadius: "4px"
              }
            }}
          >
            <FileInput
              label="Upload Logo"
              placeholder="Click here to upload logo"
              accept="image/*"
              multiple={false}
              error={form.errors.logo && form.errors.logo}
              onChange={setLogo}
            />
            <FileInput
              label="Upload background image"
              placeholder="Click here to upload background image"
              accept="image/*"
              multiple={false}
              error={form.errors.backgroundImage && form.errors.backgroundImage}
              onChange={setBackgroundImage}
            />
            <Center>
              <img
                style={{
                  maxHeight: "200px",
                  maxWidth: "70%"
                }}
                src={
                  form.values.logo ?
                    getFileUrlFromKey(form.values.logo)
                    : editingItem?.logo ?
                      getFileUrlFromKey(editingItem.logo)
                      : ""
                }
              />
            </Center>
            <Center>
              <img
                width="75%"
                height="auto"
                src={
                  form.values.backgroundImage ?
                    getFileUrlFromKey(form.values.backgroundImage)
                    : editingItem?.backgroundImage ?
                      getFileUrlFromKey(editingItem.backgroundImage) : ""
                }
              />
            </Center>
          </SimpleGrid>
          <Group position="right" pt="xl" mt="lg">
            <Button variant="subtle" onClick={close}>
              Cancel
            </Button>
            <Button variant="filled" type="submit" loading={isCreating || isUploading}>
              Submit
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}