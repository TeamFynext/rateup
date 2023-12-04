import {
  Flex,
  TextInput,
  BackgroundImage,
  Image,
  Tooltip,
  Box,
  ActionIcon,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import React from "react";
import { useEffect, useState } from "react";
import classes from "./WelcomePage.module.css";
import { IconEdit } from "@tabler/icons-react";
import { lexend, lexend300 } from "../../../utils/fonts";

function WelcomePageView({
  setSelectedType,
  currentStyles,
  setCurrentstyles,
  bgImage,
  bgMobileImage,
  selectedType,
  isMobileView,
}) {
  const form = useForm({
    initialValues: {
      headerText: currentStyles.headerText,
      descText: currentStyles.descText,
      buttonText: currentStyles.buttonText,
    },
  });
  // //---------font laoding ---------------

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
      align={"center"}
      h="100%"
      style={
        currentStyles.bgType == "bgcolor" ? currentStyles?.bgStyles : bgTemp
      }
      onClick={(e) => {
        e.stopPropagation(), handleFocus("background");
      }}
      ff={lexend300.style.fontFamily}
    >
      <BackgroundImage
        className={classes.parentContainer}
        style={{ height: "100%", width: "100%", objectFit: "contain" }}
        src={
          (bgImage || bgMobileImage) && currentStyles.bgType != "bgcolor"
            ? isMobileView
              ? bgMobileImage
              : bgImage
            : ""
        }
      >
        <ActionIcon
          variant="default"
          size="md"
          radius="lg"
          onClick={(e) => {
            e.stopPropagation(), handleFocus("background");
          }}
          className={classes.actionIcon}
        >
          <IconEdit style={{ width: "70%", height: "70%" }} />
        </ActionIcon>
        <form style={{ width: "100%", height: "100%" }}>
          <Flex
            justify={"center"}
            align={"center"}
            h={"100%"}
            direction={"column"}
          >
            <Flex
              onClick={(e) => {
                e.stopPropagation(), handleFocus("logo");
              }}
              p={5}
            >
              <Tooltip label="Edit Logo">
                <Box className={classes.parentContainer}>
                  <ActionIcon
                    variant="default"
                    radius="lg"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation(), handleFocus("logo");
                    }}
                    className={classes.actionIcon}
                  >
                    <IconEdit style={{ width: "70%", height: "70%" }} />
                  </ActionIcon>

                  <Image
                    fit="contain"
                    src={getLogoUrl()}
                    alt="Logo"
                    fallbackSrc="https://www.freeiconspng.com/uploads/no-image-icon-4.png"
                    style={currentStyles?.logoStyles}
                  />
                </Box>
              </Tooltip>
            </Flex>

            {/* //---------------------------- */}

            <Tooltip label="Edit title">
              <Box className={classes.titleBox} mt={20}>
                <ActionIcon
                  variant="default"
                  radius="lg"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation(), handleFocus("header");
                  }}
                  className={classes.actionIcon}
                >
                  <IconEdit style={{ width: "70%", height: "70%" }} />
                </ActionIcon>
                <TextInput
                  className={lexend.className}
                  placeholder={"Welcome"}
                  variant="unstyled"
                  size="xxl"
                  name="headerText"
                  onClick={(e) => e.stopPropagation()}
                  onFocus={(e) => {
                    e.stopPropagation(), handleFocus("header");
                  }}
                  styles={{
                    input: {
                      ...currentStyles?.headerStyles,
                      fontFamily: "inherit",
                    },
                  }}
                  value={currentStyles.headerText}
                  onChange={handleChange}
                />
              </Box>
            </Tooltip>
            {/* //--------------------------- */}

            <TextInput
              className={lexend.className}
              onChange={handleChange}
              value={currentStyles.descText}
              placeholder={"Please fill the survey"}
              variant="unstyled"
              onClick={(e) => e.stopPropagation()}
              onFocus={(e) => {
                e.stopPropagation(), handleFocus("description");
              }}
              name="descText"
              styles={{
                input: {
                  ...currentStyles?.descStyles,
                  fontFamily: "inherit",
                },
              }}
              mt="lg"
              w={"80%"}
              ta={"center"}
            />

            <Box className={classes.buttonBox}>
              <Flex
                justify={"center"}
                p={10}
                mt={"10%"}
                style={currentStyles.buttonStyles}
                onClick={(e) => e.stopPropagation()}
              >
                <ActionIcon
                  variant="default"
                  size="sm"
                  radius="lg"
                  onClick={(e) => {
                    e.stopPropagation(), handleFocus("button");
                  }}
                  className={classes.actionIcon}
                >
                  <IconEdit style={{ width: "70%", height: "70%" }} />
                </ActionIcon>
                <TextInput
                  onChange={handleChange}
                  value={currentStyles.buttonText}
                  placeholder={"Start Survey"}
                  variant="unstyled"
                  name="buttonText"
                  size="xs"
                  onFocus={(e) => {
                    e.stopPropagation(), handleFocus("button");
                  }}
                  styles={{
                    input: {
                      color: "inherit",
                      fontSize: "18px",
                      textAlign: "center",
                      minWidth: "150px",
                      alignSelf: "center",
                      fontWeight: 500,
                      fontFamily: "inherit",
                    },
                  }}
                />
              </Flex>
            </Box>
          </Flex>
        </form>
      </BackgroundImage>
    </Flex>
  );
}

export default WelcomePageView;
