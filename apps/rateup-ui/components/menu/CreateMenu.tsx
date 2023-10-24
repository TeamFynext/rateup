import {
  useCreateMenuMutation,
  useUpdateMenuMutation,
} from "../../backend/menu/menu.query";
import { useContext, useEffect, useState } from "react";
import { Center, Group, SimpleGrid, Stack, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import SelectedTeamContext from "../../context/SelectedTeam";
import { getFileUrlFromKey, uploadFile } from "../../utils/file-upload/upload";
import { showErrorToast } from "../../utils/notifications";
import classes from "./CreateMenu.module.css";
import FormModalLayout from "../Modal/FormModalLayout";
import {
  ContainedFileInput,
  ContainedSelection,
  ContainedTextField,
} from "../input/ContainedInput/ContainedInput";
import PaperLayout from "../styled/Layouts/PaperLayout";
import { TeamSelector } from "../input/TeamSelector";
import { Image } from "@mantine/core";

export function CreateMenuModal({ opened, close, editingItem }) {
  const { selectedTeamId } = useContext(SelectedTeamContext);
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const createMenuMutation = useCreateMenuMutation(
    selectedTeamId,
    close,
    setIsCreating
  );
  const updateMenuMutation = useUpdateMenuMutation(
    selectedTeamId,
    () => {
      close();
      setIsCreating(false);
    },
    () => {
      setIsCreating(false);
    }
  );
  const [logo, setLogo] = useState<File | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<File | null>(null);

  useEffect(() => {
    if (!logo) return;

    setIsUploading(true);
    uploadFile(logo)
      .then((key) => {
        form.setFieldValue("logo", key);
        setIsUploading(false);
      })
      .catch((err) => {
        showErrorToast("Error uploading logo. Please try again.");
        console.error(err);
        setIsUploading(false);
      });
  }, [logo]);

  useEffect(() => {
    if (!backgroundImage) return;

    setIsUploading(true);
    uploadFile(backgroundImage)
      .then((key) => {
        form.setFieldValue("backgroundImage", key);
        setIsUploading(false);
      })
      .catch((err) => {
        showErrorToast("Error uploading background image. Please try again.");
        console.error(err);
        setIsUploading(false);
      });
  }, [backgroundImage]);

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
      teamId: "",
    },
    validate: {
      name: (value) => (value?.trim().length ? null : "Cannot be empty"),
      displayName: (value) => (value?.trim().length ? null : "Cannot be empty"),
      locationText: (value) =>
        value?.trim().length ? null : "Cannot be empty",
      teamId: (value) => (value?.trim().length ? null : "select a team"),
    },
  });

  useEffect(() => {
    if (editingItem) {
      form.setValues(editingItem);
    } else {
      form.reset();
    }
  }, [editingItem]);

  const onSubmit = (values) => {
    const validationRes = form.validate();
    if (validationRes.hasErrors) {
      console.error(validationRes.errors);
      return;
    }
    setIsCreating(true);
    if (editingItem) {
      updateMenuMutation.mutate({
        menuId: editingItem.id,
        updatedData: values,
      });
    } else {
      createMenuMutation.mutate(values);
    }
  };

  if (!selectedTeamId) {
    return null;
  }
  return (
    <FormModalLayout
      opened={opened}
      onClose={close}
      title={editingItem ? "Edit Menu" : "Create Menu"}
      centered
      onSubmit={form.onSubmit(onSubmit)}
      buttonTitle={editingItem ? "Edit Menu" : "Create Menu"}
    >
      <Title order={3}>General Info</Title>
      <Stack>
        <TeamSelector
          placeholder="Select Team"
          label=""
          allowDeselect={false}
          {...form.getInputProps("teamId")}
        />
        <ContainedTextField
          label="Menu Name"
          placeholder="Menu 1"
          withAsterisk
          {...form.getInputProps("name")}
        />
        <ContainedTextField
          label="Display Name"
          placeholder="Paragon Restaurant"
          withAsterisk
          {...form.getInputProps("displayName")}
        />
        <Group wrap="nowrap" className={classes.groupChildElements}>
          <ContainedTextField
            label="Location Label"
            withAsterisk
            placeholder="Kannur Rd, near CH Over bridge"
            {...form.getInputProps("locationText")}
          />
          <ContainedTextField
            label="Location URL"
            placeholder="https://goo.gl/maps/xyz1234"
            {...form.getInputProps("locationUrl")}
          />
        </Group>
        <Group wrap="nowrap" className={classes.groupChildElements}>
          <ContainedTextField
            label="Website Label"
            placeholder="paragonHotels.in"
            {...form.getInputProps("websiteText")}
          />
          <ContainedTextField
            label="Website URL"
            placeholder="https://paragonHotels.in"
            {...form.getInputProps("websiteUrl")}
          />
        </Group>
        <SimpleGrid cols={2} spacing="md" className={classes.simpleGridImg}>
          <ContainedFileInput
            label="Upload Logo"
            placeholder="Click here to upload"
            accept="image/*"
            multiple={false}
            error={form.errors.logo && form.errors.logo}
            onChange={setLogo}
          />
          <ContainedFileInput
            label="Upload background image"
            placeholder="Click here to upload"
            accept="image/*"
            multiple={false}
            error={form.errors.backgroundImage && form.errors.backgroundImage}
            onChange={setBackgroundImage}
          />
          <Center>
            <Image
              style={{
                maxHeight: "200px",
                maxWidth: "70%",
              }}
              src={
                form.values.logo
                  ? getFileUrlFromKey(form.values.logo)
                  : editingItem?.logo
                  ? getFileUrlFromKey(editingItem.logo)
                  : ""
              }
            />
          </Center>
          <Center>
            <Image
              width="75%"
              height="auto"
              src={
                form.values.backgroundImage
                  ? getFileUrlFromKey(form.values.backgroundImage)
                  : editingItem?.backgroundImage
                  ? getFileUrlFromKey(editingItem.backgroundImage)
                  : ""
              }
            />
          </Center>
        </SimpleGrid>
      </Stack>
    </FormModalLayout>
  );
}
