import React, { useState, useEffect } from "react";
import {
  Title,
  Divider,
  Stack,
  Container,
  Group,
  Image,
  FileButton,
  Button,
  Flex,
  Paper,
  Avatar,
  Grid,
  Text,
} from "@mantine/core";
import { RateupButtonSecondary } from "../../../../components/Button/RateupButtons";
import { useUpdateOrgLogoMutation } from "../../../../backend/org/org.query";
import { uploadFile } from "../../../../utils/file-upload/upload";
import { notifications } from "@mantine/notifications";
import { useUser } from "../../../../context/UserContext";
import {
  ContainedPasswordInput,
  ContainedTextField,
} from "../../../../components/input/ContainedInput/ContainedInput";

const OrgSettings = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoadingUpload, setIsLoadingUpload] = useState(false);
  const { user } = useUser();

  const updateLogo = useUpdateOrgLogoMutation(setIsLoadingUpload);
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
    }
  }, [user.orgLogo]);

  return (
    <Flex direction={"column"} h={"100%"}>
      <Title order={2}>Organization Settings</Title>
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
              {
                // profileData?.data?.data?.name ||
                "Organization"
              }
            </Text>
            <Text>
              {" "}
              {
                // retrieveRole(profileData?.data?.data?.role)
                9876545678
              }
            </Text>
            <Text size="sm">
              {
                // profileData?.data?.data?.email
                "Address"
              }
            </Text>
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
            // onSubmit={profileForm.onSubmit(onSubmit)}
            style={{ display: "flex", flexDirection: "column", gap: 30 }}
          >
            <Grid columns={10} grow>
              <Grid.Col span={{ xs: 10 }}>
                <ContainedTextField
                  w={"100%"}
                  label="Organization Name"
                  placeholder="Enter your organization name"
                  // {...profileForm.getInputProps("orname")}
                  withAsterisk
                />
              </Grid.Col>
              <Grid.Col span={{ xs: 10, lg: 4 }}>
                <ContainedTextField
                  withAsterisk
                  label="Phone"
                  placeholder="Enter your organization phone number"
                  // {...profileForm?.getInputProps("phone")}
                />
              </Grid.Col>
              <Grid.Col span={{ xs: 10, lg: 6 }}>
                <ContainedTextField
                  disabled
                  label="Address"
                  placeholder="Enter your address"
                  // value={profileData?.data?.data?.email}
                  withAsterisk
                />
              </Grid.Col>
            </Grid>
            <Flex justify="center">
              <RateupButtonSecondary
                type="submit"
                // loading={isLoading}
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
export default OrgSettings;
