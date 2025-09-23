"use client";

import React, { useEffect, useRef, useState } from "react";

import {
  Avatar,
  Box,
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
import { mergeNames } from "../../../utils/essential";
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
  const { data: profileData } = useGetUserProfile();

  // form setup
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
  const updateProfile = useUpdateProfileMutation(setIsLoading);
  const changePassword = useChangePasswordMutation(setIsLoading);

  const onSubmit = (values: typeof profileForm.values) => {
    setIsLoading(true);
    const data = {
      title: values.title,
      name: mergeNames(values.firstname, values.lastname),
      phone: values.phone ?? "",
    };
    updateProfile.mutate(data);
  };

  // avatar logic
  const [avatarSrc, setAvatarSrc] = useState(
    `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/profile-photo.png`,
  );
  useEffect(() => {
    if (profileData?.data?.data) {
      profileForm.setValues({
        title: profileData?.data?.data?.gender || "",
        firstname: profileData?.data?.data?.name?.split(" ")[0] || "",
        lastname: profileData?.data?.data?.name?.split(" ")[1] || "",
        phone: profileData?.data?.data?.phone || "",
      });
    }
    const profilePhoto = profileData?.data?.data?.profilePhoto;
    if (profilePhoto && profilePhoto !== "REMOVED_PHOTO") {
      setAvatarSrc(
        `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${profilePhoto}`,
      );
    }
  }, [profileData]);

  // crop modal + upload
  const [file, setFile] = useState<File | null>(null);
  const [selectedImage, setSelectedImage] = useState({ url: "", name: "" });
  const resetRef = useRef(null);
  const [openedCropDialog, cropDialog] = useDisclosure(false);
  const updateProfilePhoto = useUpdateProfilePhotoMutation(setIsLoading);

  const handleImagePicker = (event: any) => {
    if (!event) return;
    cropDialog.toggle();
    setSelectedImage({ name: event.name, url: URL.createObjectURL(event) });
    resetRef?.current?.();
  };
  const handleCropImageSave = (cropedImage: File) => {
    setFile(cropedImage);
  };

  function removePhoto() {
    updateProfilePhoto.mutate({ profilePhoto: "REMOVED_PHOTO" });
  }

  // password modal
  const [openedPasswordModal, passwordModal] = useDisclosure(false);
  const passwordForm = useForm({
    initialValues: {
      existingPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    validate: {
      existingPassword: passwordValidation,
      newPassword: passwordValidation,
      confirmPassword: (value, values) =>
        value !== values.newPassword
          ? translations("New Password and Confirm Password did not match")
          : null,
    },
  });

  const handlePasswordSubmit = (values: typeof passwordForm.values) => {
    changePassword.mutate({
      existingPassword: values.existingPassword,
      newPassword: values.newPassword,
    });
    passwordForm.reset();
    passwordModal.close();
  };

  return (
    <Flex direction="column" h="90vh" gap="lg" p="xl" align="start" maw="100%">
      {/* Image Crop Modal */}
      <ImageCropModal
        opened={openedCropDialog}
        onclose={cropDialog.close}
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
          onSubmit={passwordForm.onSubmit(handlePasswordSubmit)}
          className="flex flex-col gap-5"
        >
          <ContainedPasswordInput
            required
            placeholder={translations("Enter existing password")}
            {...passwordForm.getInputProps("existingPassword")}
          />
          <ContainedPasswordInput
            required
            placeholder={translations("Enter new password")}
            {...passwordForm.getInputProps("newPassword")}
          />
          <ContainedPasswordInput
            required
            placeholder={translations("Enter new password again")}
            {...passwordForm.getInputProps("confirmPassword")}
          />
          <Flex justify="flex-end" mt="md">
            <RateupButtonBlue
              type="submit"
              loading={isLoading}
              title={translations("Change Password")}
            />
          </Flex>
        </form>
      </Modal>

      {/* Page Header */}
      <Box mb="sm">
        <Title order={2} fw={700}>
          {translations("User Settings")}
        </Title>
      </Box>

      {/* Responsive Layout */}
      <Flex
        direction={{ base: "column", md: "row" }}
        wrap="wrap"
        justify="center"
        align="stretch" // ensures equal height
        gap="xl"
        w="100%"
        maw="100%"
      >
        {/* Left Column */}
        <Paper withBorder shadow="sm" radius="xl" p="xl">
          <Flex
            gap="md"
            direction="column"
            justify="center"
            align="center"
            h="100%" // match parent height
            p="md"
          >
            {/* Avatar */}
            <Avatar
              src={avatarSrc}
              alt="Profile Picture"
              radius="50%"
              size={180}
              className="w-[140px] h-[140px] sm:w-[180px] sm:h-[180px]"
            />

            {/* Buttons */}
            <Flex gap="md" mt="sm">
              <RateupButtonSecondary
                title={translations("Remove Image")}
                size="sm"
                variant="outline"
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
                    {...props}
                  />
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
          flex={1}
          className="bg-white w-full md:flex-[0.65] min-w-[320px] max-w-full"
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
