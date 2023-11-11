import { Flex, Stack, Text, Badge } from "@mantine/core";
import { useRouter } from "next/router";
import React from "react";
import PaperLayout from "../../../components/styled/Layouts/PaperLayout";

interface TeamCardProps {
  team: TeamData;
}
const TeamCard = ({ team }: TeamCardProps) => {
  const router = useRouter();
  return (
    <PaperLayout
      p="md"
      shadow="md"
      radius="lg"
      style={{ cursor: "pointer", minWidth: "300px", height: "140px" }}
      onClick={() => {
        router.push(`teams/${team.code}`);
      }}
      hoveractive
    >
      <Flex justify={"space-between"} align={"center"} h={"100%"}>
        <Stack gap={0}>
          <Badge color="var(--tertiary-color)" variant="outline">
            {team.code}{" "}
          </Badge>
          <Text mr={"sm"} truncate size="xl" fw={700}>
            {team.name}
          </Text>
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
