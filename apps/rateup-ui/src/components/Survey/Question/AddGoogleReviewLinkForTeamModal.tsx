"use client";

import { useEffect } from "react";

import { ActionIcon, Group, Stack, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconEdit } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { useEditTeamMutation } from "@/backend/team/team.query";

import { ContainedTextField } from "../../input/ContainedInput/ContainedInput.tsx";
import FormModalLayout from "../../Modal/FormModalLayout.tsx";
import { ReviewPagePlatform } from "./QuestionReviewPageEditor/index.tsx";

const AddGoogleReviewLinkForTeamModal = ({ team, surveyId, platform }) => {
  const { t: translations } = useTranslation();
  const form = useForm({
    initialValues: {
      url: team?.reviewPageLinks?.[platform] ?? "",
    },
    validate: {
      url: (value) =>
        value.startsWith("https://") || value === ""
          ? null
          : translations("Please enter a valid url (https://...)"),
    },
  });
  const [opened, { open, close }] = useDisclosure(false);
  const editTeamMutation = useEditTeamMutation(team.id, () => {}, surveyId);

  const handleSubmit = async () => {
    const res = form.validate();
    if (res.hasErrors) {
      return;
    }

    let newReviewPageLinks = {};
    if (!team.reviewPageLinks) {
      newReviewPageLinks = {
        [platform]: form.getValues().url,
      };
    } else if (team.reviewPageLinks) {
      if (
        "" in team.reviewPageLinks &&
        platform === ReviewPagePlatform.Google
      ) {
        newReviewPageLinks = {
          ...team.reviewPageLinks,
          [platform]: form.getValues().url,
        };
        delete newReviewPageLinks[""];
      } else
        newReviewPageLinks = {
          ...team.reviewPageLinks,
          [platform]: form.getValues().url,
        };
    }
    await editTeamMutation.mutateAsync({
      reviewPageLinks: newReviewPageLinks,
      googleLink: newReviewPageLinks[ReviewPagePlatform.Google]?.length
        ? newReviewPageLinks[ReviewPagePlatform.Google]
        : undefined,
    });
    form.reset();
    close();
  };

  useEffect(() => {
    form.setFieldValue("url", team?.reviewPageLinks?.[platform] || "");
  }, [team, opened, platform]);

  return (
    <Group justify="space-between" key={team.id}>
      <Text
        style={{
          flex: 1,
        }}
      >
        {team.name}
      </Text>
      <Text>:</Text>
      <TextInput
        style={{
          flexGrow: 1,
        }}
        onChange={() => {}}
        value={form.getValues().url}
        readOnly
      />
      <ActionIcon onClick={open} variant="subtle">
        <IconEdit size={"1.5rem"} />
      </ActionIcon>
      <FormModalLayout
        title={`${platform} Url`}
        opened={opened}
        onClose={() => {
          form.reset();
          close();
        }}
        centered
        buttonTitle={translations("Save")}
        includeCancelButton
        onSubmit={handleSubmit}
        size="md"
      >
        <Stack>
          <ContainedTextField
            label={team?.name}
            {...form.getInputProps("url")}
            placeholder={`Enter review page url for ${team?.name}`}
          />
        </Stack>
      </FormModalLayout>
    </Group>
  );
};

export default AddGoogleReviewLinkForTeamModal;
