import { Stack, Text } from "@mantine/core";
import FormModalLayout from "../Modal/FormModalLayout";
import {
  ContainedSelection,
  ContainedTextField,
} from "../input/ContainedInput/ContainedInput";
import { isNotEmpty, useForm } from "@mantine/form";
import { useCreateTestimonialCollection } from "../../backend/testimonials/testimonial.query";
import { useSurvey } from "../../backend/surveys/surveys.query";
import { defaultTestimonialStyle } from "../../utils/testimonial";
import { useRouter } from "next/router";
import { notifications } from "@mantine/notifications";

const SaveTestimonialCollection = ({ opened, close, selectedSurvey }) => {
  const form = useForm({
    initialValues: {
      name: "",
      surveyTeamMapId: "",
      theme: defaultTestimonialStyle,
    },
    validate: {
      name: isNotEmpty("Name cannot be blank"),
      surveyTeamMapId: isNotEmpty("Please select a team"),
    },
  });
  const { data: survey } = useSurvey(selectedSurvey);
  const teamsOptions = survey?.teams?.map((team) => {
    return { value: team?.mapId, label: team?.name };
  });
  const router = useRouter();
  const saveCollection = useCreateTestimonialCollection(selectedSurvey);
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
      title="Save Collections"
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
          data={teamsOptions}
          label={"Select Team"}
          {...form.getInputProps("surveyTeamMapId")}
          placeholder="Select Team"
        />
        <Text c="red">{form.errors.selectedTestimonials}</Text>
      </Stack>
    </FormModalLayout>
  );
};

export default SaveTestimonialCollection;
