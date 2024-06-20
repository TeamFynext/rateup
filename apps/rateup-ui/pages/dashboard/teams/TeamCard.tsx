import { Flex, Stack, Text, Badge } from "@mantine/core";
import { useRouter } from "next/router";
import React from "react";
import PaperLayout from "../../../components/styled/Layouts/PaperLayout";
import { useUser } from "../../../context/UserContext";
import { UserRole } from "../../../utils/enums";

interface TeamCardProps {
  team: TeamData;
}
const TeamCard = ({ team }: TeamCardProps) => {
  const { user } = useUser();
  const router = useRouter();
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
          <Text mr={"sm"} truncate size="xl" fw={700}>
            {team.name}
          </Text>
          <Badge color="var(--tertiary-color)" variant="outline">
            {team.code}{" "}
          </Badge>
        </Stack>
        <Stack align={"center"} gap={0}>
          <Text fw={700} fz="xl" color="var(--tertiary-color)">
            {team._count.members}
          </Text>
          <Text fz="sm" color="var(--tertiary-color)" fw={"400"}>
            Members
          </Text>
        </Stack>
      </Flex>
    </PaperLayout>
  );
};

export default TeamCard;
