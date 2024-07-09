import { Button, Flex, Grid, Group, Stack, Text, Title } from "@mantine/core";
import React from "react";
import { PageType } from "../../../types/enums";
import { IconFileInfo, IconNotebook, IconPageBreak } from "@tabler/icons-react";
import classes from "./QuestionDetailedView.module.css";
import { getPageTypeLabel } from "../../../utils/enums";
import { BasicPages } from "../../../utils/constants";

const PageTypeSelection = ({ handleTypeSelection }) => {
  const handleQuestionTypeClick = (type) => {
    handleTypeSelection(type);
  };
  const QuestionButton = ({ type }) => {
    const Icon = questionIcons[type];
    return (
      <Button
        key={type}
        size="lg"
        leftSection={<Icon size={"1rem"} />}
        variant={"default"}
        className={classes.questionTypeButton}
        p={15}
        onClick={() => handleQuestionTypeClick(type as PageType)}
      >
        <Text fz={14}>{getPageTypeLabel(type)}</Text>
      </Button>
    );
  };
  return (
    <Flex direction={"column"} h={"100%"}>
      <Stack
        gap={"md"}
        style={{
          flex: 1,
          overflowY: "auto",
        }}
      >
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

const questionIcons = {
  [PageType.Welcome]: IconNotebook,
  [PageType.Custom]: IconFileInfo,
  [PageType.ThankYou]: IconPageBreak,
};
