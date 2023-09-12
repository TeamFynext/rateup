import React from 'react'

import {
  Box,
  Grid,
  Title,
  Paper,
  TextInput,
  Space,
  Text,
  Center,
  Stack,
  Container,
  Image,
  RingProgress,
  Modal,
  Group,
  Button,
  createStyles,
  Flex,
  BackgroundImage,
} from "@mantine/core";
function ProgressBar({ currentQuestionNo, questionCount }) {
  const progressPercentage = (currentQuestionNo / questionCount) * 100;

  return (
    <RingProgress
      size={60}
      thickness={5}
      sections={[{ value: progressPercentage, color: "black" }]}
      label={
        <Text color="black" weight={700} align="center" size="xs">
          {currentQuestionNo}/{questionCount}
        </Text>
      }
    />
  );
}

export default ProgressBar