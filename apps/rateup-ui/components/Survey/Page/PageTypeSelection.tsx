import React from "react";

import { Button, Flex, Grid, Group, Stack, Text, Title } from "@mantine/core";

import { PageType } from "../../../types/enums";
import { BasicPages, uniquePages } from "../../../utils/constants";
import { getPageTypeLabel } from "../../../utils/enums";
import { pageIcons } from "../Page/PageIcons";
import classes from "../Question/QuestionDetailedView.module.css";

interface iProps {
  questions: Question[];
  handleTypeSelection: (type: PageType) => void;
}
const PageTypeSelection = ({ handleTypeSelection, questions }) => {
  const handleQuestionTypeClick = (type) => {
    handleTypeSelection(type);
  };
  const QuestionButton = ({ type }) => {
    const Icon = pageIcons[type];
    return (
      <Button
        key={type}
        size="lg"
        leftSection={<Icon size={"1rem"} />}
        variant={"default"}
        className={classes.questionTypeButton}
        onClick={() => handleQuestionTypeClick(type as PageType)}
        disabled={
          questions?.filter((q) => q.type === type).length > 0 &&
          uniquePages.includes(type)
        }
      >
        <Text fz={14}>{getPageTypeLabel(type)}</Text>
      </Button>
    );
  };
  return (
    <Flex direction={"column"}>
      <Stack gap={"md"}>
        <Stack gap={"sm"}>
          <Group justify="space-between">
            <Title order={4} c="dimmed">
              Basic Pages
            </Title>
          </Group>

          <Grid px={"lg"}>
            {BasicPages?.map((type, index) => {
              return (
                <Grid.Col span="content" key={index} p={"sm"}>
                  <QuestionButton type={type} />
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
