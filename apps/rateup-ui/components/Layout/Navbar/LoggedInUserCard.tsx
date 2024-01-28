import React, { useState, useEffect } from "react";
import { Stack, Text, Grid, Group, NavLink, Avatar } from "@mantine/core";
import { UserRole } from "../../../utils/enums";
import styles from "./Navbar.module.css";

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
    <Group gap={10} style={{ width: "280px" }}>
      <Avatar
        src={userInfo?.image}
        alt={userInfo.name}
        radius="xl"
        className={styles["top-user-icon-image-container"]}
      />
      <Stack className={styles["top-user-icon-all-container"]}>
        <Text size="lg" fw={500}>
          {userInfo.name ? userInfo.name : userInfo.email}
        </Text>
        <Text c="dimmed" size="md">
          {userInfo.role}
        </Text>
      </Stack>
    </Group>
  );
};
export default LoggedInUserCard;
