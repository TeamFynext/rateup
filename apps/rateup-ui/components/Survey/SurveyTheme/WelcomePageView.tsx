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
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import React from "react";
import { useEffect, useState, useRef } from "react";
import StylesComponent from "./StylesComponent";

function WelcomePageView({
  setSelectedType,
  currentStyles,
  setCurrentstyles,
  bgImage,
  selectedType,
}) {
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

  const getLogoUrl = () => {
    if (currentStyles?.logoUrlNotUploaded) {
      let url = URL.createObjectURL(currentStyles.logoUrlNotUploaded);
      return url;
    } else if (currentStyles?.logoUrl) {
      let url = `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${currentStyles.logoUrl}`;

      return url;
    }
  };
  const getBgUrl = () => {
    // if(currentStyles.bgType == "bgcolor")return null
    if (currentStyles?.bgUrlNotUploaded) {
      let url = URL.createObjectURL(currentStyles?.bgUrlNotUploaded);
      return url;
    } else if (currentStyles?.bgUrl) {
      let url = `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${currentStyles.bgUrl}`;
      return url;
    }
  };

  return (
    <Flex
      w={"100%"}
      bg="red"
      align={"center"}
      p={30}
      h="100%"
      style={
        currentStyles.bgType == "bgcolor" ? currentStyles?.bgStyles : bgTemp
      }
      onClick={(e) => {
        e.stopPropagation(), handleFocus("background");
      }}
    >
      <BackgroundImage
        style={{ height: "100%", width: "100%", objectFit: "contain" }}
        src={bgImage && currentStyles.bgType != "bgcolor" ? bgImage : ""}
      >
        <form style={{ width: "100%", height: "100%" }}>
          <Flex
            justify={"center"}
            align={"center"}
            h={"100%"}
            direction={"column"}
          >
            <Flex
              // bg={"gray"}
              onClick={(e) => {
                e.stopPropagation(), handleFocus("logo");
              }}
              p={5}
            >
              <Tooltip label="Logo">
                <Image
                  fit="contain"
                  src={getLogoUrl()}
                  alt=" Logo "
                  style={currentStyles?.logoStyles}
                />
              </Tooltip>
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
                placeholder={"Go to survey"}
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
                    minWidth: "150px",
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

export default WelcomePageView;
