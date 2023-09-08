import { useCreateMenuMutation, useUpdateMenuMutation } from "../../backend/menu/menu.query";
import { useContext, useEffect, useState } from "react";
import { Button, FileInput, Group, Modal, Stack, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import SelectedTeamContext from "../../context/SelectedTeam";
import { getFileNameFromKey, uploadFile } from "../../utils/file-upload/upload";
import { showErrorToast } from "../../utils/notifications";

export function CreateMenuModal({ opened, close, editingItem }) {
  const { selectedTeamId } = useContext(SelectedTeamContext)
  const [isCreating, setIsCreating] = useState(false);
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
  const [imageToUpload, setImageToUpload] = useState<File | null>(null);

  useEffect(() => {
    if (!imageToUpload) return;
    uploadFile(imageToUpload)
      .then((key) => {
        form.setFieldValue("logo", key);
      })
      .catch((err) => {
        showErrorToast("Error uploading image. Please try again.");
        console.error(err);
      });
  }, [imageToUpload])

  const form = useForm({
    initialValues: editingItem || {
      name: "",
      displayName: "",
      locationUrl: "",
      locationText: "",
      websiteUrl: "",
      websiteText: "",
      logo: "",
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
          <FileInput
            label="Upload Logo"
            placeholder="Click here to upload logo"
            accept="image/*"
            multiple={false}
            error={form.errors.logo && form.errors.logo}
            onChange={setImageToUpload}
          />
          <Text>
            {`Current Logo: ${form.values.logo ? getFileNameFromKey(form.values.logo) : "None"}`}
          </Text>
          <Group noWrap>
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
          <Group noWrap>
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
          <Group position="right" pt="xl" mt="lg">
            <Button variant="subtle" onClick={close}>
              Cancel
            </Button>
            <Button variant="filled" type="submit" loading={isCreating}>
              Submit
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}