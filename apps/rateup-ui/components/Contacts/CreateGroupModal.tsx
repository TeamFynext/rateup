import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import {
  Avatar,
  Box,
  Button,
  Checkbox,
  FileButton,
  Group,
  Paper,
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
import { ContainedTextField } from "../input/ContainedInput/ContainedInput";
import { TeamSelector } from "../input/TeamSelector";
import PaperLayout from "../styled/Layouts/PaperLayout";

interface GroupModalProps {
  groupClose: () => void;
  close?: () => void;
  isEdit?: boolean;
  groupDetails?: ContactGroup;
  type?: ContactGroupType;
  gTags?: string[];
}

const CreateGroupModal = ({
  groupClose,
  close,
  isEdit,
  groupDetails,
  type,
  gTags = [],
}: GroupModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const router = useRouter();
  const { translations } = useTranslations();
  const form = useForm({
    initialValues: groupDetails
      ? { ...groupDetails, contactType: gTags ?? [] }
      : {
          name: "",
          icon: "",
          teamId: "",
          contactType: gTags ?? [],
          tags: {},
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

    // Process tags for selected contact types
    const result = {};
    for (const key of form.values.contactType) {
      if (form.values?.tags?.hasOwnProperty(key)) {
        result[key] = form.values?.tags?.[key];
      }
    }

    let updatedValues = {
      ...form.values,
      type,
      tags: result,
    };

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
          <Stack>
            <ContainedTextField
              required
              label={translations["Group Name"]}
              placeholder={translations["Enter group name"]}
              {...form.getInputProps("name")}
            />
            <TeamSelector
              value={selectedTeamId}
              onChange={(value) => setSelectedTeamId(value)}
              label={translations["Select Team"]}
              readOnly={isEdit}
            />
          </Stack>
          <Stack>
            <Avatar
              size={"xl"}
              color="initials"
              name={form?.values?.name}
              src={form?.values?.icon && getFileUrlFromKey(form.values.icon)}
              radius={"sm"}
              mx={"auto"}
            />
            <FileButton onChange={setFile} accept="image/png,image/jpeg">
              {(props) => (
                <Button
                  size="md"
                  radius="md"
                  {...props}
                  variant="outline"
                  leftSection={<IconUpload size={15}></IconUpload>}
                >
                  <Text size="sm">{translations["Upload Icon"]}</Text>
                </Button>
              )}
            </FileButton>
          </Stack>
        </SimpleGrid>
        {gTags?.length > 0 && (
          <PaperLayout p={"xs"} mt={"md"} radius={"md"}>
            <Checkbox.Group
              label={translations["Contact Types"]}
              {...form.getInputProps("contactType")}
            >
              <Group>
                {gTags?.map((data) => (
                  <Checkbox
                    value={data}
                    label={data}
                    key={data}
                    tt={"capitalize"}
                  />
                ))}
              </Group>
            </Checkbox.Group>
          </PaperLayout>
        )}

        {form.values.contactType?.length > 0 && (
          <SimpleGrid cols={2}>
            {form.values.contactType?.map(
              (data) =>
                data !== "phone" && (
                  <ContainedTextField
                    key={data}
                    label={data}
                    placeholder={`Enter ${data}`}
                    {...form.getInputProps(`tags.${data}`)}
                  />
                ),
            )}
          </SimpleGrid>
        )}

        <Group justify="flex-end" mt={"md"}>
          <RateupButtonSecondary
            title={translations["cancel"]}
            onClick={groupClose}
          />
          <RateupButtonBlue
            title={isEdit ? translations["Save"] : translations["Create Group"]}
            onClick={handleSubmit}
            loading={isCreating}
            disabled={isUploading}
          />
        </Group>
      </form>
    </Box>
  );
};

export default CreateGroupModal;
