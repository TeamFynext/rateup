import React from 'react'
import {
  Paper,
  Text,
  Stack,
  Button,
  CopyButton,
  Group,
  TextInput,
  SimpleGrid,
  Title,
  ActionIcon,
  Modal,
  Flex,
} from "@mantine/core";
import {
  IconBrandFacebook,
  IconBrandWhatsapp,
  IconCopy,
  IconMail,
  IconMessage,
} from "@tabler/icons-react";
function ShareLandingPage({LandingId}) {
  return (
    <Stack>
        <Paper p="md">
          <SimpleGrid spacing="xl">
            {/* //-----------------web survey share url ----------------- */}

            <Stack p="md" dir="row">
              <Title order={4}>Share Survey</Title>

              <CopyLinkComponent
                value={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/public/landing/${LandingId}`}
              />
            </Stack>
          </SimpleGrid>
        </Paper>
      </Stack>
  )
}

export default ShareLandingPage

const CopyLinkComponent = ({ value }) => {
  return (
    <Flex style={{ flexDirection: "row", display: "flex", width: "100%" }}>
      <TextInput
        sx={{ minWidth: "70%" }}
        readOnly
        value={value}
        pr="sm"
      ></TextInput>
      <CopyButton value={value}>
        {({ copied, copy }) => (
          <Button
            color={copied ? "dark" : "yellow.6"}
            onClick={copy}
            rightIcon={<IconCopy />}
          >
            {copied ? "Copied url" : "Copy url"}
          </Button>
        )}
      </CopyButton>
    </Flex>
  );
};