import React from "react";
import { Paper, Loader, Flex } from "@mantine/core";
const Loading = ({ h }: { h?: number }) => {
  return (
    <Paper p="md">
      <Flex
        gap="md"
        mih={h}
        justify="center"
        align="center"
        direction="column"
        wrap="wrap"
      >
        <Loader type="bars" />
        <p>Loading...</p>
      </Flex>
    </Paper>
  );
};

export default Loading;
