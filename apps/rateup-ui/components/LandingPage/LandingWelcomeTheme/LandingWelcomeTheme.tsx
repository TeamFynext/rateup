import {
  Box,
  Group,
  Loader,
  Select,
  Stack,
  Tabs,
  Title,
  Space,
  Paper,
  Flex,
  Text,
  TextInput,
  Card,
  BackgroundImage,
  Notification,
  Image,
  Switch,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import React from "react";
import { useEffect, useState, useRef } from "react";

import {
  useCreateWelcomeThemeMutation,
  useUpdateWelcomeTheme,
  useWelcomeThemeBySurveyId,
} from "../../../backend/WelcomeTheme/welcometheme.query";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";
import defaultStyles from "../../Survey/SurveyTheme/fontStyleComponents/DefaultTheme";
import WelcomePageView from "../../Survey/SurveyTheme/WelcomePageView";
import StylesComponent from "../../Survey/SurveyTheme/StylesComponent";
import {
  useCreateLandingWelcomeThemeMutation,
  useUpdateLandingWelcomeTheme,
  uselandingWelcomeThemeByLandingId,
} from "../../../backend/LandingWelcomeTheme/LandingWelcomeTheme.query";
import { useUpdateSurveyLandingPageMutation } from "../../../backend/surveys/surveys.query";
import { useEditLandingPageMutation } from "../../../backend/LandingPage/landingpage.query";
import { uploadFile } from "../../../utils/file-upload/upload";

function LandingWelcomeTheme({ LandingPageData, LandingId }) {
  const [selectedType, setSelectedType] = useState("header");
  const [IsLoading, setIsLoading] = useState(false);
  const [currentStyles, setCurrentstyles] = useState({
    ...defaultStyles,
    logoUrlNotUploaded: "",
    bgUrlNotUploaded: "",
  });
  const [saveLoading, setSaveLoading] = useState(false);
  const [bgImage, setbgImage] = useState("");
  //--------create welcome theme page-------------
  const createWelcomeThemeMutation = useCreateLandingWelcomeThemeMutation({
    setIsLoading,
    setSaveLoading,
  });
  const updateWelcomeThemeMutation = useUpdateLandingWelcomeTheme({
    setIsLoading,
    setSaveLoading,
  });
  //---------get saved styled by survey id -----------
  const {
    isLoading,
    error,
    data: welocmeTheme,
  } = uselandingWelcomeThemeByLandingId(LandingId);

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
        `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${welocmeTheme?.bgUrl}`
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
        id: "create-landing-welcome",
        loading: true,
        title: "Creating theme",
        message: `Hold on, getting ready...`,
        autoClose: true,
        withCloseButton: false,
      });

      currentStyles.landingId = LandingId;
      createWelcomeThemeMutation.mutate(currentStyles);
    }

    //
  };

  const editSurvey = useEditLandingPageMutation(LandingId, setIsLoading);

  const handleSwitchChange = (e) => {
    editSurvey.mutate({ welcomePageEnabled: e.currentTarget.checked });
  };

  return (
    <Flex gap={20}>
      <Paper sx={{ flex: 5 }} shadow="xl">
        <Flex mb={10} p={10}>
          {" "}
          <Switch
            label="Enable Welcome page"
            checked={LandingPageData?.welcomePageEnabled}
            color="dark"
            onChange={handleSwitchChange}
          />{" "}
        </Flex>
        <WelcomePageView
          setSelectedType={setSelectedType}
          currentStyles={currentStyles}
          setCurrentstyles={setCurrentstyles}
          bgImage={bgImage}
          selectedType={selectedType}
        />
      </Paper>

      <Paper p={"xl"} sx={{ flex: 2 }} shadow="lg" radius="lg">
        <StylesComponent
          selectedType={selectedType ? selectedType : "header"}
          saveStyles={saveStyles}
          currentStyles={currentStyles}
          setCurrentstyles={setCurrentstyles}
          loadFont={loadFont}
          saveLoading={saveLoading}
          setbgImage={setbgImage}
        />
      </Paper>
    </Flex>
  );
}

export default LandingWelcomeTheme;
