import React from "react";

import Link from "next/link";
import { Button, SimpleGrid, Stack, Text } from "@mantine/core";
import {
  IconMessageFilled,
  IconPhoneFilled,
  IconSettingsFilled,
} from "@tabler/icons-react";

const FloatingMenu = ({ dynamicVariables }) => {
  if (dynamicVariables?.length === 0) return;
  return (
    <SimpleGrid cols={2}>
      {dynamicVariables?.map((data, i) => (
        <Link
          key={data.name}
          href={
            data.name?.toLowerCase() === "contact"
              ? `tel:${data.link}`
              : data.link
          }
          target="_blank"
        >
          <Button
            variant="default"
            bg={"var(--orange-400)"}
            c={"white"}
            h={"50px"}
          >
            <Stack gap={0} align="center" miw={75}>
              {customButton(data.name)}
            </Stack>
          </Button>
        </Link>
      ))}
    </SimpleGrid>
  );
};

export default FloatingMenu;

const customButton = (name) => {
  switch (name?.toLowerCase()) {
    case "contact":
      return (
        <>
          <IconPhoneFilled />
          <Text fz={"xs"}>Contact</Text>
        </>
      );
    case "feedback":
      return (
        <>
          <IconMessageFilled />
          <Text fz={"xs"}>Feedback</Text>
        </>
      );
    default:
      return (
        <>
          <IconSettingsFilled />
          <Text fz={"xs"}>{name}</Text>
        </>
      );
  }
};
