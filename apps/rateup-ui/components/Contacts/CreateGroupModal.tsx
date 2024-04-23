import {
  Stack,
  Text,
  Box,
  SimpleGrid,
  TextInput,
  Button,
  FileButton,
  Group,
  Avatar,
} from "@mantine/core";
import { IconUpload } from "@tabler/icons-react";
import { useForm } from "@mantine/form";
import { TeamSelector } from "../input/TeamSelector";
import { useEffect, useState } from "react";
import {
  RateupButtonSecondary,
  RateupButtonBlue,
} from "../Button/RateupButtons";
import {
  useCreateContactGroupMutation,
  useEditContactGroupMutation,
} from "../../backend/campaign/contactGroup/contactGroup.query";
import { getFileUrlFromKey, uploadFile } from "../../utils/file-upload/upload";
import { showErrorToast } from "../../utils/notifications";
import { getHotkeyHandler } from "@mantine/hooks";
import { SAVE_HOTKEY } from "../../utils/constants";
import { useRouter } from "next/router";

interface GroupModalProps {
  groupClose: () => void;
  close?: () => void;
  isEdit?: boolean;
  groupDetails?: ContactGroup;
}

const CreateGroupModal = ({
  groupClose,
  close,
  isEdit,
  groupDetails,
}: GroupModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const router = useRouter();
  const form = useForm({
    initialValues: groupDetails || {
      name: "",
      icon: "",
      teamId: "",
    },
    validate: {
      name: (value) => (value.length ? null : "Cannot be empty"),
      teamId: (value) => !isEdit && !value && "Must select a team",
    },
  });

  useEffect(() => {
    if (groupDetails) {
      form.setValues(groupDetails);
      form.setFieldValue("teamId", groupDetails.teamId);
    } else {
      form.reset();
    }
  }, [groupDetails]);

  const createContactGroupMutation = useCreateContactGroupMutation();

  const editContactGroupMutation = useEditContactGroupMutation(
    groupDetails?.id,
  );

  const handleSubmit = () => {
    const validation = form.validate();
    if (validation.hasErrors) {
      return;
    }
    setIsCreating(true);
    if (isEdit) {
      editContactGroupMutation.mutate(form.values, {
        onSuccess: () => {
          groupClose();
          setIsCreating(false);
          form.reset();
        },
        onError: () => {
          groupClose();
          setIsCreating(false);
          form.reset();
        },
      });
    } else {
      createContactGroupMutation.mutate(form.values, {
        onSuccess: (data) => {
          groupClose();
          close();
          setIsCreating(false);
          form.reset();
          router.push(`/dashboard/contacts/${data?.data?.id}`);
        },
        onError: () => {
          groupClose();
          close();
          setIsCreating(false);
          form.reset();
        },
      });
    }
  };

  useEffect(() => {
    form.setFieldValue("teamId", selectedTeamId);
  }, [selectedTeamId]);

  useEffect(() => {
    if (!file) return;
    setIsUploading(true);
    uploadFile(file)
      .then((key) => {
        form.setFieldValue("icon", key);
        setIsUploading(false);
      })
      .catch((err) => {
        showErrorToast("Error uploading icon. Please try again.");
        setIsUploading(false);
      });
  }, [file]);

  return (
    <Box>
      <form
        onSubmit={handleSubmit}
        onKeyDown={getHotkeyHandler([[SAVE_HOTKEY, handleSubmit]])}
      >
        <SimpleGrid cols={2}>
          <TextInput
            label="Group Name"
            placeholder="Enter group name"
            {...form.getInputProps("name")}
            size="md"
            radius={"md"}
            required
          ></TextInput>
          {!isEdit ? (
            <Stack gap={0}>
              <Text>Select Team</Text>
              <TeamSelector
                value={selectedTeamId}
                onChange={(value) => setSelectedTeamId(value)}
              ></TeamSelector>
            </Stack>
          ) : (
            <Stack></Stack>
          )}
          <Stack gap={0}>
            <Text>Upload Profile Picture</Text>
            <FileButton onChange={setFile} accept="image/png,image/jpeg">
              {(props) => (
                <Button
                  size="xl"
                  radius="lg"
                  {...props}
                  variant="outline"
                  color="grey"
                  leftSection={<IconUpload size={15}></IconUpload>}
                >
                  <Text size="sm">Upload Icon</Text>
                </Button>
              )}
            </FileButton>
          </Stack>
          <Avatar
            radius={"xl"}
            src={
              form?.values?.icon
                ? getFileUrlFromKey(form.values.icon)
                : `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/user-group-icon-t.png`
            }
            size={"xl"}
          ></Avatar>
        </SimpleGrid>
        <Group justify="flex-end" mt={"md"}>
          <RateupButtonSecondary
            title="cancel"
            onClick={groupClose}
          ></RateupButtonSecondary>
          <RateupButtonBlue
            title={isEdit ? "Edit Group" : "Create Group"}
            onClick={handleSubmit}
            loading={isCreating}
            disabled={isUploading}
          ></RateupButtonBlue>
        </Group>
      </form>
    </Box>
  );
};

export default CreateGroupModal;
