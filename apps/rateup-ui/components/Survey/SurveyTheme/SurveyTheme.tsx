import {
  Stack,
  Flex,
  Switch,
  LoadingOverlay,
  Group,
  Badge,
  Title,
  Text,
} from "@mantine/core";
import React from "react";
import { useEffect, useState } from "react";
import StylesComponent from "./StylesComponent";
import {
  useCreateWelcomeThemeMutation,
  useUpdateWelcomeTheme,
  useWelcomeThemeBySurveyId,
} from "../../../backend/WelcomeTheme/welcometheme.query";
import { notifications } from "@mantine/notifications";
import defaultStyles from "./fontStyleComponents/DefaultTheme";
import WelcomePageView from "./WelcomePageView";
import { useEditSurveyMutation } from "../../../backend/surveys/surveys.query";
import { uploadFile } from "../../../utils/file-upload/upload";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import TabsCommon from "../../menu/landingPage/Tabs/TabsCommon";
import styles from "./SurveyTheme.module.css";

function SurveyTheme({ survey }) {
  const [selectedType, setSelectedType] = useState("header");
  const [IsLoading, setIsLoading] = useState(false);
  const [bgImage, setbgImage] = useState("");
  const [bgMobileImage, setbgMobileImage] = useState("");

  const [selectedTab, setSelectedTab] = useState("Web");
  const isMobileView = selectedTab !== "Web";

  const [currentStyles, setCurrentstyles] = useState({
    ...defaultStyles,
    logoUrlNotUploaded: "",
    bgUrlNotUploaded: "",
    mobileBgUrlNotUploaded: "",
  });
  const [saveLoading, setSaveLoading] = useState(false);

  //--------create welcome theme page-------------
  const createWelcomeThemeMutation = useCreateWelcomeThemeMutation({
    setIsLoading,
    setSaveLoading,
  });
  const updateWelcomeThemeMutation = useUpdateWelcomeTheme({
    setIsLoading,
    setSaveLoading,
  });
  //---------get saved styled by survey id -----------
  const { data: welcomeTheme } = useWelcomeThemeBySurveyId(survey?.id);

  useEffect(() => {
    if (welcomeTheme) {
      setCurrentstyles(welcomeTheme);
    }
  }, [welcomeTheme]);

  useEffect(() => {
    if (welcomeTheme?.bgUrl) {
      setbgImage(
        `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${welcomeTheme?.bgUrl}`,
      );
    }
  }, [welcomeTheme?.bgUrl]);

  useEffect(() => {
    if (welcomeTheme?.mobileBgUrl) {
      setbgMobileImage(
        `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${welcomeTheme?.mobileBgUrl}`,
      );
    }
  }, [welcomeTheme?.mobileBgUrl]);

  //----------------upload image file ------------
  const uploadImage = async (value) => {
    const fileKey = await uploadFile(value);
    if (typeof fileKey === "string") {
      return fileKey;
    }
  };

  //--------save the styles-----------
  const saveStyles = async (styles) => {
    setIsLoading(true);
    setSaveLoading(true);

    if (currentStyles?.logoUrlNotUploaded) {
      let logo = await uploadImage(currentStyles?.logoUrlNotUploaded);
      currentStyles.logoUrl = logo;
    }
    if (currentStyles?.bgUrlNotUploaded) {
      let logo = await uploadImage(currentStyles?.bgUrlNotUploaded);
      currentStyles.bgUrl = logo;
    }
    if (currentStyles?.mobileBgUrlNotUploaded) {
      let logo = await uploadImage(currentStyles?.mobileBgUrlNotUploaded);
      currentStyles.mobileBgUrl = logo;
    }

    if (currentStyles?.id) {
      //----------update styles-----
      notifications.show({
        id: "load-data",
        loading: true,
        title: "Updating theme",
        message: `Hold on, getting updated...`,
        autoClose: true,
        withCloseButton: false,
      });
      updateWelcomeThemeMutation.mutate(currentStyles);
    } else {
      //---------create new style-------------
      notifications.show({
        id: "create-survey-welcome",
        loading: true,
        title: "Creating theme",
        message: `Hold on, getting ready...`,
        autoClose: true,
        withCloseButton: false,
      });

      currentStyles.surveyId = survey?.id;
      createWelcomeThemeMutation.mutate(currentStyles);
    }
  };

  const editSurvey = useEditSurveyMutation(survey?.id);

  const handleSwitchChange = (e) => {
    // setIsLoading(true);
    editSurvey.mutate({ welcomePageEnabled: e.currentTarget.checked });
  };
  return (
    <Flex w={"100%"} h={"100%"} p={2} gap={5}>
      <PaperLayout style={{ flex: 0.7 }}>
        <Stack h="100%">
          <LoadingOverlay visible={IsLoading} overlayProps={{ blur: 2 }} />
          <Group justify="space-between" px={10} pb={10}>
            <Group>
              <Title order={2} c={"dimmed"}>
                Preview
              </Title>
              <TabsCommon
                tabHeading={["Web", "Mobile"]}
                radius={"lg"}
                value={selectedTab}
                onChange={(value) => setSelectedTab(value)}
              >
                <></>
              </TabsCommon>
            </Group>
            <Group>
              <Text>Status: </Text>
              <Badge color={survey?.welcomePageEnabled ? "green" : "red"}>
                {survey?.welcomePageEnabled ? "ENABLED" : "DISABLED"}
              </Badge>
            </Group>
          </Group>
          <Group justify="center" h="100%">
            <PaperLayout
              p={0}
              h={"100%"}
              mah={isMobileView ? 650 : 1000}
              w={isMobileView ? 300 : "100%"}
              mih={"60vh"}
            >
              <WelcomePageView
                setSelectedType={setSelectedType}
                selectedType={selectedType}
                currentStyles={currentStyles}
                setCurrentstyles={setCurrentstyles}
                bgImage={bgImage}
                bgMobileImage={bgMobileImage}
                isMobileView={isMobileView}
              />
            </PaperLayout>
          </Group>
        </Stack>
      </PaperLayout>
      <Stack
        style={{ flex: 0.3 }}
        ml="sm"
        className={styles["enable-btn-and-styles-comp-containers-parent-div"]}
      >
        <PaperLayout className={styles["enable-welcome-page-switch-container"]}>
          <Group justify="center">
            <Switch
              fw={400}
              size="lg"
              label="Enable Welcome page"
              checked={survey?.welcomePageEnabled}
              color="var(--tertiary-color)"
              onChange={handleSwitchChange}
            />
          </Group>
        </PaperLayout>

        <PaperLayout
          h={"100%"}
          className={styles["styles-component-container"]}
        >
          <StylesComponent
            selectedType={selectedType ? selectedType : "header"}
            saveStyles={saveStyles}
            currentStyles={currentStyles}
            setCurrentstyles={setCurrentstyles}
            saveLoading={saveLoading}
            setbgImage={setbgImage}
            setbgMobileImage={setbgMobileImage}
            setSelectedTab={setSelectedTab}
            selectedTab={selectedTab}
          />
        </PaperLayout>
      </Stack>
    </Flex>
  );
}

export default SurveyTheme;
