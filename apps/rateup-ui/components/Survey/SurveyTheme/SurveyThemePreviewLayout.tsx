import {
  Badge,
  Box,
  Group,
  LoadingOverlay,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import TabsCommon from "../../menu/landingPage/Tabs/TabsCommon";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { useContext } from "react";
import { PreviewTypeEnum, ThemeTabEnum } from "./SurveyTheme.enums";
import { SurveyThemeContext } from "./SurveyThemeContext";

interface SurveyThemePreviewLayoutProps {
  children: any;
  isLoading: boolean;
  themeType: ThemeTabEnum;
  survey: any;
}

export default function SurveyThemePreviewLayout({
  children,
  isLoading,
  themeType,
  survey,
}: SurveyThemePreviewLayoutProps) {
  const { mobileOrDesktop, setMobileOrDesktop } =
    useContext(SurveyThemeContext);
  return (
    <Stack h="100%" w={"100%"}>
      <LoadingOverlay visible={isLoading} overlayProps={{ blur: 2 }} />
      <Group justify="space-between" px={10} pb={10}>
        <Group>
          <Title order={2} c={"dimmed"}>
            Preview
          </Title>
          <TabsCommon
            tabHeading={[PreviewTypeEnum.DESKTOP, PreviewTypeEnum.MOBILE]}
            radius={"lg"}
            value={mobileOrDesktop}
            onChange={(value: string) =>
              setMobileOrDesktop(value as PreviewTypeEnum)
            }
          >
            <></>
          </TabsCommon>
        </Group>
        {themeType === ThemeTabEnum.WELCOME && (
          <Group>
            <Text>Status: </Text>
            <Badge color={survey?.welcomePageEnabled ? "green" : "red"}>
              {survey?.welcomePageEnabled ? "ENABLED" : "DISABLED"}
            </Badge>
          </Group>
        )}
      </Group>
      <Box
        style={{
          display: "flex",
          justifyContent: "center",
        }}
        h={"100%"}
      >
        <PaperLayout
          p={0}
          h={"100%"}
          mah={mobileOrDesktop === PreviewTypeEnum.MOBILE ? 650 : 1000}
          w={mobileOrDesktop === PreviewTypeEnum.MOBILE ? 380 : "100%"}
        >
          {children}
        </PaperLayout>
      </Box>
    </Stack>
  );
}
