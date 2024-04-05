import { useContext } from "react";
import { SurveyThemeContext } from "../../../SurveyThemeContext";
import { PreviewTypeEnum, SelectedItemEnum } from "../../../SurveyTheme.enums";
import {
  ActionIcon,
  BackgroundImage,
  Box,
  Flex,
  Image,
  TextInput,
  Textarea,
  Tooltip,
} from "@mantine/core";
import { lexend, lexend300 } from "../../../../../../utils/fonts";
import { IconEdit } from "@tabler/icons-react";
import classes from "../../../SurveyTheme.module.css";
import { getImageUrl } from "../../../SurveyTheme.utils";
import Confetti from "react-confetti";
import { useElementSize } from "@mantine/hooks";
import { produce } from "immer";
import { dummyImage } from "../../../SurveyTheme.constants";
import { CreditsCard } from "../../../../../Card/CreditsCard";
export default function ThankyouPageThemeView({
  selectedType,
  setSelectedType,
}) {
  const { surveyTheme, setSurveyTheme, mobileOrDesktop } =
    useContext(SurveyThemeContext);
  const { thankyouTheme } = surveyTheme;
  const { ref, width, height } = useElementSize();
  const {
    bg: { styles, desktopbg, mobilebg, unsplashImage },
    logo: { styles: logoStyles, logo },
    subtitle: { styles: subtitleStyles, subtitle },
    title: { styles: titleStyles, title },
    confettiEnabled,
  } = thankyouTheme;
  function updateThemeText(key: string, value: any) {
    setSurveyTheme(
      produce((draft) => {
        draft.thankyouTheme[key] = value;
      }),
    );
  }
  return (
    <Flex
      align={"center"}
      h="100%"
      style={styles}
      onClick={(e) => {
        e.stopPropagation(), setSelectedType(SelectedItemEnum.BACKGROUND);
      }}
      ff={lexend300.style.fontFamily}
    >
      <CreditsCard
        enableCredits={unsplashImage?.[mobileOrDesktop]}
        url={
          mobileOrDesktop === PreviewTypeEnum.DESKTOP
            ? encodeURI(desktopbg)
            : encodeURI(mobilebg)
        }
      >
        <BackgroundImage
          ref={ref}
          className={classes.parentContainer}
          style={{ height: "100%", width: "100%", objectFit: "contain" }}
          src={getImageUrl(
            mobileOrDesktop === PreviewTypeEnum.DESKTOP ? desktopbg : mobilebg,
            unsplashImage?.[mobileOrDesktop],
          )}
        >
          {confettiEnabled && <Confetti width={width} height={height} />}
          <ActionIcon
            variant="default"
            size="md"
            radius="lg"
            onClick={(e) => {
              e.stopPropagation(), setSelectedType(SelectedItemEnum.BACKGROUND);
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
                  e.stopPropagation(), setSelectedType(SelectedItemEnum.LOGO);
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
                        e.stopPropagation(),
                          setSelectedType(SelectedItemEnum.LOGO);
                      }}
                      className={classes.actionIcon}
                    >
                      <IconEdit style={{ width: "70%", height: "70%" }} />
                    </ActionIcon>

                    <Image
                      fit="contain"
                      src={getImageUrl(logo) ?? dummyImage}
                      alt="Logo"
                      fallbackSrc="https://www.freeiconspng.com/uploads/no-image-icon-4.png"
                      style={logoStyles}
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
                      e.stopPropagation(),
                        setSelectedType(SelectedItemEnum.TITLE);
                    }}
                    className={classes.actionIcon}
                  >
                    <IconEdit style={{ width: "70%", height: "70%" }} />
                  </ActionIcon>
                  <TextInput
                    className={lexend.className}
                    placeholder={"Thankyou"}
                    variant="unstyled"
                    size="xxl"
                    name="headerText"
                    onClick={(e) => e.stopPropagation()}
                    onFocus={(e) => {
                      e.stopPropagation();
                      setSelectedType(SelectedItemEnum.TITLE);
                    }}
                    styles={{
                      input: {
                        ...titleStyles,
                        height: "fit-content",
                        fontFamily: "inherit",
                      },
                    }}
                    value={title}
                    onChange={(e) =>
                      updateThemeText("title", {
                        ...thankyouTheme.title,
                        title: e.target.value,
                      })
                    }
                  />
                </Box>
              </Tooltip>
              {/* //--------------------------- */}
              <Tooltip label="Edit subtitle">
                <Box className={classes.titleBox} mt={20} w={"50%"}>
                  <ActionIcon
                    variant="default"
                    radius="lg"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation(),
                        setSelectedType(SelectedItemEnum.SUBTITLE);
                    }}
                    className={classes.actionIcon}
                  >
                    <IconEdit style={{ width: "70%", height: "70%" }} />
                  </ActionIcon>
                  <Textarea
                    className={lexend.className}
                    onChange={(e) =>
                      updateThemeText("subtitle", {
                        ...thankyouTheme.subtitle,
                        subtitle: e.target.value,
                      })
                    }
                    value={subtitle}
                    placeholder={"Please fill the survey"}
                    variant="unstyled"
                    onClick={(e) => e.stopPropagation()}
                    onFocus={(e) => {
                      e.stopPropagation(),
                        setSelectedType(SelectedItemEnum.SUBTITLE);
                    }}
                    name="descText"
                    styles={{
                      input: {
                        ...subtitleStyles,
                        fontFamily: "inherit",
                      },
                    }}
                    mt="lg"
                    ta={"center"}
                  />
                </Box>
              </Tooltip>
            </Flex>
          </form>
        </BackgroundImage>
      </CreditsCard>
    </Flex>
  );
}
