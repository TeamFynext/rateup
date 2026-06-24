import { Flex, Loader, Paper } from "@mantine/core";
import React from "react";

const Loading = ({ h }: { h?: number }) => {
  return (
    <Paper p="md">
      <Flex gap="md" mih={h} justify="center" align="center" direction="column" wrap="wrap">
        <Loader type="bars" />
      </Flex>
    </Paper>
  );
};

export default Loading;
