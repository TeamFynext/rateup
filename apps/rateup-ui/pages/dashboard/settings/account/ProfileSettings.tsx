import React, { useState, useEffect } from "react";
import {
  Title,
  Divider,
  Stack,
  Text,
  FileButton,
  Button,
  Grid,
  Avatar,
  Group,
  TextInput,
  Select,
} from "@mantine/core";
import { RateupButtonSecondary } from "../../../../components/Button/RateupButtons";
import {
  useGetUserProfile,
  useUpdateProfileMutation,
  useUpdateProfilePhotoMutation,
} from "../../../../backend/user/user.query";
import { useForm } from "@mantine/form";
import { uploadFile } from "../../../../utils/file-upload/upload";
import { notifications } from "@mantine/notifications";

const ProfileSettings = () => {
  const {
    isLoading: isprofileLoading,
    error: profileError,
    data: profileData,
  } = useGetUserProfile();

  function role(role) {
    if (role === "SUPER_ADMIN") return "Super Admin";

    if (role === "ADMIN") return "Admin";
  }

  const profileForm = useForm({
    initialValues: {
      title: "",
      name: "",
      phone: "",
      whatsappAccessToken: null,
    },
    validate: {
      title: (value) => {
        if (value.length < 4) {
          return "Select a title";
        }
        return null; // Validation passed
      },
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
        if (value.length < 10) {
          return "Min 10 digits long";
        }
        if (value.length > 10) {
          return "Invalid phone (10 digits only allowed)";
        }
        return null;
      },
    },
  });

  const [isLoading, setIsLoading] = useState(false);
  const updateProfile = useUpdateProfileMutation(setIsLoading);

  const onSubmit = (values) => {
    setIsLoading(true);
    const data = {
      title: values.title,
      name: values.name,
      phone: values.phone,
      whatsappAccessToken: values.whatsappAccessToken,
    };
    updateProfile.mutate(data);
  };

  const [avatarSrc, setAvatarSrc] = useState(
    `${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/profile-photo.png`
  );

  useEffect(() => {
    if (profileData?.data?.data) {
      profileForm.setValues({
        title: profileData?.data?.data?.gender || "",
        name: profileData?.data?.data?.name || "",
        phone: profileData?.data?.data?.phone || "",
      });
    }

    const profilePhoto = profileData?.data?.data?.profilePhoto;

    if (profilePhoto && profilePhoto !== "REMOVED_PHOTO") {
      const imgUrl = `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${profilePhoto}`;
      setAvatarSrc(imgUrl);
    } else {
      setAvatarSrc(
        `${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/profile-photo.png`
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
    <>
      <Title order={2}> Profile Settings </Title>
      <Divider my="md" />
      <Stack pl="lg">
        <Grid align="center">
          <Grid.Col span={{ md: 6, lg: 3 }}>
            <Avatar
              src={avatarSrc}
              alt={"Profile Picture"}
              radius="xl"
              size={130}
            />
          </Grid.Col>
          <Grid.Col span={{ md: 6, lg: 4 }}>
            <Stack>
              <Text size="lg" fw={500}>
                {profileData?.data?.data?.name || "User"}
              </Text>
              <Text> {role(profileData?.data?.data?.role)}</Text>

              <Stack>
                <Text size="sm" fw={500}>
                  {profileData?.data?.data?.email}
                </Text>
              </Stack>
            </Stack>
          </Grid.Col>
          <Grid.Col span={{ md: 6, lg: 3 }}>
            <Stack justify="center" style={{ maxWidth: "200px" }}>
              <FileButton onChange={setFile} accept="image/png,image/jpeg">
                {(props) => (
                  <Button
                    fullWidth
                    size="sm"
                    radius="lg"
                    variant="gradient"
                    gradient={{ from: "#62CBE6", to: "#3F5BA9" }}
                    {...props}
                  >
                    Change Photo
                  </Button>
                )}
              </FileButton>

              <RateupButtonSecondary
                title="Remove Photo"
                size="sm"
                onClick={removePhoto}
              />
            </Stack>
          </Grid.Col>
        </Grid>
        <Group mt="sm">
          <Text size="lg" color="dark.1">
            {" "}
            Personal Info
          </Text>
        </Group>
        <Divider mb="xs" />
        <form onSubmit={profileForm.onSubmit(onSubmit)}>
          <Grid style={{ maxWidth: "550px" }}>
            <Grid.Col span={{ md: 2, lg: 3 }}>
              <Select
                style={{ maxWidth: "200px" }}
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
            <Grid.Col span={{ md: 6, lg: 4 }}>
              <TextInput
                style={{ maxWidth: "250px" }}
                label="Name"
                placeholder="Enter your full name"
                {...profileForm.getInputProps("name")}
                withAsterisk
              />
            </Grid.Col>
          </Grid>
          <Grid style={{ maxWidth: "850px" }}>
            <Grid.Col span={{ md: 4}}>   
            {/* //VERIFY MANTINE */}
              <TextInput
                style={{ maxWidth: "250px" }}
                disabled
                label="Email"
                placeholder="Enter your email"
                value={profileData?.data?.data?.email}
                withAsterisk
              />
            </Grid.Col>
            <Grid.Col span={{ md: 4}}>
              <TextInput
                style={{ maxWidth: "250px" }}
                withAsterisk
                label="Phone"
                placeholder="Enter your phone number"
                {...profileForm?.getInputProps("phone")}
              />
            </Grid.Col>
            <Grid.Col span={{ md: 4}}>
              <TextInput
                style={{ maxWidth: "250px" }}
                withAsterisk
                label="whatsappAccessToken"
                placeholder="Enter your whatsappAccessToken number"
                {...profileForm?.getInputProps("whatsappAccessToken")}
              />
            </Grid.Col>
            
          </Grid>

          <Grid justify="flex-start" mt="md" style={{ maxWidth: "550px" }}>
            <Grid.Col span={{ md: 6, lg:4 }}>
              <RateupButtonSecondary
                type="submit"
                loading={isLoading}
                size="sm"
                title="Save Changes"
              />
            </Grid.Col>
            {/* <Grid.Col md={6} lg={3}></Grid.Col> */}
          </Grid>
        </form>
      </Stack>
    </>
  );
};

export default ProfileSettings;
