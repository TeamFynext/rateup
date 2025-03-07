import React from "react";

import { Card, Divider, Group, Skeleton, Stack } from "@mantine/core";

import classes from "./styles.module.css";

const ChatSelectSkeletonCard = () => {
  return (
    <>
      <Card py={"xs"}>
        <Group py={2}>
          <Skeleton height={40} circle />
          <Stack className={classes.inner} flex={1}>
            <Group className={classes.chat_card_header}>
              <Skeleton height={20} width="70%" />
            </Group>
            <Group justify="space-between">
              <Skeleton height={20} width="20%" />
              <Skeleton height={20} width="20%" />
            </Group>
          </Stack>
        </Group>
      </Card>
      <Divider />
    </>
  );
};

export const ChatSelectSkeletonCardList = () => {
  return (
    <>
      {Array.from({ length: 7 }, (_, index) => (
        <ChatSelectSkeletonCard key={index} />
      ))}
    </>
  );
};

export default ChatSelectSkeletonCardList;
