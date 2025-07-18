import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import {
  Avatar,
  Box,
  Button,
  FileButton,
  Group,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { getHotkeyHandler } from "@mantine/hooks";
import { IconUpload } from "@tabler/icons-react";

import { ContactGroupType } from "@/types/enums";
import useTranslations from "@/dictionaries/useTranslation";

import {
  useCreateContactGroupMutation,
  useEditContactGroupMutation,
} from "../../backend/campaign/contactGroup/contactGroup.query";
import { SAVE_HOTKEY } from "../../utils/constants";
import { getFileUrlFromKey, uploadFile } from "../../utils/file-upload/upload";
import { showErrorToast } from "../../utils/notifications";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../Button/RateupButtons";
import { TeamSelector } from "../input/TeamSelector";

interface GroupModalProps {
  groupClose: () => void;
  close?: () => void;
  isEdit?: boolean;
  groupDetails?: ContactGroup;
  type?: ContactGroupType;
}

const CreateGroupModal = ({
  groupClose,
  close,
  isEdit,
  groupDetails,
  type,
}: GroupModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const router = useRouter();
  const { translations } = useTranslations();
  const form = useForm({
    initialValues: groupDetails || {
      name: "",
      icon: "",
      teamId: "",
    },
    validate: {
      name: (value) => (value.length ? null : translations["Cannot be empty"]),
      teamId: (value) =>
        !isEdit && !value && translations["Must select a team"],
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
    let updatedValues = { ...form.values, type };
    if (isEdit) {
      editContactGroupMutation.mutate(updatedValues, {
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
      createContactGroupMutation.mutate(updatedValues, {
        onSuccess: (data) => {
          groupClose();
          close();
          setIsCreating(false);
          form.reset();
          router.push(
            `/dashboard/${type === ContactGroupType.LOYALTY ? "loyalty/customer/group" : "contacts"}/${data?.data?.id}`,
          );
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
        showErrorToast(translations["Error uploading icon. Please try again."]);
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
            label={translations["Group Name"]}
            placeholder={translations["Enter group name"]}
            {...form.getInputProps("name")}
            size="md"
            radius={"md"}
            required
          />
          {!isEdit ? (
            <Stack gap={0}>
              <Text>{translations["Select Team"]}</Text>
              <TeamSelector
                value={selectedTeamId}
                onChange={(value) => setSelectedTeamId(value)}
              ></TeamSelector>
            </Stack>
          ) : (
            <Stack></Stack>
          )}
          <Stack gap={0}>
            <Text>{translations["Upload Profile Picture"]}</Text>
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
                  <Text size="sm">{translations["Upload Icon"]}</Text>
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
            title={translations["cancel"]}
            onClick={groupClose}
          ></RateupButtonSecondary>
          <RateupButtonBlue
            title={isEdit ? translations["Save"] : translations["Create Group"]}
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
