import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconAlertTriangle,
  IconCarouselHorizontal,
  IconExternalLink,
  IconList,
  IconMapPin,
  IconMapPinShare,
  IconMessageReply,
  IconPencil,
  IconPhoto,
  IconPlus,
  IconRoute,
  IconTrash,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import {
  UI_SKILL_COMPONENT_TYPES,
  type UiSkill,
  type UiSkillComponentType,
} from "@/backend/metaAgent/metaAgent.api";
import {
  useCreateUiSkill,
  useDeleteUiSkill,
  useSyncUiSkills,
  useUiSkills,
  useUpdateUiSkill,
} from "@/backend/metaAgent/metaAgent.query";
import { useAllSurveysSummary } from "@/backend/surveys/surveys.query";
import { useWaFlowsFromDb } from "@/backend/whatsapp/flow/flow.query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FlowSelector } from "@/components/whatsapp/flows/FlowSelector/FlowSelector";
import { FRONTEND_URL } from "@/utils/constants";

import { uiSkillFormSchema, type UiSkillFormValues } from "../metaAgent.schemas";
import { FormField } from "./shared/FormField";
import { PanelCard } from "./shared/PanelCard";

const COMPONENTS: Record<
  UiSkillComponentType,
  { label: string; blurb: string; icon: React.ComponentType<{ className?: string }> }
> = {
  carousel_quick_reply: {
    label: "Carousel with quick replies",
    blurb: "A swipeable card set where each card offers tappable replies.",
    icon: IconCarouselHorizontal,
  },
  carousel_url: {
    label: "Carousel with links",
    blurb: "A swipeable card set where each card links out to your site.",
    icon: IconCarouselHorizontal,
  },
  cta_url: {
    label: "Call-to-action link",
    blurb: "A single message with one prominent link button.",
    icon: IconExternalLink,
  },
  flow: {
    label: "WhatsApp Flow",
    blurb: "Opens one of your published Flows.",
    icon: IconRoute,
  },
  image: { label: "Image", blurb: "Sends an image alongside the reply.", icon: IconPhoto },
  interactive_list: {
    label: "Interactive list",
    blurb: "A tappable list of options in a bottom sheet.",
    icon: IconList,
  },
  interactive_reply_buttons: {
    label: "Reply buttons",
    blurb: "Up to three tappable reply buttons under the message.",
    icon: IconMessageReply,
  },
  location: { label: "Location", blurb: "Shares a pin on the map.", icon: IconMapPin },
  location_request: {
    label: "Location request",
    blurb: "Asks the customer to share where they are.",
    icon: IconMapPinShare,
  },
};

/**
 * Meta stores a flow by id; a bare 16-digit number means nothing to the person
 * reading the list, so it is resolved back to the flow's name where we know it.
 */
function useFlowName() {
  const { data: flows } = useWaFlowsFromDb();
  return (flowId?: string | null) => {
    if (!flowId) return null;
    return flows?.find((flow) => String(flow.flowId) === String(flowId))?.name ?? `Flow ${flowId}`;
  };
}

/** Meta's cta_url: body text, a button label of 1–20 characters, and the URL. */
/**
 * A survey can be for anything — feedback, a booking request, a sign-up — so
 * the draft names the survey and leaves "when" for the business to say.
 */
const surveyInstruction = (title: string, url: string) =>
  `When a customer asks about ${title.trim()} or it would help them to fill it in, send a button with the body text "Please fill in our ${title.trim()} form. It only takes a minute.", the button label "Open form", and the URL ${url} exactly as written.`;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * A link WhatsApp cannot open: a button needs a public https address, so
 * localhost, private hosts and plain http are dropped from the message.
 */
function unreachableLink(text: string): string | null {
  for (const match of text.match(/https?:\/\/[^\s"')]+/g) ?? []) {
    try {
      const { protocol, hostname } = new URL(match);
      const privateHost =
        hostname === "localhost" ||
        hostname.endsWith(".local") ||
        /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.)/.test(hostname);
      if (protocol !== "https:" || privateHost) return match;
    } catch {
      return match;
    }
  }
  return null;
}

interface WebSurveyTeamLink {
  mapId: string;
  teamName: string;
  url: string;
}

interface WebSurveyLinks {
  id: string;
  title: string;
  slug: string;
  teams: WebSurveyTeamLink[];
}

/** Every web survey with at least one team that has a public link. */
function useWebSurveyLinks(): WebSurveyLinks[] {
  const { data } = useAllSurveysSummary();
  return useMemo(() => {
    const origin = (FRONTEND_URL ?? "").replace(/\/+$/, "");
    // A localhost link still fills in, so the flow can be tried in development;
    // the form's link warning says WhatsApp will not open it.
    if (!origin) return [];
    return (data?.surveys ?? [])
      .filter((survey) => survey.type === "web")
      .map((survey) => ({
        id: survey.id,
        title: survey.title,
        slug: `survey-${slugify(survey.title)}`.slice(0, 64).replace(/-+$/, ""),
        teams: survey.teams
          .filter((team) => !!team.shortUrlId)
          .map((team) => ({
            mapId: team.mapId,
            teamName: team.teamName,
            url: `${origin}/ws/${team.shortUrlId}`,
          })),
      }))
      .filter((survey) => survey.teams.length > 0);
  }, [data]);
}

/**
 * Survey first, then the team whose link to use. A survey with one team skips
 * the second step, since there is nothing to choose.
 */
function WebSurveyPicker({
  surveys,
  onPick,
}: Readonly<{
  surveys: WebSurveyLinks[];
  onPick: (link: { slug: string; title: string; url: string }) => void;
}>) {
  const [surveyId, setSurveyId] = useState<string | null>(null);
  const [mapId, setMapId] = useState<string | null>(null);
  const survey = surveys.find((item) => item.id === surveyId);

  if (!surveys.length) {
    return (
      <Field>
        <FieldLabel>Web survey (optional)</FieldLabel>
        <FieldDescription>
          No web surveys with a share link yet. Create a web survey and assign it to a team, and it
          can be sent from here as a button that opens it.
        </FieldDescription>
      </Field>
    );
  }

  const surveyItems = surveys.map((item) => ({ value: item.id, label: item.title }));
  const teamItems = (survey?.teams ?? []).map((team) => ({
    value: team.mapId,
    label: team.teamName,
  }));

  const pickTeam = (picked: WebSurveyLinks, team: WebSurveyTeamLink) => {
    setMapId(team.mapId);
    onPick({ slug: picked.slug, title: picked.title, url: team.url });
  };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Field>
        <FieldLabel htmlFor="ui-skill-survey">Web survey (optional)</FieldLabel>
        <Select
          items={surveyItems}
          value={surveyId}
          onValueChange={(value) => {
            const picked = surveys.find((item) => item.id === value);
            setSurveyId(picked?.id ?? null);
            setMapId(null);
            if (picked?.teams.length === 1) pickTeam(picked, picked.teams[0]);
          }}
        >
          <SelectTrigger id="ui-skill-survey" className="w-full">
            <SelectValue placeholder="Choose a web survey" />
          </SelectTrigger>
          <SelectContent>
            {surveyItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field data-disabled={!survey || undefined}>
        <FieldLabel htmlFor="ui-skill-survey-team">Team</FieldLabel>
        <Select
          items={teamItems}
          value={mapId}
          disabled={!survey}
          onValueChange={(value) => {
            const team = survey?.teams.find((item) => item.mapId === value);
            if (survey && team) pickTeam(survey, team);
          }}
        >
          <SelectTrigger id="ui-skill-survey-team" className="w-full">
            <SelectValue placeholder={survey ? "Choose a team" : "Choose a survey first"} />
          </SelectTrigger>
          <SelectContent>
            {teamItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <FieldDescription className="sm:col-span-2">
        Fills in a button that opens the survey for that team — edit when to send it and the wording
        to suit what the survey is for. The link is the same for every customer, as when a rule
        sends it.
      </FieldDescription>
    </div>
  );
}

export function UiSkillsSection({ waSettingsId }: Readonly<{ waSettingsId: string }>) {
  const flowName = useFlowName();
  const { data: uiSkills, isLoading } = useUiSkills(waSettingsId);
  const deleteUiSkill = useDeleteUiSkill(waSettingsId);
  const updateUiSkill = useUpdateUiSkill(waSettingsId);
  const sync = useSyncUiSkills(waSettingsId);
  const [editing, setEditing] = useState<UiSkill | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <PanelCard
      title="UI skills"
      description="Rich components the agent may send instead of plain text. Disabled ones stay configured but unused."
      count={uiSkills?.length ?? 0}
      onSync={() => sync.mutate()}
      isSyncing={sync.isPending}
      actions={
        <Button size="sm" onClick={() => setCreating(true)}>
          <IconPlus data-icon="inline-start" />
          Add UI skill
        </Button>
      }
    >
      {isLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {!isLoading && !uiSkills?.length && (
        <Empty className="border-none py-8">
          <EmptyTitle>No UI skills configured</EmptyTitle>
          <EmptyDescription>
            Let the agent answer with a carousel, a link button or one of your WhatsApp Flows rather
            than a wall of text.
          </EmptyDescription>
        </Empty>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {uiSkills?.map((uiSkill) => {
          const meta = COMPONENTS[uiSkill.componentType];
          const Icon = meta?.icon ?? IconPhoto;
          const enabled = uiSkill.status === "enabled";
          return (
            <div key={uiSkill.id} className="flex flex-col gap-2 rounded-lg border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2.5">
                  <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{uiSkill.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {meta?.label ?? uiSkill.componentType}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${uiSkill.title}`}
                    onClick={() => setEditing(uiSkill)}
                  >
                    <IconPencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${uiSkill.title}`}
                    loading={deleteUiSkill.isPending}
                    onClick={() => deleteUiSkill.mutate(uiSkill.id)}
                  >
                    <IconTrash className="text-destructive" />
                  </Button>
                </div>
              </div>

              <p className="line-clamp-2 text-xs text-muted-foreground">{uiSkill.instruction}</p>

              <div className="flex items-center justify-between gap-2 border-t pt-2">
                {uiSkill.flowId ? (
                  <Badge variant="outline" className="max-w-40 truncate text-xs">
                    <IconRoute data-icon="inline-start" />
                    {flowName(uiSkill.flowId)}
                  </Badge>
                ) : (
                  <span />
                )}
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  {enabled ? "Enabled" : "Disabled"}
                  <Switch
                    checked={enabled}
                    aria-label={`${enabled ? "Disable" : "Enable"} ${uiSkill.title}`}
                    disabled={updateUiSkill.isPending}
                    onCheckedChange={(checked) =>
                      updateUiSkill.mutate({
                        uiSkillId: uiSkill.id,
                        data: { status: checked ? "enabled" : "disabled" },
                      })
                    }
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>

      <UiSkillDialog
        waSettingsId={waSettingsId}
        uiSkill={editing}
        open={creating || !!editing}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setEditing(null);
          }
        }}
      />
    </PanelCard>
  );
}

function UiSkillDialog({
  waSettingsId,
  uiSkill,
  open,
  onOpenChange,
}: Readonly<{
  waSettingsId: string;
  uiSkill: UiSkill | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>) {
  const createUiSkill = useCreateUiSkill(waSettingsId);
  const updateUiSkill = useUpdateUiSkill(waSettingsId);
  const flowName = useFlowName();

  const form = useForm<UiSkillFormValues>({
    resolver: zodResolver(uiSkillFormSchema),
    values: {
      title: uiSkill?.title ?? "",
      component_type: uiSkill?.componentType ?? "cta_url",
      status: uiSkill?.status ?? "enabled",
      instruction: uiSkill?.instruction ?? "",
      flow_id: uiSkill?.flowId ?? "",
    },
  });

  const componentType = form.watch("component_type");
  const surveyLinks = useWebSurveyLinks();
  const badLink = unreachableLink(form.watch("instruction"));
  const isPending = createUiSkill.isPending || updateUiSkill.isPending;

  const onSubmit = (values: UiSkillFormValues) => {
    const done = { onSuccess: () => onOpenChange(false) };
    if (uiSkill) {
      // Meta's update endpoint takes only these three — component_type and
      // flow_id are fixed once the skill exists.
      updateUiSkill.mutate(
        {
          uiSkillId: uiSkill.id,
          data: {
            title: values.title,
            status: values.status,
            instruction: values.instruction,
          },
        },
        done,
      );
      return;
    }
    createUiSkill.mutate(
      {
        title: values.title,
        component_type: values.component_type,
        status: values.status,
        instruction: values.instruction,
        ...(values.component_type === "flow" && values.flow_id ? { flow_id: values.flow_id } : {}),
      },
      done,
    );
  };

  const componentItems = UI_SKILL_COMPONENT_TYPES.map((value) => ({
    value,
    label: COMPONENTS[value].label,
  }));

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      // The dialog stays mounted between opens, and `values` only resets the form
      // when it changes — two "Add"s in a row pass the same empty values, so the
      // last draft would reappear. Reset once it has finished closing instead.
      onOpenChangeComplete={(isOpen) => !isOpen && form.reset()}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{uiSkill ? "Edit UI skill" : "Add UI skill"}</DialogTitle>
          <DialogDescription>
            {uiSkill
              ? "The component type is fixed once a UI skill exists — delete and recreate it to change that."
              : "Pick a component and describe the moment the agent should reach for it."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="gap-4">
            <FormField
              control={form.control}
              name="title"
              label="Title"
              required
              description="Lowercase letters, numbers and hyphens, like book-a-table."
            >
              {(field, controlProps) => (
                <Input {...field} {...controlProps} placeholder="book-a-table" />
              )}
            </FormField>

            <FormField
              control={form.control}
              name="component_type"
              label="Component type"
              required
              description={COMPONENTS[componentType]?.blurb}
            >
              {(field, controlProps) => (
                <Select
                  name={field.name}
                  value={field.value}
                  onValueChange={(value) => field.onChange(value ?? "cta_url")}
                  disabled={!!uiSkill}
                  items={componentItems}
                >
                  <SelectTrigger {...controlProps} className="w-full">
                    <SelectValue placeholder="Choose a component" />
                  </SelectTrigger>
                  <SelectContent>
                    {componentItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>

            {componentType === "flow" &&
              // Meta's update endpoint does not accept flow_id, so on an existing
              // skill the flow is shown rather than offered — a picker you cannot
              // save would just be a trap.
              (uiSkill ? (
                <Field>
                  <FieldLabel>Flow</FieldLabel>
                  <Badge variant="outline" className="w-fit">
                    <IconRoute data-icon="inline-start" />
                    {flowName(uiSkill.flowId) ?? "—"}
                  </Badge>
                  <FieldDescription>
                    The flow is fixed once a UI skill exists — delete and recreate it to point at a
                    different one.
                  </FieldDescription>
                </Field>
              ) : (
                <Controller
                  control={form.control}
                  name="flow_id"
                  render={({ field, fieldState }) => (
                    // FlowSelector is a complete field in its own right — label,
                    // control and error — so it stands in for FormField here
                    // rather than nesting inside one.
                    <FlowSelector
                      onlyPublished
                      // The Meta-side id, which is what the UI-skills API stores.
                      id="flowId"
                      value={field.value}
                      onChange={field.onChange}
                      label={
                        <span className="flex items-center gap-1 text-sm font-medium">
                          Flow
                          <span aria-hidden className="text-destructive">
                            *
                          </span>
                          <span className="sr-only">(required)</span>
                        </span>
                      }
                      placeholder="Select a published flow"
                      error={fieldState.error?.message}
                    />
                  )}
                />
              ))}

            {componentType === "cta_url" && !uiSkill && (
              <WebSurveyPicker
                surveys={surveyLinks}
                onPick={(link) => {
                  // Fills the form; everything stays editable before saving.
                  form.setValue("title", link.slug, { shouldDirty: true, shouldValidate: true });
                  form.setValue("instruction", surveyInstruction(link.title, link.url), {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
              />
            )}

            <FormField
              control={form.control}
              name="instruction"
              label="When to send it"
              required
              hint={`${form.watch("instruction").length}/4096`}
            >
              {(field, controlProps) => (
                <Textarea
                  {...field}
                  {...controlProps}
                  rows={4}
                  placeholder="When the customer asks to reserve a table or check availability for a date."
                />
              )}
            </FormField>

            {badLink && (
              <Alert variant="destructive">
                <IconAlertTriangle />
                <AlertDescription>
                  WhatsApp can&apos;t open {badLink}, so the button will be left out of the message.
                  Use a public https link, such as your live survey link.
                </AlertDescription>
              </Alert>
            )}

            <FormField control={form.control} name="status" label="Status" orientation="horizontal">
              {(field) => (
                <Switch
                  checked={field.value === "enabled"}
                  onCheckedChange={(checked) => field.onChange(checked ? "enabled" : "disabled")}
                />
              )}
            </FormField>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={isPending}>
                {uiSkill ? "Save changes" : "Create UI skill"}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
