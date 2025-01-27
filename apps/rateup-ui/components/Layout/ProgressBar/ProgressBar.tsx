import React from "react";

import {
  BackgroundImage,
  Box,
  Button,
  Center,
  Container,
  Flex,
  Grid,
  Group,
  Image,
  Modal,
  Paper,
  RingProgress,
  Space,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";

function ProgressBar({ currentQuestionNo, questionCount }) {
  const progressPercentage = (currentQuestionNo / questionCount) * 100;

  return (
    <RingProgress
      size={60}
      thickness={5}
      sections={[{ value: progressPercentage, color: "black" }]}
      label={
        <Text
          c="black"
          fw={500}
          style={{
            textAlign: "center",
          }}
          size="xs"
        >
          {currentQuestionNo}/{questionCount}
        </Text>
      }
    />
  );
}

export default ProgressBar;
