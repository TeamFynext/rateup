import {
  Button,
  Group,
  Modal,
  MultiSelect,
  Select,
  Stack,
  TextInput,
  Text,
  createStyles,
  Flex,
  ScrollArea,
} from "@mantine/core";
import { createFormContext } from "@mantine/form";
import { useQuery } from "@tanstack/react-query";
// import { getTeamsByUser } from "../../backend/team/team.api";
// import { useCreateSurveyMutation } from "../../backend/surveys/surveys.query";
import { IconX } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useEffect, useState } from "react";
import { getSurveys } from "../../../backend/surveys/survey.api";
import {
  useCreateSurveyLandingPageMutation,
  useLandingPage,
  useSurveys,
  useUpdateCompletedMutation,
  useUpdateSurveyLandingPageMutation,
} from "../../../backend/surveys/surveys.query";
import { getTeamsByUser } from "../../../backend/team/team.api";
import SurveyCardList from "../../../components/Survey/SurveyCardList";

interface FormValues {
  title: string;
  header: string;
  surveys: Array<Object>;
}
const [FormProvider, useFormContext, useForm] = createFormContext<FormValues>();
let Languages = new Set(["English", "Malayalam", "Hindi", "Kannada", "Tamil"]);

const useStyles = createStyles((theme) => ({
  customButton: {
    backgroundColor: "black",
    borderRadius: 8,
    color: "#fff",
    "&:hover": {
      backgroundColor: "black !important",
    },
  },
  cancelButton: {
    backgroundColor: "grey",
    borderRadius: 8,
    color: "#fff",
    "&:hover": {
      backgroundColor: "grey !important",
    },
  },
}));
export default function CreateSurveyLandingModal({
  open,
  close,
  surveyType,
  landingPageId,
  surveyIdArray,
  mergeSurvey,
}) {
  const {
    isError,
    isLoading,
    data: surveys
    ,
  } = useQuery(["surveys"], getSurveys);
  const { classes, theme } = useStyles();
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
  //------------if survey data set survey data ---------
  useEffect(() => {
    if (surveyIdArray) {
      form.setValues({ surveys: surveyIdArray });
    }
  }, [surveyIdArray]);

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
      header: "",
      surveys: [],
    },
    validate: {
      title: (value) => (value.length ? null : "Cannot be empty"),
      header: (value) => (value.length ? null : "Cannot be empty"),
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

  //-------------get selected surveys callback----------
  const getSelectedSurveys = (data) => {
    form.setValues({ surveys: data });
  };
  return (
    <Modal
      opened={open}
      onClose={() => {
        close();
        form.reset();
      }}
      title=" "
      centered
      size={"60%"}
      padding={"md"}
      radius={"lg"}
    >
      <Text
        sx={(theme) => ({
          fontFamily: `Greycliff CF, ${theme.fontFamily}`,
          fontWeight: 500,
          fontSize: 30,
        })}
      >
        Merge Your Surveys
      </Text>

      <FormProvider form={form}>
        <form onSubmit={onSubmit}>
          <Stack sx={{}} mt="xl">
            <TextInput
              placeholder="Enter Landing title"
              label="Title"
              withAsterisk
              size="md"
              radius={"md"}
              sx={{ padding: 5, borderRadius: 12 }}
              {...form.getInputProps("title")}
            />
            <TextInput
              placeholder="Enter Landing header"
              label="Header"
              withAsterisk
              size="md"
              radius={"md"}
              sx={{ padding: 5, borderRadius: 12 }}
              {...form.getInputProps("header")}
            />
            {/* {!mergeSurvey &&  <MultiSelect
              withAsterisk
              label="Surveys"
              placeholder="Search surveys"
              searchable
              // creatable
              maxDropdownHeight="110"
              // TODO: Add a user-level language list
              data={teamSelectData}
              {...form.getInputProps("surveys")}
            />} */}

            {/* //---------------survey card list view ------------ */}
            {!mergeSurvey && (
              <>
                <Text fw={500} >
                  Select surveys
                </Text>

                <ScrollArea w={"100%"} h={250} offsetScrollbars>
                  <SurveyCardList getSelectedSurveys={getSelectedSurveys} LandingPage={LandingPage}/>
                </ScrollArea>
              </>
            )}
            {/* //-----------------survey type ----------- */}
            {!surveyType && (
              <Select
                label="Type"
                placeholder="Select survey type"
                data={typeSelectData}
                withAsterisk
                {...form.getInputProps("type")}
              />
            )}
            <Group position="right" pt="xl" mt="lg">
              <Button
                className={classes.cancelButton}
                variant="subtle"
                onClick={close}
              >
                Cancel
              </Button>
              <Button
                className={classes.customButton}
                variant="filled"
                type="submit"
                loading={isCreating}
              >
                Merge
              </Button>
            </Group>
          </Stack>
        </form>
      </FormProvider>
    </Modal>
  );
}
