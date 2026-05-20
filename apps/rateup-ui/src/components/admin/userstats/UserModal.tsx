"use client";

import { Avatar, Divider, Group, Stack, Text, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";

import PaperLayout from "@/components/styled/Layouts/PaperLayout.tsx";

const UserModal = ({ selectedUser }: { selectedUser: UserData }) => {
  const { t: translations } = useTranslation();
  return (
    <Stack gap={"xl"}>
      <Group justify="space-around">
        <Stack gap={1}>
          <Avatar
            src={`${import.meta.env.VITE_AWS_CLOUDFRONT_URL}${selectedUser.profilePhoto}`}
            size={"xl"}
          />
          <Title order={4}>{selectedUser?.userName}</Title>
        </Stack>
        <Stack>
          <Group gap={1}>
            <Text fw={600} size="sm" w={110}>
              {translations("Email ID")}
            </Text>
            <Text size="sm" c={"dimmed"}>
              {selectedUser?.email}
            </Text>
          </Group>
          <Group gap={1}>
            <Text fw={600} size="sm" w={110}>
              {translations("User ID")}
            </Text>
            <Text size="sm" c={"dimmed"}>
              {" "}
              {selectedUser?.userId}
            </Text>
          </Group>
          <Group gap={1}>
            <Text fw={600} size="sm" w={110}>
              {translations("Phone Number")}
            </Text>
            <Text size="sm" c={"dimmed"}>
              {selectedUser?.phone ?? "---"}
            </Text>
          </Group>
        </Stack>
      </Group>
      <PaperLayout>
        <Title order={3}>{translations("Organization")}</Title>
        <Divider my={"sm"} />
        <Group justify="space-around">
          <Stack gap={1}>
            <Avatar
              src={`${import.meta.env.VITE_AWS_CLOUDFRONT_URL}${selectedUser.orgLogo}`}
              size={"lg"}
            />
            <Title order={5}>{selectedUser?.orgName}</Title>
            <Text size="xs" c={"dimmed"}>
              {selectedUser.role}
            </Text>
          </Stack>
          <Stack>
            <Group gap={1}>
              <Text fw={600} size="sm" w={110}>
                {translations("Org ID")}
              </Text>
              <Text size="sm" c={"dimmed"}>
                {selectedUser.orgId}
              </Text>
            </Group>
            <Group gap={1}>
              <Text fw={600} size="sm" w={110}>
                {translations("Phone Number")}
              </Text>
              <Text size="sm" c={"dimmed"}>
                {selectedUser.orgPhone ?? "---"}
              </Text>
            </Group>
            <Group gap={1}>
              <Text fw={600} size="sm" w={110}>
                {translations("Address")}
              </Text>
              <Text size="sm" c={"dimmed"}>
                {selectedUser.orgAddress ?? "---"}
              </Text>
            </Group>
          </Stack>
        </Group>
      </PaperLayout>
    </Stack>
  );
};

export default UserModal;
