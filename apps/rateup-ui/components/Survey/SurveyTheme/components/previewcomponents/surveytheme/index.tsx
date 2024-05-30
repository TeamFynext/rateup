import {
  BackgroundImage,
  Badge,
  Box,
  Button,
  Flex,
  Group,
  Image,
  MantineProvider,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { createContext, useContext, useEffect, useState } from "react";
import { CurrentResponsesContext } from "../../../../../../context/ResponseContext";
import SelectedLanguageContext from "../../../../../../context/SelectedLanguage";
import { surveyUploadsPath } from "../../../../../../utils/constants";
import { lexend, lexend300 } from "../../../../../../utils/fonts";
import { CreditsCard } from "../../../../../Card/CreditsCard";
import QuestionTypePreview from "../../../../Question/Previews/QuestionTypePreview";
import { questionTypeEnumArray } from "../../../SurveyTheme.constants";
import { PreviewTypeEnum } from "../../../SurveyTheme.enums";
import classes from "../../../SurveyTheme.module.css";
import { getFeaturesBasedOnQuestionType } from "../../../SurveyTheme.utils";
import {
  useSelectedPreview,
  useSurveyThemeContextValue,
} from "../../../SurveyThemeContext";
import NextPrevPreview from "./NextPrevPreview";
import _ from "lodash";
import { TakeSurveyLayoutWeb } from "../../../../../Layout/TakeSurveyLayout/TakeSurveyLayoutWeb";
import TakeSurvey from "../../../../TakeSurvey/TakeSurveyComponent";
import styles from "./SurveyThemePreview.module.css";
import IsSurveyThemePreviewContextProvider from "./isSurveyThemePreveiwContext";

function SurveyThemeView({ survey }) {
  const surveyTheme = useSurveyThemeContextValue();
  const surveyCopy = _.cloneDeep(survey);
  surveyCopy.webSurveyTheme.theme = surveyTheme;

  return (
    <Box className={styles["survey-theme-preview-container"]}>
      <IsSurveyThemePreviewContextProvider value={true}>
        <TakeSurveyLayoutWeb survey={surveyCopy}>
          <TakeSurvey
            survey={surveyCopy}
            setIsReviewPage={false}
            fromShortUrl={true}
          />
        </TakeSurveyLayoutWeb>
      </IsSurveyThemePreviewContextProvider>
    </Box>
  );
}

export default SurveyThemeView;

// export default function SurveyThemeView() {
//   const surveyTheme = useSurveyThemeContextValue();
//   const selectedPreview = useSelectedPreview();
//   const selectedLanguage = useContext(SelectedLanguageContext).selectedLanguage;
//   const { surveyTheme: _surveyTheme } = surveyTheme;
//   const [currentQuestionTypeCount, setCurrentQuestionTypeCount] = useState(0);
//   const [currentResponse, updateResponse] = useState(null || []);

//   //here subtitle, title and label are not customisable, its only added to preserve the consistency of the schema and ease of implementation.
//   const {
//     bg: { desktopBg: { imageUrl: desktopBgImgUrl, desktopBgColor }, mobileBg: { imageUrl: mobileBgImgUrl, mobileBgColor }, unsplashImage },
//     title: { styles: titleStyles, title, subtitleFontSize },
//     button: { styles: buttonStyles, label },
//     input: { primaryColor },
//     logo: orgLogoStylesObj,
//   } = _surveyTheme;

//   let orgLogoStylesObject = orgLogoStylesObj;
//   if (!orgLogoStylesObject) {
//     orgLogoStylesObject = {
//       logo: "",
//       styles: {
//         width: 50,
//         height: 50,
//       },
//     };
//   }
//   const { logo: orgLogo, styles: orgLogoStyles } = orgLogoStylesObject;
//   const [orgLogoSrc, setOrgLogoSrc] = useState("");
//   useEffect(() => {
//     let src = null;
//     if ((orgLogo as any) instanceof File) {
//       src = URL.createObjectURL(orgLogo as any);
//     } else if (typeof orgLogo === "string" && orgLogo.length) {
//       src = orgLogo;
//     }
//     setOrgLogoSrc(src);
//     () => {
//       URL.revokeObjectURL(orgLogoSrc);
//     };
//   }, [orgLogo]);

//   const backgroundImageSrc =
//     selectedPreview === PreviewTypeEnum.DESKTOP ? desktopBgImgUrl : mobileBgImgUrl;

//   const backgroundColor =
//     selectedPreview === PreviewTypeEnum.DESKTOP ? desktopBgColor : mobileBgColor;

//   return (
//     <Flex
//       align={"center"}
//       h="100%"
//       style={{ backgroundColor }}
//       ff={lexend300.style.fontFamily}
//     >
//       <CreditsCard
//         enableCredits={backgroundImageSrc?.startsWith(
//           "https://images.unsplash.com",
//         )}
//         url={backgroundImageSrc}
//       >
//         <BackgroundImage
//           className={classes.parentContainer}
//           style={{ height: "100%", width: "100%", objectFit: "contain" }}
//           src={backgroundImageSrc}
//         >
//           <Flex
//             h={"100%"}
//             direction={"column"}
//             ff={lexend.style.fontFamily}
//             justify={"center"}
//             gap={"2rem"}
//           >
//             {orgLogoSrc && (
//               <Image
//                 src={orgLogoSrc}
//                 style={{ ...orgLogoStyles, alignSelf: "center" }}
//                 alt="logo"
//               />
//             )}

//             <Box className={classes.titleBox} w={"fit-content"}>
//               <Text style={titleStyles}>Why is the sky blue?</Text>
//               <Text
//                 c={titleStyles?.color}
//                 style={{ fontSize: subtitleFontSize ?? 16 }}
//               >
//                 This classic question is often asked by curious minds.
//               </Text>
//             </Box>
//             <Stack align="center" style={{ flex: 1 }} mt={"lg"}>
//               <ScrollArea
//                 offsetScrollbars
//                 scrollbarSize={5}
//                 m="auto"
//                 style={{
//                   width: "100%",
//                   maxHeight: "220px",
//                 }}
//                 p={"xs"}
//               >
//                 <MantineProvider
//                   theme={{
//                     colors: {
//                       // @ts-ignore
//                       primaryColor: Array(10).fill(
//                         primaryColor === "rateup-blue" || !primaryColor
//                           ? "#1C518E"
//                           : primaryColor,
//                       ),
//                     },
//                     primaryColor: "primaryColor",
//                   }}
//                 >
//                   <CurrentResponsesContext.Provider
//                     value={{ response: currentResponse, updateResponse }}
//                   >
//                     <QuestionTypePreview
//                       choices={[1, 2, 3, 4]}
//                       features={getFeaturesBasedOnQuestionType(
//                         selectedLanguage,
//                         questionTypeEnumArray[currentQuestionTypeCount],
//                       )}
//                       type={questionTypeEnumArray[currentQuestionTypeCount]}
//                       tnc={{
//                         title: "I agree",
//                         content:
//                           "Terms & conditions.... \n conditions 1....\n conditions 3.... \n conditions 3....",
//                         urlTitle: "terms and conditions",
//                       }}
//                     />
//                   </CurrentResponsesContext.Provider>
//                 </MantineProvider>
//               </ScrollArea>
//               <Group mt="auto" justify="right" w={"100%"} align="center">
//                 <Badge color={`${primaryColor}`}>
//                   {questionTypeEnumArray[currentQuestionTypeCount]}
//                 </Badge>
//                 <Group>
//                   <Button
//                     variant="white"
//                     radius={"xl"}
//                     disabled={currentQuestionTypeCount === 0}
//                     onClick={() => {
//                       if (currentQuestionTypeCount === 0) return;
//                       setCurrentQuestionTypeCount(currentQuestionTypeCount - 1);
//                       updateResponse(null);
//                     }}
//                   >
//                     <IconChevronLeft />
//                   </Button>

//                   <Button
//                     variant="white"
//                     radius={"xl"}
//                     disabled={
//                       currentQuestionTypeCount ===
//                       questionTypeEnumArray.length - 1
//                     }
//                     onClick={() => {
//                       if (
//                         currentQuestionTypeCount ===
//                         questionTypeEnumArray.length - 1
//                       )
//                         return;
//                       setCurrentQuestionTypeCount(currentQuestionTypeCount + 1);
//                       updateResponse(null);
//                     }}
//                   >
//                     <IconChevronRight />
//                   </Button>
//                 </Group>
//               </Group>
//             </Stack>
//             <NextPrevPreview
//               isMobile={selectedPreview === PreviewTypeEnum.MOBILE}
//               buttonStyles={buttonStyles}
//             />
//           </Flex>
//         </BackgroundImage>
//       </CreditsCard>
//     </Flex>
//   );
// }
