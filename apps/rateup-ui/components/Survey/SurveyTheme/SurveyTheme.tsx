import { Stack, Flex, Switch, LoadingOverlay } from "@mantine/core";
import React from "react";
import { useEffect, useState } from "react";
import StylesComponent from "./StylesComponent";
import {
  useCreateWelcomeThemeMutation,
  useUpdateWelcomeTheme,
  useWelcomeThemeBySurveyId,
} from "../../../backend/WelcomeTheme/welcometheme.query";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";

import defaultStyles from "./fontStyleComponents/DefaultTheme";
import WelcomePageView from "./WelcomePageView";
import { useEditSurveyMutation } from "../../../backend/surveys/surveys.query";
import { uploadFile } from "../../../utils/file-upload/upload";
import PaperLayout from "../../styled/Layouts/PaperLayout";
let isFirst = true;
function SurveyTheme({ survey }) {
  const [selectedType, setSelectedType] = useState("header");
  const [IsLoading, setIsLoading] = useState(false);
  const [bgImage, setbgImage] = useState("");
  const [currentStyles, setCurrentstyles] = useState({
    ...defaultStyles,
    logoUrlNotUploaded: "",
    bgUrlNotUploaded: "",
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
  const {
    isLoading,
    error,
    data: welocmeTheme,
  } = useWelcomeThemeBySurveyId(survey?.id);

  const queryClient = useQueryClient();

  let WebFont = undefined;
  useEffect(() => {
    (async () => {
      if (window) {
        WebFont = await import("webfontloader");
      }
    })();
  }, [window]);

  async function loadFont(fontFamily, callback) {
    if (window) {
      WebFont = await import("webfontloader");
      // Code that depends on the window object
      if (fontFamily) {
        await WebFont.load({
          google: {
            families: [fontFamily],
          },
          active: () => {
            callback();
          },
          inactive: () => {},
        });
      }
    }
  }

  useEffect(() => {
    if (welocmeTheme) {
      setCurrentstyles(welocmeTheme);
    }
  }, [welocmeTheme]);
  useEffect(() => {
    if (welocmeTheme?.bgUrl) {
      setbgImage(
        `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${welocmeTheme?.bgUrl}`,
      );
    }
  }, [welocmeTheme?.bgUrl]);

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

    //
  };

  const editSurvey = useEditSurveyMutation(survey?.id, setIsLoading);

  const handleSwitchChange = (e) => {
    // setIsLoading(true);
    editSurvey.mutate({ welcomePageEnabled: e.currentTarget.checked });
  };
  return (
    <Flex w={"100%"} h={"100%"} p={2} gap={5}>
      <PaperLayout style={{ flex: 0.7 }}>
        <Stack h="100%">
          <LoadingOverlay visible={IsLoading} overlayProps={{ blur: 2 }} />
          <Flex p={10}>
            <Switch
              label="Enable Welcome page"
              checked={survey?.welcomePageEnabled}
              color="dark"
              ml={"md"}
              mt={"md"}
              onChange={handleSwitchChange}
            />
          </Flex>

          <WelcomePageView
            setSelectedType={setSelectedType}
            selectedType={selectedType}
            currentStyles={currentStyles}
            setCurrentstyles={setCurrentstyles}
            bgImage={bgImage}
          />
        </Stack>
      </PaperLayout>
      <PaperLayout style={{ flex: 0.3 }}>
        <StylesComponent
          selectedType={selectedType ? selectedType : "header"}
          saveStyles={saveStyles}
          currentStyles={currentStyles}
          setCurrentstyles={setCurrentstyles}
          loadFont={loadFont}
          saveLoading={saveLoading}
          setbgImage={setbgImage}
        />
      </PaperLayout>
    </Flex>
  );
}

export default SurveyTheme;
