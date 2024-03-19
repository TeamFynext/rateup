"use client";

import { Button, Group, Stack, Title } from "@mantine/core";
import { useRouter } from "next/router";
import { useWaAutomatedReplies } from "../../../../backend/whatsapp/automated-reply/automatedReply.query";
import { TeamSelector } from "../../../../components/input/TeamSelector";
import { useState } from "react";
import { WaAutomationCards } from "../../../../components/whatsapp/automation/AutomationCards";

export default function AutomatedRepliesPage() {
  const router = useRouter();
  const [teamId, setTeamId] = useState(null);
  const { data: automations } = useWaAutomatedReplies(teamId);

  function handleCreateClick() {
    router.push("automated-replies/create");
  }
  return (
    <Stack>
      <Group justify={"space-between"}>
        <Group>
          <Title>Automated Replies</Title>
          <Button onClick={handleCreateClick}>
            Create New Automated Reply
          </Button>
        </Group>
        <TeamSelector value={teamId} onChange={setTeamId} />
      </Group>
      <WaAutomationCards teamId={teamId} />
    </Stack>
  );
}
