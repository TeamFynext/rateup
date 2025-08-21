import React, { useEffect, useRef, useState } from "react";

import {
  Avatar,
  Divider,
  FileButton,
  Flex,
  Grid,
  Group,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";
import { getHotkeyHandler, useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";

import {
  useUpdateOrgDetailsMutation,
  useUpdateOrgLogoMutation,
} from "../../../backend/org/org.query";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../../../components/Button/RateupButtons";
import { ContainedTextField } from "../../../components/input/ContainedInput/ContainedInput";
import { ImageCropModal } from "../../../components/Modal/ImageCropModal";
import { useUser } from "../../../context/UserContext";
import { uploadFile } from "../../../utils/file-upload/upload";

import "react-phone-number-input/style.css";

import { useTranslations } from "next-intl";
import PhoneInputWithCountrySelect, {
  isValidPhoneNumber,
} from "react-phone-number-input";

import { UserRole } from "@/utils/enums";

import { SAVE_HOTKEY } from "../../../utils/constants";
import PermanentDelete from "./advanced/PermanentDelete";
import styles from "./setting.module.css";

const OrgSettings = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoadingUpload, setIsLoadingUpload] = useState(false);
  const [selectedImage, setSelectedImage] = useState({
    url: "",
    name: "",
  });
  const resetRef = useRef(null);
  const [
    openedCropDialog,
    { toggle: toggleCropDialog, close: closeCropDialog },
  ] = useDisclosure(false);
  const orgDetailsUpdate = useUpdateOrgDetailsMutation();
  const { user } = useUser();
  const updateLogo = useUpdateOrgLogoMutation(setIsLoadingUpload);
  const translations = useTranslations();
  const orgForm = useForm({
    initialValues: {
      name: "",
      phone: "",
      address: "",
    },
    validate: {
      name: isNotEmpty(translations("Name cannot be blank")),
      phone: (value) => {
        if (value && !isValidPhoneNumber(value))
          return translations("Invalid phone number");
        return null;
      },
    },
  });
  const onSubmit = (values) => {
    const data = {
      name: values.name,
      phone: values?.phone ?? "",
      address: values?.address ?? "",
    };
    notifications.show({
      id: "load-data",
      loading: true,
      title: translations("Updating Organization info"),
      message: translations("Hold on, Organization info is getting updated.."),
      autoClose: false,
      withCloseButton: false,
    });
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
            title: translations("Uploading Logo"),
            message: translations("Hold on, changing your organization Logo"),
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
      <Title order={2}>{translations("Organization Settings")}</Title>
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
          <Paper withBorder p={5} radius="5%" style={{ borderWidth: 3 }}>
            <Avatar
              src={avatarSrc}
              alt={"Profile Picture"}
              radius="5%"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </Paper>
          <Group>
            <RateupButtonSecondary
              title={translations("Remove Image")}
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
                  title={translations("Change Image")}
                  size="sm"
                  onClick={removePhoto}
                  {...props}
                />
              )}
            </FileButton>
          </Group>
          <Stack align={"center"}>
            <Text size={"28px"} fw={500}>
              {user?.orgName ?? translations("Organization")}
            </Text>
            <Text> {user?.orgPhone ?? translations("Phone")}</Text>
            <Text size="sm">{user?.orgAddress ?? translations("Address")}</Text>
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
            {translations("Edit Info")}
          </Text>
          <form
            onSubmit={orgForm.onSubmit(onSubmit)}
            style={{ display: "flex", flexDirection: "column", gap: 30 }}
            onKeyDown={getHotkeyHandler([
              [SAVE_HOTKEY, (event: any) => orgForm.onSubmit(onSubmit)(event)],
            ])}
          >
            <Grid columns={10} grow>
              <Grid.Col span={{ xs: 10 }}>
                <ContainedTextField
                  w={"100%"}
                  label={translations("Organization Name")}
                  placeholder={translations("Enter your organization name")}
                  {...orgForm.getInputProps("name")}
                  withAsterisk
                />
              </Grid.Col>
              <Grid.Col span={{ xs: 10, lg: 4 }}>
                <Text fz={12} c={"#495057"} mt={6}>
                  {translations("Phone Number")}
                </Text>
                <PhoneInputWithCountrySelect
                  defaultCountry="IN"
                  international
                  countryCallingCodeEditable={false}
                  placeholder={translations(
                    "Enter your organization phone number",
                  )}
                  value={orgForm?.values?.phone || null}
                  {...orgForm?.getInputProps("phone")}
                  className={styles.inputPhone}
                />
                <Text size="sm" c={"red"}>
                  {orgForm?.errors?.phone}
                </Text>
              </Grid.Col>
              <Grid.Col span={{ xs: 10, lg: 6 }}>
                <ContainedTextField
                  withAsterisk
                  label={translations("Address")}
                  placeholder={translations("eg. Kerala, Ernakulam, Kochi")}
                  {...orgForm?.getInputProps("address")}
                />
              </Grid.Col>
            </Grid>
            <Flex justify="center">
              <RateupButtonBlue
                type="submit"
                loading={orgDetailsUpdate.isPending}
                size="sm"
                title={translations("Save Changes")}
              />
            </Flex>
          </form>
          {user?.role === UserRole.SUPADM && (
            <PermanentDelete orgId={user?.orgId} />
          )}
        </Flex>
      </Flex>
    </Flex>
  );
};
export default OrgSettings;
