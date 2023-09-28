import React, { useState, useEffect } from 'react'
import { Title, Divider, Stack, Container, Group, Image, FileButton, Button} from '@mantine/core';
import { RateupButtonSecondary } from '../../../../components/Button/RateupButtons';
import { useUpdateOrgLogoMutation } from '../../../../backend/org/org.query';
import { uploadFile } from '../../../../utils/file-upload/upload';
import { notifications } from '@mantine/notifications';
import { useUser } from '../../../../context/UserContext';

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

  const [avatarSrc, setAvatarSrc] = useState('');

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
    <Stack style={{ maxWidth: "500px" }}>

    <Title order={2}> Organization Settings</Title>
    <Divider mt="sm" mb="xl"/>
    <Group>

    <Stack justify="center" mr="xl" style={{ minWidth: "200px" }}>
        <Image
            height={120}
            src={avatarSrc}
            alt="org logo"
            fallbackSrc="https://placehold.co/600x400?text=OrgLogo"
            />

    </Stack>
      
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
                    Change Logo
                  </Button>
                )}
              </FileButton>

              <RateupButtonSecondary
                title="Remove Logo"
                size="sm"
                onClick={removePhoto}
              />
            </Stack>
    </Group>
    </Stack>
  )
}

export default OrgSettings 
