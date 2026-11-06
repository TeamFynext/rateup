import { IconRefresh, IconSettings, IconTrash, IconUsers, IconWorldWww } from "@tabler/icons-react";
import { useState } from "react";

import { useEditSurveyMutation } from "@/backend/surveys/surveys.query";
import { useTeamsByUser } from "@/backend/team/team.query";
import { useUpdateFlowMetaDataMutation } from "@/backend/whatsapp/flow/flow.query";
import { Button } from "@/components/ui/button.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { MultiSelect } from "@/components/ui/multi-select.tsx";
import { Switch } from "@/components/ui/switch.tsx";

import { SettingsCard } from "./SettingsCard.tsx";

interface FlowSettingsProps {
  flowName: string;
  flowDbId: string;
  anonymous: boolean;
  survey: Survey;
  surveyId: string;
}

export default function FlowSettings({
  flowName,
  flowDbId,
  anonymous,
  survey,
  surveyId,
}: FlowSettingsProps) {
  const updateFlowMetadata = useUpdateFlowMetaDataMutation();
  const editSurvey = useEditSurveyMutation(surveyId);

  // Form state for General Settings
  const [flowNameInput, setFlowNameInput] = useState(flowName ?? "");
  const [anonymousChecked, setAnonymousChecked] = useState(anonymous ?? false);

  // State for teams
  const [selectedTeams, setSelectedTeams] = useState<string[]>(
    survey?.teams?.map((team) => team.id) || [],
  );
  const [sendWeeklyReport, setSendWeeklyReport] = useState(survey?.sendWeeklyReport || false);

  // State for webhooks
  const [webhookUrl, setWebhookUrl] = useState(survey?.responseWebhookEndpoint || "");

  const { data: teamRes } = useTeamsByUser();
  const teamOptions =
    teamRes?.data?.map((team) => ({
      value: team?.id,
      label: team?.name,
    })) || [];

  const handleSaveGeneral = () => {
    updateFlowMetadata.mutate({
      data: { name: flowNameInput, anonymous: anonymousChecked },
      dbFlowId: flowDbId,
    });
  };

  const handleSaveTeams = () => {
    editSurvey.mutate({
      teams: selectedTeams,
      sendWeeklyReport: sendWeeklyReport,
    });
  };

  const handleSaveWebhook = () => {
    editSurvey.mutate({ responseWebhookEndpoint: webhookUrl });
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* General Settings */}
          <SettingsCard title="General Settings" icon={<IconSettings size={20} />}>
            <div className="flex flex-col gap-6">
              <Field>
                <FieldLabel htmlFor="flow-name">
                  Flow Name <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="flow-name"
                  placeholder="Enter flow name"
                  value={flowNameInput}
                  onChange={(e) => setFlowNameInput(e.target.value)}
                />
              </Field>

              <Field>
                <Field orientation="horizontal">
                  <Switch
                    id="anonymous"
                    checked={anonymousChecked}
                    onCheckedChange={setAnonymousChecked}
                  />
                  <FieldLabel htmlFor="anonymous" className="font-medium cursor-pointer">
                    Anonymous
                  </FieldLabel>
                </Field>
                <p className="text-xs text-muted-foreground ml-10">Anonymous Flow is disabled</p>
              </Field>

              <div>
                <Button
                  size="default"
                  onClick={handleSaveGeneral}
                  loading={updateFlowMetadata.isPending}
                >
                  {"Save Changes"}
                </Button>
              </div>
            </div>
          </SettingsCard>

          {/* Team & Notifications */}
          <SettingsCard title="Team & Notifications" icon={<IconUsers size={20} />}>
            <div className="flex flex-col gap-6">
              <Field>
                <FieldLabel htmlFor="team-select">Select Teams</FieldLabel>
                <MultiSelect
                  options={teamOptions}
                  value={selectedTeams}
                  onValueChange={setSelectedTeams}
                  placeholder="Select teams"
                  emptyIndicator="No teams found."
                />
              </Field>

              <Field orientation="horizontal" className="justify-between">
                <FieldLabel htmlFor="weekly-report" className="font-medium cursor-pointer">
                  Send weekly report to email
                </FieldLabel>
                <Switch
                  id="weekly-report"
                  checked={sendWeeklyReport}
                  onCheckedChange={setSendWeeklyReport}
                />
              </Field>

              <div>
                <Button size="default" onClick={handleSaveTeams} loading={editSurvey.isPending}>
                  {"Save Changes"}
                </Button>
              </div>
            </div>
          </SettingsCard>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Webhooks */}
          <SettingsCard title="Webhooks" icon={<IconWorldWww size={20} />}>
            <div className="flex flex-col gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <FieldLabel htmlFor="webhook-url">
                    Enter webhook url endpoint for response
                  </FieldLabel>
                  <span className="text-xs text-muted-foreground">ⓘ</span>
                </div>
                <Input
                  id="webhook-url"
                  placeholder="https://example.com/webhook"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
              </div>

              <div>
                <Button size="default" onClick={handleSaveWebhook} loading={editSurvey.isPending}>
                  {"Save Changes"}
                </Button>
              </div>
            </div>
          </SettingsCard>
        </div>

        {/* Danger Zone - Full Width */}
        <div className="col-span-1 lg:col-span-2">
          <div className="bg-card border border-border rounded p-5 px-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-bold text-foreground m-0 mb-1 tracking-wide">
                  DANGER ZONE
                </p>
                <p className="text-sm text-muted-foreground m-0">Reset data and responses</p>
              </div>
              <div className="flex gap-2">
                <Button variant="destructive" size="default">
                  <IconRefresh size={18} className="mr-2" />
                  Reset Response data
                </Button>
                <Button variant="destructive" size="default">
                  <IconTrash size={18} className="mr-2" />
                  Delete Survey
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
