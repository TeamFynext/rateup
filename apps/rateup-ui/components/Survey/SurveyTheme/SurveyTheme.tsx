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
} from "@mantine/core";
import { useForm } from "@mantine/form";
import React from "react";
import { useEffect, useState, useRef } from "react";
import StylesComponent from "./StylesComponent";
import {
  useCreateWelcomeThemeMutation,
  useUpdateWelcomeTheme,
  useWelcomeThemeBySurveyId,
} from "../../../backend/WelcomeTheme/welcometheme.query";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";

import defaultStyles from "./fontStyleComponents/DefaultTheme";
function SurveyTheme({ survey }) {
  const [selectedType, setSelectedType] = useState("header");
  const [IsLoading, setIsLoading] = useState(false);
  const [currentStyles, setCurrentstyles] = useState(defaultStyles);

  //--------create welcome theme page-------------
  const createWelcomeThemeMutation = useCreateWelcomeThemeMutation({
    setIsLoading,
  });
  const updateWelcomeThemeMutation = useUpdateWelcomeTheme({
    setIsLoading,
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

  //--------save the styles-----------
  const saveStyles = (styles) => {
    setIsLoading(true);
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

      currentStyles.surveyId = survey?.id;
      createWelcomeThemeMutation.mutate(currentStyles);
    }

    //
  };

  return (
    <Flex gap={20}>
      <Paper sx={{ flex: 5 }} shadow="xl">
        <WelcomPageView
          setSelectedType={setSelectedType}
          currentStyles={currentStyles}
          setCurrentstyles={setCurrentstyles}
        />
      </Paper>

      <Paper p={"xl"} sx={{ flex: 2 }} shadow="lg" radius="lg">
        <StylesComponent
          selectedType={selectedType ? selectedType : "header"}
          saveStyles={saveStyles}
          currentStyles={currentStyles}
          setCurrentstyles={setCurrentstyles}
          loadFont={loadFont}
        />
      </Paper>
    </Flex>
  );
}

export default SurveyTheme;

function WelcomPageView({
  setSelectedType,

  currentStyles,
  setCurrentstyles,
}): JSX.Element {
  const form = useForm({
    initialValues: {
      headerText: currentStyles.headerText,
      descText: currentStyles.descText,
      buttonText: currentStyles.buttonText,
    },
  });
  const [focusedInput, setFocusedInput] = useState(null);

  useEffect(() => {
    loadFont(currentStyles?.descStyles?.fontFamily);
  }, [currentStyles?.descStyles?.fontFamily]);
  useEffect(() => {
    loadFont(currentStyles?.headerStyles?.fontFamily);
  }, [currentStyles?.headerStyles?.fontFamily]);
  useEffect(() => {
    loadFont(currentStyles?.buttonStyles?.fontFamily);
  }, [currentStyles?.buttonStyles?.fontFamily]);
  // //---------font laoding ---------------
  let WebFont = undefined;
  useEffect(() => {
    (async () => {
      if (window) {
        WebFont = await import("webfontloader");
      }
    })();
  }, [window]);

  async function loadFont(fontFamily) {
    if (window) {
      WebFont = await import("webfontloader");
      // Code that depends on the window object
      if (fontFamily) {
        await WebFont.load({
          google: {
            families: [fontFamily],
          },
          active: () => {
            // callback();
          },
          inactive: () => {},
        });
      }
    }
  }

  useEffect(() => {
    setCurrentstyles({
      ...currentStyles,
      headerText: form.values.headerText,
      descText: form.values.descText,
      buttonText: form.values.buttonText,
    });
  }, [form.values]);

  //----------handle input text focus----------
  const handleFocus = (name?: String) => {
    setSelectedType(name);
  };

  const [Texts, setTexts] = useState({
    headerText: currentStyles.headerText,
    descText: currentStyles.descText,
    buttonText: currentStyles.descText,
  });

  useEffect(() => {
    setTexts({
      headerText: currentStyles.headerText,
      descText: currentStyles.descText,
      buttonText: currentStyles.descText,
    });
  }, [currentStyles]);

  //------------handle change-------------
  const handleChange = (e) => {
    const { name, value } = e.target;
    setCurrentstyles({ ...currentStyles, [name]: value });
  };
  const bgTemp = {
    backgroundColor: "#fff",
  };
  return (
    <Flex
      w={"100%"}
      align={"center"}
      h={"75vh"}
      p={30}
      style={
        currentStyles.bgType == "bgcolor" ? currentStyles?.bgStyles : bgTemp
      }
      onClick={(e) => {
        e.stopPropagation(), handleFocus("background");
      }}
    >
      <BackgroundImage
        style={{ height: "100%", width: "100%", objectFit: "contain" }}
        src={
          currentStyles.bgUrl && currentStyles.bgType != "bgcolor"
            ? `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${currentStyles.bgUrl}`
            : ""
        }
      >
        <form style={{ width: "100%", height: "100%" }}>
          <Flex
            justify={"center"}
            align={"center"}
            h={"100%"}
            direction={"column"}
          >
            {/* <Text>{focusedInput}</Text> */}

            <Flex
              // bg={"gray"}
              onClick={(e) =>{ e.stopPropagation(),handleFocus("logo")}}
              
              p={10}
            >
              <Image
                // pb={30}
              
                fit="contain"
                src={
                  currentStyles.logoUrl 
                    ? `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${currentStyles.logoUrl}`
                    : ""
                }
                alt=" Logo "
                style={currentStyles?.logoStyles}
              />
            </Flex>

            {/* //---------------------------- */}
            <TextInput
              placeholder={"Welcome"}
              variant="unstyled"
              size="xxl"
              name="headerText"
              mt={20}
              onClick={(e) => e.stopPropagation()}
              onFocus={(e) => {
                e.stopPropagation(), handleFocus("header");
              }}
              styles={{
                input: currentStyles?.headerStyles,
              }}
              value={currentStyles.headerText}
              onChange={handleChange}
            />
            {/* //--------------------------- */}
            <TextInput
              onChange={handleChange}
              value={currentStyles.descText}
              placeholder={"Please fil the survey"}
              variant="unstyled"
              onClick={(e) => e.stopPropagation()}
              onFocus={(e) => {
                e.stopPropagation(), handleFocus("description");
              }}
              name="descText"
              styles={{
                input: currentStyles?.descStyles,
              }}
              mt="lg"
              w={"80%"}
              ta={"center"}
            />

            <Flex
              justify={"center"}
              p={10}
              mt={"10%"}
              style={currentStyles.buttonStyles}
              onClick={(e) => e.stopPropagation()}
            >
              <TextInput
                onChange={handleChange}
                value={currentStyles.buttonText}
                placeholder={"Welcome"}
                variant="unstyled"
                name="buttonText"
                size="xs"
                onFocus={(e) => {
                  e.stopPropagation(), handleFocus("button");
                }}
                styles={{
                  input: {
                    color: "#fff",
                    fontSize: "18px",
                    textAlign: "center",
                    width: "150px",
                    alignSelf: "center",
                    fontWeight: 500,
                    fontFamily: currentStyles?.buttonStyles?.fontFamily
                      ? currentStyles?.buttonStyles?.fontFamily
                      : "Montserrat",
                  },
                }}
              />
            </Flex>
          </Flex>
        </form>
      </BackgroundImage>
    </Flex>
  );
}
