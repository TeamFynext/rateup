"use client";

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
import { IconPlus } from "@tabler/icons-react";

import {
  useChangePasswordMutation,
  useGetUserProfile,
  useUpdateProfileMutation,
  useUpdateProfilePhotoMutation,
} from "../../../backend/user/user.query";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../../../components/Button/RateupButtons";
import {
  ContainedPasswordInput,
  ContainedSelection,
  ContainedTextField,
} from "../../../components/input/ContainedInput/ContainedInput";
import { ImageCropModal } from "../../../components/Modal/ImageCropModal";
import { mergeNames, retrieveRole } from "../../../utils/essential";
import { uploadFile } from "../../../utils/file-upload/upload";
import { passwordValidation } from "../../../utils/validation";
import styles from "./setting.module.css";

import "react-phone-number-input/style.css";

import { useTranslations } from "next-intl";
import PhoneInputWithCountrySelect, {
  isValidPhoneNumber,
} from "react-phone-number-input";

import LocaleSwitcher from "@/components/translation/LocaleSwitcher";

import { SAVE_HOTKEY } from "../../../utils/constants";

const ProfileSettings = () => {
  const translations = useTranslations();
  const {
    isLoading: isprofileLoading,
    error: profileError,
    data: profileData,
  } = useGetUserProfile();

  const profileForm = useForm({
    initialValues: {
      title: "",
      firstname: "",
      lastname: "",
      phone: "",
      existingPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    validate: {
      title: isNotEmpty(translations("Select a title")),
      firstname: isNotEmpty(translations("Name Cannot be blank")),
      phone: (value) => {
        if (value && !isValidPhoneNumber(value))
          return translations("Invalid phone number");
        return null;
      },
      existingPassword: (value, values) =>
        isAnyPasswordFieldDirty(values) ? passwordValidation(value) : null,
      newPassword: (value, values) =>
        isAnyPasswordFieldDirty(values) ? passwordValidation(value) : null,
      confirmPassword: (value, values) => {
        if (value !== values.newPassword && isAnyPasswordFieldDirty(values)) {
          return translations(
            "New Password  and Confirm Password did not match",
          );
        }
        return null; // Validation passed
      },
    },
  });
  function isAnyPasswordFieldDirty(
    values: {
      existingPassword: string;
      newPassword: string;
      confirmPassword: string;
    } = { confirmPassword: "", existingPassword: "", newPassword: "" },
  ) {
    return (
      values.existingPassword !== "" ||
      values.newPassword !== "" ||
      values.confirmPassword != "" ||
      profileForm.isDirty("existingPassword") ||
      profileForm.isDirty("newPassword") ||
      profileForm.isDirty("confirmPassword")
    );
  }

  const [isLoading, setIsLoading] = useState(false);
  const updateProfile = useUpdateProfileMutation(setIsLoading);
  const changePassword = useChangePasswordMutation(setIsLoading);

  const onSubmit = (values) => {
    setIsLoading(true);
    const data = {
      title: values.title,
      name: mergeNames(values.firstname, values.lastname),
      phone: values.phone ?? "",
    };
    if (isAnyPasswordFieldDirty(values)) {
      const passwordData = {
        existingPassword: values.existingPassword,
        newPassword: values.newPassword,
      };
      changePassword.mutate(passwordData);
      profileForm.reset();
    }

    updateProfile.mutate(data);
  };

  const [avatarSrc, setAvatarSrc] = useState(
    `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/profile-photo.png`,
  );

  useEffect(() => {
    if (profileData?.data?.data) {
      const phone = profileData?.data?.data?.phone
        ? profileData?.data?.data?.phone
        : null;
      profileForm.setValues({
        title: profileData?.data?.data?.gender || "",
        firstname: profileData?.data?.data?.name?.split(" ")[0] || "",
        lastname: profileData?.data?.data?.name?.split(" ")[1] || "",
        phone: phone || "",
      });
    }

    const profilePhoto = profileData?.data?.data?.profilePhoto;

    if (profilePhoto && profilePhoto !== "REMOVED_PHOTO") {
      const imgUrl = `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${profilePhoto}`;
      setAvatarSrc(imgUrl);
    } else {
      setAvatarSrc(
        `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/profile-photo.png`,
      );
    }
  }, [profileData]);

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

  const updateProfilePhoto = useUpdateProfilePhotoMutation(setIsLoadingUpload);
  useEffect(() => {
    const uploadAndUpdate = async () => {
      if (file) {
        const fileKey = await uploadFile(file);
        const data = { profilePhoto: fileKey };
        if (typeof fileKey === "string") {
          updateProfilePhoto.mutate(data);

          notifications.show({
            id: "load-data",
            loading: true,
            title: translations("Uploading photo"),
            message: translations("Hold on, changing your profile photo"),
            autoClose: false,
            withCloseButton: false,
          });
        }
      }
    };
    uploadAndUpdate();
  }, [file]);

  function removePhoto() {
    const data = { profilePhoto: "REMOVED_PHOTO" };
    updateProfilePhoto.mutate(data);
  }
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
        aspect={1}
      />
      <Title order={2}>{translations("User Settings")}</Title>
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
          <Paper
            withBorder
            p={5}
            radius="50%"
            style={{ borderWidth: 3, objectFit: "cover" }}
          >
            <Avatar
              src={avatarSrc}
              alt={"Profile Picture"}
              radius="50%"
              size={200}
            />
          </Paper>
          <Group>
            <RateupButtonSecondary
              title={translations("Remove Image")}
              size="sm"
              variant="outline"
              color="var(--tertiary-color)"
              onClick={removePhoto}
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
                  color="var(--tertiary-color)"
                  onClick={removePhoto}
                  {...props}
                />
              )}
            </FileButton>
          </Group>
          <Stack align={"center"}>
            <Text size={"28px"} fw={500}>
              {profileData?.data?.data?.name || translations("User")}
            </Text>
            <Text> {retrieveRole(profileData?.data?.data?.role)}</Text>
            <Text size="sm">{profileData?.data?.data?.email}</Text>
          </Stack>
          <LocaleSwitcher />
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
            onSubmit={profileForm.onSubmit(onSubmit)}
            style={{ display: "flex", flexDirection: "column", gap: 30 }}
            onKeyDown={getHotkeyHandler([
              [
                SAVE_HOTKEY,
                (event: any) => profileForm.onSubmit(onSubmit)(event),
              ],
            ])}
          >
            <Grid columns={10} grow>
              <Grid.Col span={{ xs: 10, lg: 2 }}>
                <ContainedSelection
                  label={translations("Title")}
                  placeholder={translations("Select")}
                  data={[
                    { value: "MALE", label: "Mr" },
                    { value: "FEMALE", label: "Mrs" },
                    { value: "OTHER", label: "Mx" },
                  ]}
                  {...profileForm.getInputProps("title")}
                  withAsterisk
                />
              </Grid.Col>
              <Grid.Col span={{ xs: 10, md: 5, lg: 4 }}>
                <ContainedTextField
                  w={"100%"}
                  label={translations("First Name")}
                  placeholder={translations("Enter your full name")}
                  {...profileForm.getInputProps("firstname")}
                  withAsterisk
                />
              </Grid.Col>
              <Grid.Col span={{ xs: 10, md: 5, lg: 4 }}>
                <ContainedTextField
                  label={translations("Last Name")}
                  placeholder={translations("Enter your full name")}
                  {...profileForm.getInputProps("lastname")}
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
                  value={profileForm?.values?.phone || null}
                  {...profileForm?.getInputProps("phone")}
                  className={styles.inputPhone}
                />
                <Text size="sm" c={"red"}>
                  {profileForm?.errors?.phone}
                </Text>
              </Grid.Col>
              <Grid.Col span={{ xs: 10, lg: 6 }}>
                <ContainedTextField
                  disabled
                  label={translations("Email")}
                  placeholder={translations("Enter your email")}
                  value={profileData?.data?.data?.email ?? ""}
                  withAsterisk
                />
              </Grid.Col>
            </Grid>
            <Flex
              direction={"column"}
              gap="md"
              display={
                profileData?.data?.data?.passwordlessLogin ? "none" : "block"
              }
            >
              <Stack>
                <Title size="lg" fw={500} style={{ marginBottom: "1rem" }}>
                  {translations("Change Password")}
                </Title>
              </Stack>
              <Flex gap={"md"} wrap="wrap" direction={"column"}>
                <ContainedPasswordInput
                  required={isAnyPasswordFieldDirty()}
                  w={"100%"}
                  placeholder={translations("Enter existing password")}
                  {...profileForm.getInputProps("existingPassword")}
                />
                <ContainedPasswordInput
                  required={isAnyPasswordFieldDirty()}
                  placeholder={translations("Enter new password")}
                  {...profileForm.getInputProps("newPassword")}
                />
                <ContainedPasswordInput
                  required={isAnyPasswordFieldDirty()}
                  placeholder={translations("Enter new password again")}
                  {...profileForm.getInputProps("confirmPassword")}
                />
              </Flex>
            </Flex>
            <Flex justify="center" mb="xl">
              <RateupButtonBlue
                type="submit"
                loading={isLoading}
                size="sm"
                title={translations("Save Changes")}
              />
            </Flex>
          </form>
        </Flex>
      </Flex>
    </Flex>
  );
};

export default ProfileSettings;
