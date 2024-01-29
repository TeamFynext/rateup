import React, { useState, useEffect } from "react";
import { Stack, Text, Group, Avatar } from "@mantine/core";
import { UserRole } from "../../../utils/enums";

const LoggedInUserCard = (userInfo: {
  name: string;
  email: string;
  role:
    | typeof UserRole.ADM
    | typeof UserRole.MEMBER
    | typeof UserRole.SUPADM
    | "...error...";
  image: string;
}) => {
  return (
    <Group gap={10} style={{ width: "200px" }}>
      <Avatar
        src={userInfo?.image}
        alt={userInfo.name}
        radius="xl"
        style={{ size: "40px", marginLeft: "1rem" }}
      />
      <Stack style={{ gap: 0 }}>
        <Text size="lg" fw={500}>
          {userInfo.name ? userInfo.name : userInfo.email}
        </Text>
        <Text c="dimmed" size="sm">
          {userInfo.role}
        </Text>
      </Stack>
    </Group>
  );
};
export default LoggedInUserCard;
