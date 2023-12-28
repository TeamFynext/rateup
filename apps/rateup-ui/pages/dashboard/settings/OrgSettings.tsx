import React, { useState, useEffect, useRef } from "react";
import {
  Title,
  Divider,
  Stack,
  Group,
  FileButton,
  Flex,
  Paper,
  Avatar,
  Grid,
  Text,
} from "@mantine/core";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../../../components/Button/RateupButtons";
import {
  useUpdateOrgDetailsMutation,
  useUpdateOrgLogoMutation,
} from "../../../backend/org/org.query";
import { uploadFile } from "../../../utils/file-upload/upload";
import { notifications } from "@mantine/notifications";
import { useUser } from "../../../context/UserContext";
import { ContainedTextField } from "../../../components/input/ContainedInput/ContainedInput";
import { useForm } from "@mantine/form";
import { IconPlus } from "@tabler/icons-react";
import { ImageCropModal } from "../../../components/Modal/ImageCropModal";
import { useDisclosure } from "@mantine/hooks";

const OrgSettings = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoadingUpload, setIsLoadingUpload] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState({
    url: "",
    name: "",
  });
  const resetRef = useRef(null);
  const [
    openedCropDialog,
    { toggle: toggleCropDialog, close: closeCropDialog },
  ] = useDisclosure(false);
  const { user } = useUser();
  const updateLogo = useUpdateOrgLogoMutation(setIsLoadingUpload);
  const orgForm = useForm({
    initialValues: {
      name: "",
      phone: "",
      address: "",
    },
    validate: {
      name: (value) => {
        if (value.length < 4) {
          return "Name should be at least 4 characters long";
        }
        return null; // Validation passed
      },
      phone: (value) => {
        const regex = /^[0-9]+$/;
        if (!regex.test(value)) {
          return "Only numbers allowed";
        }
        return null;
      },
    },
  });
  const orgDetailsUpdate = useUpdateOrgDetailsMutation(setIsLoading);
  const onSubmit = (values) => {
    setIsLoading(true);
    const data = {
      name: values.name,
      phone: values?.phone ?? "",
      address: values?.address ?? "",
    };
    orgDetailsUpdate.mutate(data);
  };
  useEffect(() => {
    const uploadAndUpdate = async () => {
      if (file) {
        const fileKey = await uploadFile(file);
        const data = { logo: fileKey };
        if (typeof fileKey === "string") {
          updateLogo.mutate(data);

          notifications.show({
            id: "load-data",
            loading: true,
            title: "Uploading Logo",
            message: `Hold on, changing your organization Logo`,
            autoClose: false,
            withCloseButton: false,
          });
        }
      }
    };
    uploadAndUpdate();
  }, [file]);

  const [avatarSrc, setAvatarSrc] = useState("");

  function removePhoto() {
    const data = { logo: "REMOVED_PHOTO" };
    updateLogo.mutate(data);
  }

  useEffect(() => {
    if (user.orgLogo && user.orgLogo !== "REMOVED_PHOTO") {
      const imgUrl = `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${user.orgLogo}`;
      setAvatarSrc(imgUrl);
    } else {
      setAvatarSrc("");
    }
    if (user) {
      orgForm.setValues({
        name: user?.orgName ?? "",
        phone: user?.orgPhone ?? "",
        address: user?.orgAddress ?? "",
      });
    }
  }, [user.orgLogo]);

  const handleImagePicker = (event) => {
    if (!event) return;
    toggleCropDialog();
    setSelectedImage({
      name: event.name,
      url: URL.createObjectURL(event),
    });
    resetRef?.current?.();
  };
  const handleCropImageSave = (cropedImage) => {
    setFile(cropedImage);
  };
  return (
    <Flex direction={"column"} h={"100%"}>
      <ImageCropModal
        opened={openedCropDialog}
        onclose={closeCropDialog}
        imageName={selectedImage.name}
        handleCropImageSave={handleCropImageSave}
        image={selectedImage.url}
        aspect={4 / 3}
      />
      <Title order={2}>Organization Settings</Title>
      <Flex direction={"row"} wrap="wrap" justify="space-around" h={"100%"}>
        <Flex
          direction={"column"}
          align="center"
          justify={"center"}
          gap="xl"
          style={{ flex: 0.3 }}
          p="lg"
          miw={"300px"}
        >
          <Paper withBorder p={5} radius="50%" style={{ borderWidth: 3 }}>
            <Avatar
              src={avatarSrc}
              alt={"Profile Picture"}
              radius="50%"
              size={200}
            />
          </Paper>
          <Group>
            <RateupButtonSecondary
              title="Remove Image"
              size="sm"
              variant="outline"
              onClick={removePhoto}
              color="var(--tertiary-color)"
            />
            <FileButton
              onChange={handleImagePicker}
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              resetRef={resetRef}
            >
              {(props) => (
                <RateupButtonBlue
                  title="Change Image"
                  size="sm"
                  onClick={removePhoto}
                  {...props}
                />
              )}
            </FileButton>
          </Group>
          <Stack align={"center"}>
            <Text size={"28px"} fw={500}>
              {user?.orgName ?? "Organization"}
            </Text>
            <Text> {user?.orgPhone ?? "Phone"}</Text>
            <Text size="sm">{user?.orgAddress ?? "Adress"}</Text>
          </Stack>
        </Flex>
        <Divider orientation={"vertical"} />
        <Flex
          direction={"column"}
          style={{ flex: 0.7 }}
          px="xl"
          gap={20}
          miw="300px"
        >
          <Text size="lg" fw={500}>
            Edit Info
          </Text>
          <form
            onSubmit={orgForm.onSubmit(onSubmit)}
            style={{ display: "flex", flexDirection: "column", gap: 30 }}
          >
            <Grid columns={10} grow>
              <Grid.Col span={{ xs: 10 }}>
                <ContainedTextField
                  w={"100%"}
                  label="Organization Name"
                  placeholder="Enter your organization name"
                  {...orgForm.getInputProps("name")}
                  withAsterisk
                />
              </Grid.Col>
              <Grid.Col span={{ xs: 10, lg: 4 }}>
                <ContainedTextField
                  withAsterisk
                  label="Phone with country code"
                  placeholder="Enter your organization phone number"
                  {...orgForm?.getInputProps("phone")}
                  leftSection={<IconPlus size={"1rem"} color="#373A40" />}
                  maxLength={15}
                />
              </Grid.Col>
              <Grid.Col span={{ xs: 10, lg: 6 }}>
                <ContainedTextField
                  withAsterisk
                  label="Address"
                  placeholder="eg. Kerala, Ernakulam, Kochi"
                  {...orgForm?.getInputProps("address")}
                />
              </Grid.Col>
            </Grid>
            <Flex justify="center">
              <RateupButtonBlue
                type="submit"
                loading={isLoading}
                size="sm"
                title="Save Changes"
              />
            </Flex>
          </form>
        </Flex>
      </Flex>
    </Flex>
  );
};
export default OrgSettings;
