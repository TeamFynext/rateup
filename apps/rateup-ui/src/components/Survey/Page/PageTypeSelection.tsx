import { Button, Flex, Grid, Group, Stack, Text, Title, Tooltip } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { PageType, SubscriptionFeaturePathName } from "@/types/enums.ts";
import { BasicPages, uniquePages } from "@/utils/constants.ts";
import { getPageTypeLabel } from "@/utils/enums/index.ts";
import { hasFeature } from "@/utils/subscription/subscription.ts";

import { pageIcons } from "./PageIcons.ts";

import classes from "../Question/QuestionDetailedView.module.css";

const PageTypeSelection = ({ handleTypeSelection, questions, subscription }) => {
  const handleQuestionTypeClick = (type) => {
    handleTypeSelection(type);
  };
  const { t: translations } = useTranslation();
  const QuestionButton = ({ type, subscription }) => {
    const Icon = pageIcons[type];
    return (
      <Tooltip
        label={translations("Upgrade Rateup Plan")}
        withArrow
        color="yellow"
        disabled={
          !(
            type === PageType.Custom &&
            !hasFeature(subscription, SubscriptionFeaturePathName.HTMLCodePage)
          )
        }
      >
        <Button
          key={type}
          size="lg"
          leftSection={<Icon size={"1rem"} />}
          variant={"default"}
          className={classes.questionTypeButton}
          onClick={() => handleQuestionTypeClick(type as PageType)}
          disabled={(() => {
            if (type === PageType.Custom) {
              return hasFeature(subscription, SubscriptionFeaturePathName.HTMLCodePage)
                ? false
                : true;
            } else {
              return (
                questions?.filter((q) => q.type === type).length > 0 && uniquePages.includes(type)
              );
            }
          })()}
        >
          <Text fz={14}>{getPageTypeLabel(type)}</Text>
        </Button>
      </Tooltip>
    );
  };
  return (
    <Flex direction={"column"}>
      <Stack gap={"md"}>
        <Stack gap={"sm"}>
          <Group justify="space-between">
            <Title order={4} c="dimmed">
              {translations("Basic Pages")}
            </Title>
          </Group>

          <Grid px={"lg"}>
            {BasicPages?.map((type, index) => {
              return (
                <Grid.Col span="content" key={index} p={"sm"}>
                  <QuestionButton type={type} subscription={subscription} />
                </Grid.Col>
              );
            })}
          </Grid>
        </Stack>
      </Stack>
    </Flex>
  );
};

export default PageTypeSelection;
