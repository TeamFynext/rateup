import {
  Paper,
  Stack,
  Button,
  CopyButton,
  TextInput,
  SimpleGrid,
  Title,
  Modal,
  Flex,
} from "@mantine/core";
import { IconCopy } from "@tabler/icons-react";
import { createFormContext } from "@mantine/form";
import { useQuery } from "@tanstack/react-query";
import { IconX } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useEffect, useState } from "react";
import { getSurveys } from "../../../backend/surveys/survey.api";
import {
  useCreateSurveyLandingPageMutation,
  useLandingPage,
  useUpdateSurveyLandingPageMutation,
} from "../../../backend/surveys/surveys.query";

interface FormValues {
  title: string;
  surveys: Array<Object>;
}
const [FormProvider, useFormContext, useForm] = createFormContext<FormValues>();
let Languages = new Set(["English", "Malayalam", "Hindi", "Kannada", "Tamil"]);
export default function ShareLandingPageModal({
  open,
  close,
  surveyType,
  landingPageId,
}) {
  const {
    isError,
    isLoading,
    data: surveys,
  } = useQuery(["surveys"], getSurveys);

  //--------------get landing page details based on landing page id (prop)----------
  const {
    isLoading: isLandingPageLoading,
    error: LandingPageError,
    data: LandingPage,
  } = useLandingPage(landingPageId);
  //------------if survey data set survey data ---------
  useEffect(() => {
    if (surveys) {
      form.setValues(LandingPage);
    }
  }, [LandingPage]);

  let SurveyListData = [];

  if (Array.isArray(surveys)) {
    SurveyListData = surveys;
  }

  let teamSelectData = SurveyListData?.map((survey) => ({
    value: survey.id,
    label: survey.title,
  }));

  //------------type select data -----------
  const typesArray = ["web", "whatsapp"];
  let typeSelectData = typesArray.map((type) => ({
    value: type,
    label: type,
  }));

  const form = useForm({
    initialValues: {
      title: "",
      surveys: [],
    },
    validate: {
      title: (value) => (value.length ? null : "Cannot be empty"),
      surveys: (values) =>
        values.length ? null : "Must contain atleast one survey",
    },
  });

  const resetForm = () => {
    form.reset();
  };
  const [isCreating, setIsCreating] = useState(false);
  const createSurveyLandingMutation = useCreateSurveyLandingPageMutation({
    close,
    resetForm,
    setIsCreating,
  });
  const updateLandingMutation = useUpdateSurveyLandingPageMutation({
    close,
    resetForm,
    setIsCreating,
  });

  const onSubmit = (e) => {
    e.preventDefault();
    const validationRes = form.validate();
    if (validationRes.hasErrors) {
      console.error(validationRes.errors);
      return;
    }
    setIsCreating(true);

    if (LandingPage?.id) {
      //--------------updating landing page -------
      notifications.show({
        id: "load-data",
        loading: true,
        title: "Updating survey Landing page..",
        message: `Hold on, your survey landing page is getting updated...`,
        autoClose: false,
        withCloseButton: false,
      });
      updateLandingMutation.mutate(form.values);
    } else {
      //--------------creating new landing page--------------
      notifications.show({
        id: "load-data",
        loading: true,
        title: "Creating survey Landing page..",
        message: `Hold on, your survey landing page is getting created...`,
        autoClose: false,
        withCloseButton: false,
      });
      createSurveyLandingMutation.mutate(form.values);
    }
  };
  if (isLoading) {
    return null;
  }
  if (isError) {
    notifications.show({
      id: "load-data",
      color: "red",
      title: "Error",
      message: "Failed Loading teams!",
      icon: <IconX size="1rem" />,
      autoClose: 3000,
    });
  }
  return (
    <Modal
      opened={open}
      onClose={() => {
        close();
      }}
      title="Share Landing Page"
      size={"50%"}
      radius={"lg"}
      shadow="lg"
    >
      <Stack>
        <Paper p="md">
          <SimpleGrid spacing="xl">
            {/* //-----------------web survey share url ----------------- */}

            <Stack p="md" dir="row">
              <Title order={4}>Share Survey</Title>

              <CopyLinkComponent
                value={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/public/landing/${landingPageId}`}
              />
            </Stack>
          </SimpleGrid>
        </Paper>
      </Stack>
    </Modal>
  );
}

const CopyLinkComponent = ({ value }) => {
  return (
    <Flex style={{ flexDirection: "row", display: "flex", width: "100%" }}>
      <TextInput
        style={{ minWidth: "70%" }}
        readOnly
        value={value}
        pr="sm"
      ></TextInput>
      <CopyButton value={value}>
        {({ copied, copy }) => (
          <Button
            color={copied ? "dark" : "yellow.6"}
            onClick={copy}
            rightSection={<IconCopy />}
          >
            {copied ? "Copied url" : "Copy url"}
          </Button>
        )}
      </CopyButton>
    </Flex>
  );
};
