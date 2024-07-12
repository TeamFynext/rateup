import React, { useState } from "react";

import { ActionIcon, Button, Popover, Stack, Text } from "@mantine/core";
import {
  IconDots,
  IconMessageFilled,
  IconPhoneFilled,
  IconSettingsFilled,
  IconX,
} from "@tabler/icons-react";
import Link from "next/link";

const FloatingMenu = ({ dynamicVariables }) => {
  const [opened, setOpened] = useState(false);
  if (dynamicVariables?.length === 0) return;
  let border = "2px solid black";
  return (
    <Stack pos={"fixed"} bottom={40} right={30}>
      <Popover
        position="left-end"
        offset={0}
        opened={opened}
        onChange={setOpened}
      >
        <Popover.Target>
          <ActionIcon
            bg={"var(--orange-400)"}
            onClick={() => setOpened((o) => !o)}
            opacity={opened ? "0" : "1"}
            disabled={!!opened}
            style={{
              border,
            }}
            size={"lg"}
          >
            <IconDots />
          </ActionIcon>
        </Popover.Target>
        <Popover.Dropdown
          p={2}
          style={{
            border: "none",
          }}
        >
          <Stack gap={2} align="end">
            <ActionIcon
              bg={"gray"}
              onClick={() => setOpened((o) => !o)}
              radius={opened ? "xl" : "sm"}
            >
              {opened ? <IconX /> : <IconDots />}
            </ActionIcon>
            <Button.Group borderWidth={0}>
              {dynamicVariables?.map((data, i) => (
                <Link key={data.name} href={data.link} target="_blank">
                  <Button
                    variant="default"
                    bg={"var(--orange-400)"}
                    style={
                      i === 0
                        ? {
                            border,
                          }
                        : {
                            borderBlock: border,
                            borderRight: border,
                          }
                    }
                    c={"white"}
                    h={"50px"}
                  >
                    <Stack gap={0} align="center" miw={60}>
                      {customButton(data.name)}
                    </Stack>
                  </Button>
                </Link>
              ))}
            </Button.Group>
          </Stack>
        </Popover.Dropdown>
      </Popover>
    </Stack>
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
