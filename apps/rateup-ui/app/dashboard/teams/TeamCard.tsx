"use client";

import React from "react";
import { useRouter } from "next/navigation";

import { Badge, Flex, Stack, Text } from "@mantine/core";
import { useTranslations } from "next-intl";

import PaperLayout from "../../../components/styled/Layouts/PaperLayout";
import { useUser } from "../../../context/UserContext";
import { UserRole } from "../../../utils/enums";

interface TeamCardProps {
  team: TeamData;
}
const TeamCard = ({ team }: TeamCardProps) => {
  const { user } = useUser();
  const router = useRouter();
  const translations = useTranslations();
  return (
    <PaperLayout
      hoveractive={user?.role === UserRole.SUPADM}
      p="md"
      shadow="md"
      radius="lg"
      style={{ cursor: "pointer" }}
      onClick={() => {
        user.role === UserRole.SUPADM
          ? router.push(`teams/${team.code}`)
          : null;
      }}
    >
      <Flex justify={"space-between"} align={"center"} h={"100%"}>
        <Stack>
          <Text mr={"sm"} truncate size="xl" fw={500}>
            {team.name}
          </Text>
          <Badge color="var(--tertiary-color)" variant="outline">
            {team.code}{" "}
          </Badge>
        </Stack>
        <Stack align={"center"} gap={0}>
          <Text fw={500} fz="xl" c="var(--tertiary-color)">
            {team._count.members}
          </Text>
          <Text fz="sm" c="var(--tertiary-color)" fw={"400"}>
            {translations("Staff")}
          </Text>
        </Stack>
      </Flex>
    </PaperLayout>
  );
};

export default TeamCard;
