import React, { useState, useEffect } from "react";
import {
  Title,
  Divider,
  Stack,
  Text,
  FileButton,
  Grid,
  Avatar,
  Group,
  Flex,
  Paper,
} from "@mantine/core";
import { RateupButtonSecondary } from "../../../../components/Button/RateupButtons";
import {
  useChangePasswordMutation,
  useGetUserProfile,
  useUpdateProfileMutation,
  useUpdateProfilePhotoMutation,
} from "../../../../backend/user/user.query";
import { useForm } from "@mantine/form";
import { uploadFile } from "../../../../utils/file-upload/upload";
import { notifications } from "@mantine/notifications";
import {
  ContainedPasswordInput,
  ContainedSelection,
  ContainedTextField,
} from "../../../../components/input/ContainedInput/ContainedInput";
import { mergeNames, retrieveRole } from "../../../../utils/essential";
import { passwordValidation } from "../../../../utils/validation";

const ProfileSettings = () => {
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
      title: (value) => {
        if (value.length < 4) {
          return "Select a title";
        }
        return null; // Validation passed
      },
      firstname: (value) => {
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
        if (value.length < 10) {
          return "Min 10 digits long";
        }
        if (value.length > 10) {
          return "Invalid phone (10 digits only allowed)";
        }
        return null;
      },
      existingPassword: (value, values) =>
        isAnyPasswordFieldDirty(values) ? passwordValidation(value) : null,
      newPassword: (value, values) =>
        isAnyPasswordFieldDirty(values) ? passwordValidation(value) : null,
      confirmPassword: (value, values) => {
        if (value !== values.newPassword && isAnyPasswordFieldDirty(values)) {
          return "New Password  and Confirm Password did not match";
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
      phone: values.phone,
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
    `${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/profile-photo.png`,
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
      const imgUrl = `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${profilePhoto}`;
      setAvatarSrc(imgUrl);
    } else {
      setAvatarSrc(
        `${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/profile-photo.png`,
      );
    }
  }, [profileData]);

  const [file, setFile] = useState<File | null>(null);
  const [isLoadingUpload, setIsLoadingUpload] = useState(false);

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
            title: "Uploading photo",
            message: `Hold on, changing your profile photo`,
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

  return (
    <Flex direction={"column"} h={"100%"}>
      <Title order={2}>User Settings</Title>
      <Flex
        direction={"row"}
        style={{ height: "100%", overflow: "scroll" }}
        wrap="wrap"
        justify="space-around"
      >
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
            />
            <FileButton onChange={setFile} accept="image/png,image/jpeg">
              {(props) => (
                <RateupButtonSecondary
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
              {profileData?.data?.data?.name || "User"}
            </Text>
            <Text> {retrieveRole(profileData?.data?.data?.role)}</Text>
            <Text size="sm">{profileData?.data?.data?.email}</Text>
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
            onSubmit={profileForm.onSubmit(onSubmit)}
            style={{ display: "flex", flexDirection: "column", gap: 30 }}
          >
            <Grid columns={10} grow>
              <Grid.Col span={{ xs: 10, lg: 2 }} bg="white">
                <ContainedSelection
                  label="Title"
                  placeholder="Select"
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
                  label="First Name"
                  placeholder="Enter your full name"
                  {...profileForm.getInputProps("firstname")}
                  withAsterisk
                />
              </Grid.Col>
              <Grid.Col span={{ xs: 10, md: 5, lg: 4 }}>
                <ContainedTextField
                  label="Last Name"
                  placeholder="Enter your full name"
                  {...profileForm.getInputProps("lastname")}
                />
              </Grid.Col>
              <Grid.Col span={{ xs: 10, lg: 4 }}>
                <ContainedTextField
                  withAsterisk
                  label="Phone"
                  placeholder="Enter your phone number"
                  {...profileForm?.getInputProps("phone")}
                />
              </Grid.Col>
              <Grid.Col span={{ xs: 10, lg: 6 }}>
                <ContainedTextField
                  disabled
                  label="Email"
                  placeholder="Enter your email"
                  value={profileData?.data?.data?.email}
                  withAsterisk
                />
              </Grid.Col>
            </Grid>
            <Flex direction={"column"} gap="md">
              <Stack>
                <Title size="lg" fw={500}>
                  Change Password
                </Title>
                <Text color="dark.1">
                  Enter your current password to change yout new password.
                </Text>
              </Stack>
              <Flex gap={"md"} wrap="wrap">
                <Flex style={{ flex: 1 }} miw={300}>
                  <ContainedPasswordInput
                    required={isAnyPasswordFieldDirty()}
                    w={"100%"}
                    label="Existing Password"
                    placeholder="Enter existing password"
                    {...profileForm.getInputProps("existingPassword")}
                  />
                </Flex>
                <Flex direction={"column"} style={{ flex: 1 }} miw={300}>
                  <ContainedPasswordInput
                    required={isAnyPasswordFieldDirty()}
                    label="New Password"
                    placeholder="Enter new password"
                    {...profileForm.getInputProps("newPassword")}
                  />
                  <ContainedPasswordInput
                    required={isAnyPasswordFieldDirty()}
                    label="Confirm Password"
                    placeholder="Enter new password again"
                    mt="md"
                    {...profileForm.getInputProps("confirmPassword")}
                  />
                </Flex>
              </Flex>
            </Flex>
            <Flex justify="center">
              <RateupButtonSecondary
                type="submit"
                loading={isLoading}
                size="sm"
                title="Save Changes"
                color="var(--tertiary-color)"
              />
            </Flex>
          </form>
        </Flex>
      </Flex>
    </Flex>
  );
};

export default ProfileSettings;
