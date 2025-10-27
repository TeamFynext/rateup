"use client";

import React, { useEffect, useRef, useState } from "react";

import {
  Avatar,
  Box,
  Button,
  Divider,
  FileButton,
  Flex,
  Grid,
  Group,
  Modal,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";
import { getHotkeyHandler, useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconEdit, IconPlus, IconTrash } from "@tabler/icons-react";

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
  const [isPassLoading, setIsPassLoading] = useState(false);

  const passwordForm = useForm({
    initialValues: {
      existingPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    validate: {
      existingPassword: isNotEmpty("Enter your existing password"),
      newPassword: (value) => {
        if (!value) return "Enter your new password";

        const passwordRegex =
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

        if (!passwordRegex.test(value)) {
          return "Password must be at least 8 characters long, include 1 uppercase, 1 lowercase, 1 number, and 1 special character.";
        }
        return null;
      },
      confirmPassword: (value, values) => {
        if (!value) return "Please confirm your new password";
        if (value !== values.newPassword) return "Passwords do not match";
        return null;
      },
    },
  });

  const profileForm = useForm({
    initialValues: {
      title: "",
      firstname: "",
      lastname: "",
      phone: "",
    },
    validate: {
      title: isNotEmpty(translations("Select a title")),
      firstname: isNotEmpty(translations("Name Cannot be blank")),
      phone: (value) => {
        if (value && !isValidPhoneNumber(value))
          return translations("Invalid phone number");
        return null;
      },
    },
  });

  const [isLoading, setIsLoading] = useState(false);
  const [openedPasswordModal, passwordModal] = useDisclosure(false);
  const updateProfile = useUpdateProfileMutation(setIsLoading);
  const changePassword = useChangePasswordMutation(setIsLoading);

  const onSubmit = (values) => {
    setIsLoading(true);
    const data = {
      title: values.title,
      name: mergeNames(values.firstname, values.lastname),
      phone: values.phone ?? "",
    };
    updateProfile.mutate(data);
  };

  const onPasswordSubmit = (values) => {
    setIsPassLoading(true);
    const validation = passwordForm.validate();
    if (validation.hasErrors) return;
    const data = {
      existingPassword: values.existingPassword,
      newPassword: values.newPassword,
    };

    changePassword.mutate(data);
    passwordForm.reset();
    passwordModal.close();
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
    <Flex direction="column" h="80vh" gap="lg" p="xl" align="start" maw="100%">
      <ImageCropModal
        opened={openedCropDialog}
        onclose={closeCropDialog}
        imageName={selectedImage.name}
        handleCropImageSave={handleCropImageSave}
        image={selectedImage.url}
        aspect={1}
      />
      {/* Password Modal */}
      <Modal
        opened={openedPasswordModal}
        onClose={passwordModal.close}
        title={
          <Text fw={600} size="lg">
            {translations("Change Password")}
          </Text>
        }
        centered
        radius="lg"
      >
        <form
          onSubmit={passwordForm.onSubmit(onPasswordSubmit)}
          className="flex flex-col gap-5"
        >
          <Flex gap={"md"} wrap="wrap" direction={"column"}>
            <ContainedPasswordInput
              w={"100%"}
              placeholder={translations("Enter existing password")}
              {...passwordForm.getInputProps("existingPassword")}
            />
            <ContainedPasswordInput
              placeholder={translations("Enter new password")}
              {...passwordForm.getInputProps("newPassword")}
            />
            <ContainedPasswordInput
              placeholder={translations("Enter new password again")}
              {...passwordForm.getInputProps("confirmPassword")}
            />
          </Flex>
          <Flex justify="flex-end" mt="md">
            <RateupButtonBlue
              type="submit"
              loading={isLoading}
              title={translations("Change Password")}
            />
          </Flex>
        </form>
      </Modal>
      <Title order={2}>{translations("User Settings")}</Title>
      <Flex
        direction={{ base: "column", md: "row" }}
        wrap="wrap"
        justify="center"
        align="stretch"
        gap="xl"
        maw="100%"
      >
        {/* Left Column */}
        <Paper
          withBorder
          shadow="sm"
          radius="xl"
          p="xl"
          flex={1}
          maw={{ base: "100%", md: "40%" }}
        >
          <Flex
            gap="xs"
            direction="column"
            justify="center"
            align="center"
            h="100%" // match parent height
            p="sm"
          >
            {/* Avatar */}
            <Avatar
              src={avatarSrc}
              alt="Profile Picture"
              radius="50%"
              size={180}
            />

            {/* Buttons */}
            <Flex gap="md" mt="sm" w="100%">
              {/* <RateupButtonSecondary
                title={translations("Remove")}
                size="sm"
                variant="outline"
                onClick={removePhoto}
              /> */}
              <Button
                onClick={removePhoto}
                variant="filled"
                size="sm"
                radius="lg"
                w="100%"
                maw="100%"
                flex={1}
              >
                <Flex align={"center"} justify={"center"} gap={2}>
                  <IconTrash strokeWidth={1.5} size={20} />
                  <Text size="sm">{translations("Remove")}</Text>
                </Flex>
              </Button>
              <FileButton
                onChange={handleImagePicker}
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                resetRef={resetRef}
              >
                {/* {(props) => (
                  <RateupButtonBlue
                    title={translations("Change Image")}
                    size="sm"
                    {...props}
                  />
                )} */}

                {(props) => (
                  <Button
                    {...props}
                    variant="filled"
                    size="sm"
                    radius="lg"
                    w="100%"
                    maw="100%"
                    flex={1}
                  >
                    <Flex align={"center"} justify={"center"} gap={2}>
                      <IconEdit strokeWidth={1.5} size={20} />

                      <Text size="sm"> {translations("Edit")}</Text>
                    </Flex>
                  </Button>
                )}
              </FileButton>
            </Flex>

            <Box mt="md">
              <LocaleSwitcher />
            </Box>
          </Flex>
        </Paper>

        {/* Right Column */}
        <Paper
          shadow="sm"
          radius="xl"
          p="xl"
          withBorder
          flex={2}
          maw={{ base: "100%", md: "60%" }}
        >
          <Text size="lg" fw={600} className="text-gray-700 mb-4">
            {translations("Edit Info")}
          </Text>

          <form
            onSubmit={profileForm.onSubmit(onSubmit)}
            className="flex flex-col gap-6 h-full pb-10"
            onKeyDown={getHotkeyHandler([
              [
                SAVE_HOTKEY,
                (event: any) => profileForm.onSubmit(onSubmit)(event),
              ],
            ])}
          >
            <Grid columns={12} gutter="md">
              <Grid.Col span={{ xs: 12, sm: 2 }}>
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

              <Grid.Col span={{ xs: 12, sm: 5 }}>
                <ContainedTextField
                  label={translations("First Name")}
                  placeholder={translations("First Name")}
                  {...profileForm.getInputProps("firstname")}
                  withAsterisk
                />
              </Grid.Col>

              <Grid.Col span={{ xs: 12, sm: 5 }}>
                <ContainedTextField
                  label={translations("Last Name")}
                  placeholder={translations("Last Name")}
                  {...profileForm.getInputProps("lastname")}
                />
              </Grid.Col>

              <Grid.Col span={{ xs: 12, sm: 6 }}>
                <Text size="sm" c="dimmed" mb={4}>
                  {translations("Phone Number")}
                </Text>
                <PhoneInputWithCountrySelect
                  defaultCountry="IN"
                  international
                  countryCallingCodeEditable={false}
                  placeholder={translations("Phone Number")}
                  value={profileForm?.values?.phone || ""}
                  {...profileForm?.getInputProps("phone")}
                  className="rounded-md border border-gray-300 px-2 py-1 w-full"
                />
                {profileForm?.errors?.phone && (
                  <Text size="xs" c="red" mt={4}>
                    {profileForm.errors.phone}
                  </Text>
                )}
              </Grid.Col>

              <Grid.Col span={{ xs: 12, sm: 6 }}>
                <ContainedTextField
                  disabled
                  label={translations("Email")}
                  placeholder={translations("Enter your email")}
                  value={profileData?.data?.data?.email ?? ""}
                  withAsterisk
                />
              </Grid.Col>
            </Grid>

            <Flex gap="md" justify="flex-end" wrap="wrap" mt="auto">
              {!profileData?.data?.data?.passwordlessLogin && (
                <RateupButtonBlue
                  title={translations("Change Password")}
                  size="sm"
                  onClick={passwordModal.open}
                />
              )}
              <RateupButtonBlue
                type="submit"
                loading={isLoading}
                size="sm"
                title={translations("Save Changes")}
              />
            </Flex>
          </form>
        </Paper>
      </Flex>
    </Flex>
  );
};

export default ProfileSettings;
