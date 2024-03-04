import { useForm } from "@mantine/form";
import FormModalLayout from "../../Modal/FormModalLayout";
import { ActionIcon, Group, Stack, TextInput, Text } from "@mantine/core";
import { ContainedTextField } from "../../input/ContainedInput/ContainedInput";
import { useEditTeamMutation } from "../../../backend/team/team.query";
import { IconEdit } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import { useEffect } from "react";

const AddGoogleReviewLinkForTeamModal = ({ team, surveyId }) => {
  const form = useForm({
    initialValues: {
      googleLink: team?.googleLink ?? "",
    },
    validate: {
      googleLink: (value) =>
        value.startsWith("https://") || value === ""
          ? null
          : "Please enter a valid url (https://...)",
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
        title="Google Review Link"
        opened={opened}
        onClose={() => {
          form.reset();
          close();
        }}
        centered
        buttonTitle="Save"
        includeCancelButton
        onSubmit={handleSubmit}
        size="md"
      >
        <Stack>
          <ContainedTextField
            label={team?.name}
            {...form.getInputProps("googleLink")}
            placeholder={`Enter google review link for ${team?.name}`}
          />
        </Stack>
      </FormModalLayout>
    </Group>
  );
};

export default AddGoogleReviewLinkForTeamModal;
