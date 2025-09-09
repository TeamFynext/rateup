"use client";

import React, { useEffect, useMemo, useState } from "react";

import { Radio, RadioGroup, Stack } from "@mantine/core";
import { notifications } from "@mantine/notifications";

import { WaAssignedChatPermission } from "@/types/enums";
import {
  useTeamsMembersOfOrg,
  useUpdateOrgDetailsMutation,
} from "@/backend/org/org.query";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import { AccountSelector } from "@/components/input/AccountSelector";
import {
  ContainedMultiSelect,
  ContainedSelection,
  ContainedTextField,
} from "@/components/input/ContainedInput/ContainedInput";
import { TeamSelector } from "@/components/input/TeamSelector";
import RateupLoader from "@/components/Loaders/RateupLoader";
import { useUser } from "@/context/UserContext";
import { showLoadingToast } from "@/utils/notifications";

const WaInboxPermissions = () => {
  const { user } = useUser();
  const [assignedChatPermission, setAssignedChatPermmission] = useState(
    user?.waAssignedChatPermission ?? WaAssignedChatPermission.All,
  );
  const orgDetailsUpdate = useUpdateOrgDetailsMutation();

  useEffect(() => {
    if (user) {
      setAssignedChatPermmission(user?.waAssignedChatPermission);
    }
  }, [user]);

  useEffect(() => {
    if (user?.waAssignedChatPermission !== assignedChatPermission) {
      orgDetailsUpdate.mutate({
        waAssignedChatPermission: assignedChatPermission,
      });
    }
  }, [assignedChatPermission]);
  if (orgDetailsUpdate.isPending) {
    notifications.show({
      id: "load-data",
      loading: true,
      title: "Updating",
      message: "Hold On...Updating permission",
      autoClose: false,
      withCloseButton: false,
    });
  }
  if (!user) return <RateupLoader />;

  return (
    <Stack>
      <RadioGroup
        label={"Show Assigned Chats"}
        value={assignedChatPermission}
        onChange={(value) =>
          setAssignedChatPermmission(value as WaAssignedChatPermission)
        }
      >
        <Stack gap={"xs"} p={"xs"}>
          <Radio
            size="xs"
            styles={{ label: { fontSize: 14 } }}
            label={"Everyone"}
            value={WaAssignedChatPermission.All}
            description={"Show all assigned chats to everyone"}
          />
          <Radio
            size="xs"
            styles={{ label: { fontSize: 14 } }}
            label={"Staff of assigned Teams"}
            value={WaAssignedChatPermission.TeamMembers}
            description={
              "Show Only chats assigned to staff who are on the same teams as the logged-in user."
            }
          />
          <Radio
            size="xs"
            styles={{ label: { fontSize: 14 } }}
            label={"Admins"}
            value={WaAssignedChatPermission.Admins}
            description={
              "Show all assigned chats to only super admins and admins"
            }
          />
        </Stack>
      </RadioGroup>
    </Stack>
  );
};

export default WaInboxPermissions;
