import { useRouter } from "next/router";

import { Stack } from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";

import useTranslations from "@/dictionaries/useTranslation";

import { useTeamsByUser } from "../../backend/team/team.query";
import { useCreateTestimonialCollection } from "../../backend/testimonials/testimonial.query";
import { defaultTestimonialStyle } from "../../utils/testimonial";
import {
  ContainedSelection,
  ContainedTextField,
} from "../input/ContainedInput/ContainedInput";
import FormModalLayout from "../Modal/FormModalLayout";

const SaveTestimonialCollection = ({ opened, close }) => {
  const {
    data: teamRes,
    isLoading: teamsLoading,
    isError,
    error,
  } = useTeamsByUser();
  const teamOptions = teamRes?.data?.map((team) => ({
    value: team?.id,
    label: team?.name,
  }));
  const { translations } = useTranslations();
  const form = useForm({
    initialValues: {
      name: "",
      teamId: "",
      theme: defaultTestimonialStyle,
    },
    validate: {
      name: isNotEmpty("Name cannot be blank"),
      teamId: isNotEmpty("Please select a team"),
    },
  });

  const router = useRouter();
  const saveCollection = useCreateTestimonialCollection();
  const onSubmit = () => {
    if (form.validate().hasErrors) return;
    notifications.show({
      id: "create-collection",
      loading: true,
      title: "Creating survey..",
      message: `Hold on, your collection is getting created...`,
      autoClose: false,
      withCloseButton: true,
    });
    saveCollection.mutate(form.values, {
      onSuccess: (data) => {
        close();
        router.push(`${router.pathname}/${data?.id}`);
      },
    });
  };

  return (
    <FormModalLayout
      opened={opened}
      onClose={close}
      title="Create Collection"
      centered
      onSubmit={onSubmit}
      buttonTitle="Save"
      includeCancelButton
      cancelOnClick={() => {
        form.reset();
        close();
      }}
    >
      <Stack>
        <ContainedTextField
          label="Name your collection"
          {...form.getInputProps("name")}
          placeholder="Enter collection name "
          styles={{
            label: {
              fontWeight: "bold",
              fontSize: "16px",
            },
          }}
        />
        <ContainedSelection
          allowDeselect={false}
          data={teamOptions}
          label={"Select Team"}
          {...form.getInputProps("teamId")}
          placeholder="Select Team"
        />
      </Stack>
    </FormModalLayout>
  );
};

export default SaveTestimonialCollection;
