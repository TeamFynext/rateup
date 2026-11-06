import { IconArrowLeft } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { v4 as uuidv4 } from "uuid";

import type { LinktreeLink, LinktreeSurveyOption } from "@/backend/linktree/linktree.api.ts";
import { useLinkTypeOptions } from "@/backend/linktree/linktree.query";
import { Button } from "@/components/ui/button.tsx";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

import { CustomLinkFields, useCustomLinkForm } from "./CustomLinkFields.tsx";
import { type LinkKind, linkKinds, type SurveyLinkType, surveyLinkUrl } from "./linkTypes.ts";

export function AddLinkDialog({
  open,
  onOpenChange,
  onAdd,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (link: LinktreeLink) => Promise<void>;
}>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && <AddLinkFlow onDone={() => onOpenChange(false)} onAdd={onAdd} />}
      </DialogContent>
    </Dialog>
  );
}

function AddLinkFlow({
  onDone,
  onAdd,
}: Readonly<{ onDone: () => void; onAdd: (link: LinktreeLink) => Promise<void> }>) {
  const { t } = useTranslation();
  const [kind, setKind] = useState<LinkKind | null>(null);
  const kinds = linkKinds(t);

  if (!kind) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>{t("Add a link")}</DialogTitle>
          <DialogDescription>{t("What should the button open?")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {kinds.map(({ kind: value, icon: Icon, label, hint }) => (
            <button
              key={value}
              type="button"
              onClick={() => setKind(value)}
              className="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-sm font-medium">{label}</span>
                <span className="text-xs text-muted-foreground">{hint}</span>
              </span>
            </button>
          ))}
        </div>
      </>
    );
  }

  const add = async (link: Omit<LinktreeLink, "id">) => {
    await onAdd({ id: uuidv4(), ...link });
    onDone();
  };
  const back = (
    <Button type="button" variant="ghost" onClick={() => setKind(null)} className="mr-auto -ml-2">
      <IconArrowLeft data-icon="inline-start" />
      {t("Back")}
    </Button>
  );
  const title = kinds.find((k) => k.kind === kind)?.label ?? "";

  return kind === "custom-link" ? (
    <CustomLinkStep title={title} back={back} onAdd={add} />
  ) : (
    <SurveyLinkStep key={kind} kind={kind} title={title} back={back} onAdd={add} />
  );
}

function CustomLinkStep({
  title,
  back,
  onAdd,
}: Readonly<{
  title: string;
  back: React.ReactNode;
  onAdd: (link: Omit<LinktreeLink, "id">) => Promise<void>;
}>) {
  const { t } = useTranslation();
  const form = useCustomLinkForm({ linkDisplayName: "", linkUrl: "" });
  const submit = form.handleSubmit((values) => onAdd({ linkType: "custom-link", ...values }));

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <CustomLinkFields form={form} />
      <DialogFooter>
        {back}
        <Button type="submit" loading={form.formState.isSubmitting}>
          {t("Add link")}
        </Button>
      </DialogFooter>
    </form>
  );
}

function SurveyLinkStep({
  kind,
  title,
  back,
  onAdd,
}: Readonly<{
  kind: SurveyLinkType;
  title: string;
  back: React.ReactNode;
  onAdd: (link: Omit<LinktreeLink, "id">) => Promise<void>;
}>) {
  const { t } = useTranslation();
  const { data: surveys = [], isPending } = useLinkTypeOptions(kind);
  const [survey, setSurvey] = useState<LinktreeSurveyOption | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);

  const teams = survey?.teams ?? [];
  const team = teams.find(({ id }) => id === teamId) ?? null;
  const teamItems = teams.map(({ id, team: { name: teamName } }) => ({
    value: id,
    label: teamName,
  }));

  const pickSurvey = (next: LinktreeSurveyOption | null) => {
    setSurvey(next);
    setTeamId(next?.teams.length === 1 ? next.teams[0].id : null);
    if (next && (!name || name === survey?.title)) setName(next.title);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowErrors(true);
    if (!team || !name.trim()) return;
    setSaving(true);
    try {
      await onAdd({
        linkType: kind,
        linkDisplayName: name.trim(),
        linkUrl: surveyLinkUrl(kind, team),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <FieldGroup>
        <Field data-invalid={showErrors && !survey}>
          <FieldLabel htmlFor="link-survey">{t("Survey")}</FieldLabel>
          <Combobox
            items={surveys}
            value={survey}
            onValueChange={pickSurvey}
            itemToStringLabel={(item) => item.title}
            itemToStringValue={(item) => item.id}
            isItemEqualToValue={(item, value) => item.id === value.id}
          >
            <ComboboxInput
              id="link-survey"
              className="w-full"
              placeholder={isPending ? t("Loading surveys…") : t("Search your surveys")}
              disabled={isPending}
              aria-invalid={showErrors && !survey}
            />
            <ComboboxContent align="start">
              <ComboboxEmpty>
                {surveys.length
                  ? t("No survey by that name.")
                  : t("You have no surveys of this kind yet.")}
              </ComboboxEmpty>
              <ComboboxList>
                {(item: LinktreeSurveyOption) => (
                  <ComboboxItem key={item.id} value={item}>
                    {item.title}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
          {showErrors && !survey && <FieldError>{t("Pick a survey.")}</FieldError>}
          {survey && teams.length === 0 && (
            <FieldError>
              {t("This survey isn't shared with any team yet, so it has no link.")}
            </FieldError>
          )}
        </Field>
        {teams.length > 1 && (
          <Field data-invalid={showErrors && !team}>
            <FieldLabel htmlFor="link-team">{t("Team")}</FieldLabel>
            <Select items={teamItems} value={teamId} onValueChange={setTeamId}>
              <SelectTrigger id="link-team" className="w-full" aria-invalid={showErrors && !team}>
                <SelectValue placeholder={t("Whose copy of the survey?")} />
              </SelectTrigger>
              <SelectContent>
                {teamItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {showErrors && !team && <FieldError>{t("Pick a team.")}</FieldError>}
          </Field>
        )}
        <Field data-invalid={showErrors && !name.trim()}>
          <FieldLabel htmlFor="link-survey-name">{t("Button text")}</FieldLabel>
          <Input
            id="link-survey-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={showErrors && !name.trim()}
          />
          {showErrors && !name.trim() && (
            <FieldError>{t("Say what the button is for.")}</FieldError>
          )}
        </Field>
      </FieldGroup>
      <DialogFooter>
        {back}
        <Button type="submit" loading={saving}>
          {t("Add link")}
        </Button>
      </DialogFooter>
    </form>
  );
}
