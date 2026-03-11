"use client";

import { useState } from "react";

import {
  ActionIcon,
  Center,
  Divider,
  Flex,
  Group,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconLogout, IconPencilMinus } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { useTeamsByUser } from "@/backend/team/team.query";
import type { WaSettings } from "@/backend/whatsapp/settings/waSettings.api";
import { useDeregisterBusinessClientMutation } from "@/backend/whatsapp/settings/waSettings.query";
import ConfirmationModal from "@/components/Modal/ConfirmationModal";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

import { ConnectMetaAccountButton } from "./connect-meta-account-button";
import { TeamAssignmentSection } from "./team-assignment-section";
import { WaSettingEditModal } from "./wa-setting-edit-modal";

type WaSetting = WaSettings[number];

export function MetaLoginStatus({
  waSettings,
}: Readonly<{ waSettings?: WaSettings }>) {
  const deRegisterMutation = useDeregisterBusinessClientMutation();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );
  const [openDeleteConfirmation, { open, close }] = useDisclosure(false);
  const [selectedWaSettings, setSelectedWaSettings] =
    useState<WaSetting | null>(null);
  const [openedEdit, { open: openEdit, close: closeEdit }] =
    useDisclosure(false);
  const translations = useTranslations();
  const { data: teamsRes, isLoading: isLoadingTeams } = useTeamsByUser();

  const teams = teamsRes?.data || [];
  const teamOptions = teams.map((team: any) => ({
    value: team.id,
    label: team.name,
  }));

  function handleDeRegister() {
    if (!selectedAccountId) return;
    deRegisterMutation.mutate(selectedAccountId);
    close();
  }

  if (!waSettings?.length) {
    return (
      <Center h="100%" bg="whitesmoke" style={{ borderRadius: "4px" }}>
        <Stack align="center" gap="md" p={"md"}>
          <Text>No WhatsApp Business Accounts Connected</Text>
          <ConnectMetaAccountButton />
        </Stack>
      </Center>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            {translations("Linked WhatsApp Business Accounts")}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {translations(
              "Manage your connected WhatsApp Business accounts and team access",
            )}
          </p>
        </div>
        <ConnectMetaAccountButton />
      </div>

      <div className="grid gap-4">
        {waSettings.map((setting) => {
          const assignedTeamIds =
            setting.teams?.map((team: any) => team.id) || [];

          return (
            <Card
              key={setting.id || setting.phoneId}
              className="border-border/80 hover:border-border/90 transition-colors"
            >
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Header with Edit & Logout buttons */}
                  <Flex justify="space-between" align="start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-base">
                          {setting.phoneDisplayName ||
                            setting.phone ||
                            "Unnamed Account"}
                        </h4>
                        <Badge variant="secondary" className="text-[10px]">
                          {setting.type || "Automated"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {setting.phone}
                      </p>
                    </div>
                    <Group gap="xs">
                      <Tooltip label={translations("Edit Display Name")}>
                        <ActionIcon
                          onClick={() => {
                            setSelectedWaSettings(setting);
                            openEdit();
                          }}
                          variant="subtle"
                          size="lg"
                        >
                          <IconPencilMinus size={18} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip
                        label={translations(
                          "Logout from this WhatsApp Business Account",
                        )}
                      >
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="lg"
                          onClick={() => {
                            setSelectedAccountId(setting.phoneId);
                            open();
                          }}
                        >
                          <IconLogout size={18} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Flex>

                  <Divider />

                  {/* Account Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">
                        {translations("Business ID")}
                      </p>
                      <code className="text-sm font-mono text-foreground mt-1 break-all">
                        {setting.wabaId}
                      </code>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">
                        {translations("Phone ID")}
                      </p>
                      <code className="text-sm font-mono text-foreground mt-1 break-all">
                        {setting.phoneId}
                      </code>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">
                        {translations("App ID")}
                      </p>
                      <code className="text-sm font-mono text-foreground mt-1 break-all">
                        {setting.appId}
                      </code>
                    </div>
                  </div>

                  <Divider />

                  {/* Team Assignment */}
                  <div className="bg-accent/40 rounded-lg p-4 border border-dashed border-border/40">
                    <TeamAssignmentSection
                      waSettingId={setting.id}
                      assignedTeamIds={assignedTeamIds}
                      teamOptions={teamOptions}
                      isLoadingTeams={isLoadingTeams}
                      translations={translations}
                      instagramConnectionData={{
                        fbPageId: setting?.fbPageId,
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ConfirmationModal
        forDeleteFunctionality
        deleteQuotion={translations(
          "Are you sure you want to DeRegister this WhatsApp Business Account?",
        )}
        opened={openDeleteConfirmation}
        onClose={close}
        onConfirm={handleDeRegister}
        confirmLabel={translations("DeRegister")}
        headerLabel={translations("DeRegister WhatsApp Business Account")}
        headerTitle={translations("Confirmation Dialog")}
      />

      <WaSettingEditModal
        opened={openedEdit}
        close={closeEdit}
        waSetting={selectedWaSettings}
      />
    </div>
  );
}
