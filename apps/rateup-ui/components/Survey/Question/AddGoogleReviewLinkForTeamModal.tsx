import { useEffect } from "react";

import { ActionIcon, Group, Stack, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconEdit } from "@tabler/icons-react";

import useTranslations from "@/dictionaries/useTranslation";

import { useEditTeamMutation } from "../../../backend/team/team.query";
import { ContainedTextField } from "../../input/ContainedInput/ContainedInput";
import FormModalLayout from "../../Modal/FormModalLayout";

const AddGoogleReviewLinkForTeamModal = ({ team, surveyId }) => {
  const { translations } = useTranslations();
  const form = useForm({
    initialValues: {
      googleLink: team?.googleLink ?? "",
    },
    validate: {
      googleLink: (value) =>
        value.startsWith("https://") || value === ""
          ? null
          : translations["Please enter a valid url (https://...)"],
    },
  });
  const [opened, { open, close }] = useDisclosure(false);
  const editTeamMutation = useEditTeamMutation(team.id, () => {}, surveyId);

  const handleSubmit = () => {
    const res = form.validate();
    if (res.hasErrors) {
      return;
    }
    editTeamMutation.mutate(form.values, {
      onSettled: () => {
        form.reset();
        close();
      },
    });
  };

  useEffect(() => {
    form.setFieldValue("googleLink", team?.googleLink);
  }, [team, opened]);

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
        value={team.googleLink}
        readOnly
      />
      <ActionIcon onClick={open} variant="subtle">
        <IconEdit size={"1.5rem"} />
      </ActionIcon>
      <FormModalLayout
        title={translations["Google Review Link"]}
        opened={opened}
        onClose={() => {
          form.reset();
          close();
        }}
        centered
        buttonTitle={translations["Save"]}
        includeCancelButton
        onSubmit={handleSubmit}
        size="md"
      >
        <Stack>
          <ContainedTextField
            label={team?.name}
            {...form.getInputProps("googleLink")}
            placeholder={`${translations["Enter google review link for"]} ${team?.name}`}
          />
        </Stack>
      </FormModalLayout>
    </Group>
  );
};

export default AddGoogleReviewLinkForTeamModal;
