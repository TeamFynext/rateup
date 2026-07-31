import { IconRefresh } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useId, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { ConversationalAutomationCommand } from "@/backend/whatsapp/settings/waSettings.api";
import {
  useConversationalAutomation,
  useSyncConversationalAutomation,
  useUpdateConversationalAutomation,
  useWaSettings,
} from "@/backend/whatsapp/settings/waSettings.query";
import { AccountSelector } from "@/components/input/AccountSelector.tsx";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";

export const Route = createFileRoute("/dashboard/whatsapp/conversational-components/")({
  component: ConversationalComponents,
});

function ConversationalComponents() {
  const { data: waSettings } = useWaSettings();
  const [selectedPhoneId, setSelectedPhoneId] = useState<string>("");
  const { t } = useTranslation();

  const syncMutation = useSyncConversationalAutomation();

  useEffect(() => {
    if (waSettings?.length && !selectedPhoneId) {
      setSelectedPhoneId(waSettings[0].phoneId);
    }
  }, [waSettings, selectedPhoneId]);

  const handleSync = () => {
    syncMutation.mutate(selectedPhoneId);
  };

  return (
    <>
      <div className="mb-4 flex items-end gap-2 justify-between">
        <div className="max-w-xs flex-1">
          <AccountSelector
            value={selectedPhoneId}
            onChange={(value) => setSelectedPhoneId(value ?? "")}
          />
        </div>
        {selectedPhoneId && (
          <Button variant="default" onClick={handleSync} disabled={syncMutation.isPending}>
            <IconRefresh className={syncMutation.isPending ? "animate-spin" : ""} size={18} />
            {syncMutation.isPending ? t("Syncing...") : t("Sync from WhatsApp")}
          </Button>
        )}
      </div>

      <DisplayConversationalSettings selectedPhoneId={selectedPhoneId} />
    </>
  );
}
function DisplayConversationalSettings({
  selectedPhoneId,
}: Readonly<{
  selectedPhoneId: string;
}>) {
  const uid = useId();
  const { t } = useTranslation();
  const [prompts, setPrompts] = useState<string[]>([]);
  const [commands, setCommands] = useState<ConversationalAutomationCommand[]>([]);

  const { data: automation, isPending } = useConversationalAutomation(selectedPhoneId);

  const updateMutation = useUpdateConversationalAutomation();

  useEffect(() => {
    if (automation) {
      setPrompts(automation.prompts ?? []);
      setCommands(automation.commands ?? []);
    }
  }, [automation]);

  const handleAddPrompt = () => {
    if (prompts.length >= 4) {
      toast.error(t("Maximum 4 ice breakers allowed"));
      return;
    }
    setPrompts([...prompts, ""]);
  };

  const handleRemovePrompt = (index: number) => {
    setPrompts(prompts.filter((_, i) => i !== index));
  };

  const handlePromptChange = (index: number, value: string) => {
    if (value.length > 80) return;
    const updated = [...prompts];
    updated[index] = value;
    setPrompts(updated);
  };

  const handleAddCommand = () => {
    if (commands.length >= 30) {
      toast.error("Maximum 30 commands allowed");
      return;
    }
    setCommands([...commands, { command_name: "", command_description: "" }]);
  };

  const handleRemoveCommand = (index: number) => {
    setCommands(commands.filter((_, i) => i !== index));
  };

  const handleCommandChange = (
    index: number,
    field: "command_name" | "command_description",
    value: string,
  ) => {
    const maxLen = field === "command_name" ? 32 : 256;
    if (value.length > maxLen) return;
    const updated = [...commands];
    updated[index] = { ...updated[index], [field]: value };
    setCommands(updated);
  };

  const handleSave = () => {
    const invalidPrompt = prompts.some((p) => !p.trim());
    const invalidCommand = commands.some(
      (c) => !c.command_name.trim() || !c.command_description.trim(),
    );

    if (invalidPrompt || invalidCommand) {
      toast.error("Please fill in all fields before saving");
      return;
    }

    updateMutation.mutate({
      phoneId: selectedPhoneId,
      data: { prompts, commands },
    });
  };
  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-50 w-full" />
        <Skeleton className="h-50 w-full" />
      </div>
    );
  }

  if (!selectedPhoneId) {
    return (
      <p className="text-muted-foreground">
        {t("Please select a phone account to configure conversational settings.")}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("Ice Breakers")}</CardTitle>
          <CardDescription>
            {t(
              "Tappable text prompts shown to users the first time they message you. Maximum 4, up to 80 characters each.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {prompts.map((prompt, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={prompt}
                onChange={(e) => handlePromptChange(index, e.target.value)}
                placeholder="e.g. Plan a trip"
                maxLength={80}
              />
              <span className="shrink-0 text-xs text-muted-foreground">{prompt.length}/80</span>
              <Button variant="ghost" size="icon" onClick={() => handleRemovePrompt(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {prompts.length < 4 && (
            <Button variant="outline" size="sm" onClick={handleAddPrompt}>
              <Plus className="mr-1 h-4 w-4" />
              {t("Add Ice Breaker")}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("Commands")}</CardTitle>
          <CardDescription>
            {t(
              "Slash commands users can access by typing '/' in chat. Maximum 30 commands. Name up to 32 chars, description up to 256 chars.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {commands.map((command, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                <Field className="flex-1">
                  <FieldLabel htmlFor={`${uid}-command-${index}`} className="text-xs">
                    Command
                  </FieldLabel>
                  <Input
                    id={`${uid}-command-${index}`}
                    value={command.command_name}
                    onChange={(e) => handleCommandChange(index, "command_name", e.target.value)}
                    placeholder="e.g. help"
                    maxLength={32}
                  />
                  <span className="text-xs text-muted-foreground">
                    {command.command_name.length}/32
                  </span>
                </Field>
                <Field className="flex-2">
                  <FieldLabel htmlFor={`${uid}-description-${index}`} className="text-xs">
                    Description
                  </FieldLabel>
                  <Input
                    id={`${uid}-description-${index}`}
                    value={command.command_description}
                    onChange={(e) =>
                      handleCommandChange(index, "command_description", e.target.value)
                    }
                    placeholder="e.g. Get help with our services"
                    maxLength={256}
                  />
                  <span className="text-xs text-muted-foreground">
                    {command.command_description.length}/256
                  </span>
                </Field>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="mt-6"
                onClick={() => handleRemoveCommand(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {commands.length < 30 && (
            <Button variant="outline" size="sm" onClick={handleAddCommand}>
              <Plus className="mr-1 h-4 w-4" />
              {t("Add Command")}
            </Button>
          )}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={updateMutation.isPending}>
        {updateMutation.isPending ? t("Saving...") : t("Save Changes")}
      </Button>
    </div>
  );
}
