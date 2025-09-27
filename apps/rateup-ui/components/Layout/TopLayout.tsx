"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  ActionIcon,
  Avatar,
  Box,
  Button,
  Divider,
  Flex,
  Group,
  Indicator,
  Modal,
  Popover,
  rgba,
  Switch,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { ChevronDown, ChevronUp, LogOut, Settings, User } from "lucide-react";
import { useTranslations } from "next-intl";

import { UserAvailabilityStatus } from "@/backend/user/user.api";
import { useUpdateUserAvailabilityStatus } from "@/backend/user/user.query";
import { getFileUrlFromKey } from "@/utils/file-upload/upload";

import ColorSchemaButton from "../theme/ColorSchemaButton";
import classes from "./DoubleNavbar.module.css";
import NotificationBellIcon from "./Notification";

export default function TopNavbar({ user }) {
  const updateUserStatus = useUpdateUserAvailabilityStatus();
  const [status, setStatus] = useState(user?.status);
  const [opened, setOpened] = useState(false);
  const [openedLogoutModal, logoutModal] = useDisclosure(false);

  const translations = useTranslations();
  const router = useRouter();

  // Sync status with backend
  useEffect(() => {
    if (status !== user?.status) {
      updateUserStatus.mutate({ status });
    }
  }, [status]);

  useEffect(() => {
    if (user?.status && user?.status !== status) {
      setStatus(user?.status);
    }
  }, [user]);

  return (
    <Flex
      component="header"
      justify="end"
      align="center"
      h={50}
      px="md"
      w={"100%"}
      className={classes["topbar"]}
    >
      <Modal
        opened={openedLogoutModal}
        onClose={logoutModal.close}
        centered
        radius="lg"
        withCloseButton={false}
        overlayProps={{
          blur: 4,
          backgroundOpacity: 0.55,
        }}
      >
        <Flex direction="column" align="center" gap="md" p="lg">
          <div
            style={{
              background: "rgba(0, 79, 152, 0.1)",
              borderRadius: "50%",
              padding: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LogOut size={28} color="#004F98" strokeWidth={2} />
          </div>

          <Title order={4} style={{ fontWeight: 600 }}>
            {translations("Are you sure you want to logout?")}
          </Title>

          <Text size="sm" c="dimmed" ta="center" maw={280}>
            {translations("You’ll need to log in again to access your account")}
          </Text>

          <Flex gap="sm" mt="md" w="100%" justify="center">
            <Button variant="outline" radius="md" onClick={logoutModal.close}>
              {translations("Cancel")}
            </Button>
            <Button
              radius="md"
              onClick={() => {
                router.push("/logout");
                logoutModal.close();
              }}
            >
              {translations("Logout")}
            </Button>
          </Flex>
        </Flex>
      </Modal>
      {/* RIGHT: Notifications + Settings + Profile */}
      <Group gap="md">
        <Flex align={"center"} justify={"center"} gap={8}>
          <ActionIcon
            variant="transparent"
            className={classes["theme-toggle-icon"]}
          >
            <ColorSchemaButton />
          </ActionIcon>

          <Box mt={5} className={classes["bell-icon"]}>
            <NotificationBellIcon strokeWidth={1.5} />
          </Box>

          <ActionIcon
            variant="transparent"
            onClick={() => router.push("/dashboard/settings?tab=account")}
            className={classes["settings-icon"]}
          >
            <Settings size={20} />
          </ActionIcon>
        </Flex>

        <Popover
          position="bottom-end"
          shadow="sm"
          opened={opened}
          onChange={setOpened}
          transitionProps={{
            transition: "fade",
            duration: 200,
            timingFunction: "ease-in-out",
          }}
        >
          <Popover.Target>
            <Flex
              align="center"
              gap="sm"
              px={6}
              py={2}
              className={classes["topbarcapsule"]}
              onClick={() => setOpened((o) => !o)}
              onMouseOver={() => setOpened(true)}
            >
              <Group gap="xs">
                <Indicator
                  color={
                    user?.status === UserAvailabilityStatus.online
                      ? "#69f0ae"
                      : "#cacaca"
                  }
                  processing={user?.status === UserAvailabilityStatus.online}
                  size={8}
                >
                  <Avatar
                    name={user?.userName}
                    src={getFileUrlFromKey(user?.profilePhoto)}
                    radius="xl"
                    size="sm"
                  />
                </Indicator>
                <Box visibleFrom="sm">
                  <Text size="sm" fw={600}>
                    {user?.userName || "User"}
                  </Text>
                  <Text size={"xs"} fw={600} c="dimmed">
                    {user?.role || "N/A"}
                  </Text>
                </Box>
              </Group>
              {opened ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </Flex>
          </Popover.Target>

          <Popover.Dropdown
            p="sm"
            w={260}
            style={{ borderRadius: 8, boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}
          >
            {/* Status */}
            <Box mt="xs">
              <Text size="xs" c="dimmed">
                {translations("Status")}
              </Text>
              <Flex justify="space-between" align="center" mt={4}>
                <Text
                  size="sm"
                  fw={600}
                  c={
                    status === UserAvailabilityStatus.online ? "teal" : "dimmed"
                  }
                >
                  {status === UserAvailabilityStatus.online
                    ? translations("Online")
                    : translations("Offline")}
                </Text>
                <Switch
                  color={
                    status === UserAvailabilityStatus.online ? "teal" : "gray"
                  }
                  size="xs"
                  styles={{
                    track: {
                      backgroundColor:
                        status === UserAvailabilityStatus.online &&
                        rgba("#099268", 0.15),
                      width: 40,
                      height: 15,
                      cursor: "pointer",
                    },
                    thumb: {
                      backgroundColor:
                        status === UserAvailabilityStatus.online && "#099268",
                    },
                  }}
                  checked={status === UserAvailabilityStatus.online}
                  onChange={(e) => {
                    setStatus(
                      e.currentTarget.checked
                        ? UserAvailabilityStatus.online
                        : UserAvailabilityStatus.offline,
                    );
                  }}
                />
              </Flex>
            </Box>

            {/* Organization */}
            <Box mt="sm">
              <Text size="xs" c="dimmed">
                {translations("Organization")}
              </Text>
              <Text size="sm" fw={600}>
                {user?.orgName || "N/A"}
              </Text>
            </Box>

            {/* Email */}
            <Box mt="sm">
              <Text size="xs" c="dimmed">
                {translations("Email")}
              </Text>
              <Text size="sm" fw={600}>
                {user?.email || "No email"}
              </Text>
            </Box>

            {/* Role */}
            <Box mt="sm">
              <Text size="xs" c="dimmed">
                {translations("Role")}
              </Text>
              <Text size="sm" fw={600}>
                {user?.role || "N/A"}
              </Text>
            </Box>

            <Divider my="sm" />

            {/* Actions */}
            <Flex direction="column" gap={4}>
              <Flex
                align="center"
                gap="xs"
                px="xs"
                py={6}
                style={{ borderRadius: 6, cursor: "pointer" }}
                onClick={() => {
                  router.push("/dashboard/settings?tab=user");
                  setOpened(false);
                }}
              >
                <User size={16} />
                <Text size="sm">{translations("Profile")}</Text>
              </Flex>

              <Flex
                align="center"
                gap="xs"
                px="xs"
                py={6}
                style={{
                  borderRadius: 6,
                  cursor: "pointer",
                  color: "red",
                  fontWeight: 500,
                }}
                onClick={() => {
                  logoutModal.open();
                  setOpened(false);
                }}
              >
                <LogOut size={16} />
                <Text size="sm">{translations("Logout")}</Text>
              </Flex>
            </Flex>
          </Popover.Dropdown>
        </Popover>
      </Group>
    </Flex>
  );
}
