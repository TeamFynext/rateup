"use client";

import { Group, Stack, Title } from "@mantine/core";
import { useRouter } from "next/router";
import { TeamSelector } from "../../../../components/input/TeamSelector";
import { useState } from "react";
import { WaAutomationCards } from "../../../../components/whatsapp/automation/AutomationCards";
import { RateupButtonBlue } from "../../../../components/Button/RateupButtons";
import { IconPlus } from "@tabler/icons-react";

export default function AutomatedRepliesPage() {
  const router = useRouter();
  const [teamId, setTeamId] = useState(null);

  function handleCreateClick() {
    router.push("automated-replies/create");
  }
  return (
    <Stack>
      <Group justify={"space-between"}>
        <Group>
          <Title>Automated Replies</Title>
          <RateupButtonBlue
            title="Create automated reply"
            rightIcon={<IconPlus size={"1rem"} />}
            onClick={handleCreateClick}
          />
        </Group>
        <TeamSelector value={teamId} onChange={setTeamId} />
      </Group>
      <WaAutomationCards teamId={teamId} />
    </Stack>
  );
}
