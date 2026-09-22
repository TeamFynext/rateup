import { zodResolver } from "@hookform/resolvers/zod";
import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import type { Skill } from "@/backend/metaAgent/metaAgent.api";
import {
  useCreateSkill,
  useDeleteSkill,
  useSkills,
  useSyncSkills,
  useUpdateSkill,
} from "@/backend/metaAgent/metaAgent.query";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

import { skillFormSchema, type SkillFormValues } from "../metaAgent.schemas";
import { FormField } from "./shared/FormField";
import { PanelCard } from "./shared/PanelCard";

export function SkillsSection({ waSettingsId }: Readonly<{ waSettingsId: string }>) {
  const { data: skills, isLoading } = useSkills(waSettingsId);
  const deleteSkill = useDeleteSkill(waSettingsId);
  const sync = useSyncSkills(waSettingsId);
  const [editing, setEditing] = useState<Skill | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <PanelCard
      title="Skills"
      description="Each skill is a named block of instructions plus a description of when to apply it."
      count={skills?.length ?? 0}
      onSync={() => sync.mutate()}
      isSyncing={sync.isPending}
      actions={
        <Button size="sm" onClick={() => setCreating(true)}>
          <IconPlus data-icon="inline-start" />
          Add skill
        </Button>
      }
    >
      {isLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {!isLoading && !skills?.length && (
        <Empty className="border-none py-8">
          <EmptyTitle>No skills configured</EmptyTitle>
          <EmptyDescription>
            Teach the agent a repeatable capability — looking up an order, booking a slot, quoting a
            price.
          </EmptyDescription>
        </Empty>
      )}

      {!!skills?.length && (
        <Accordion multiple>
          {skills.map((skill) => (
            <AccordionItem key={skill.id} value={skill.id}>
              <div className="flex items-center gap-1">
                <AccordionTrigger className="py-3">
                  <span className="flex flex-col items-start gap-0.5">
                    <code className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                      {skill.title}
                    </code>
                    <span className="text-xs font-normal text-muted-foreground">
                      {skill.description}
                    </span>
                  </span>
                </AccordionTrigger>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0"
                  aria-label={`Edit ${skill.title}`}
                  onClick={() => setEditing(skill)}
                >
                  <IconPencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0"
                  aria-label={`Delete ${skill.title}`}
                  loading={deleteSkill.isPending}
                  onClick={() => deleteSkill.mutate(skill.id)}
                >
                  <IconTrash className="text-destructive" />
                </Button>
              </div>
              <AccordionContent>
                <pre className="max-h-64 overflow-auto rounded-md bg-muted/60 p-3 text-xs whitespace-pre-wrap">
                  {skill.skill}
                </pre>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      <SkillDialog
        waSettingsId={waSettingsId}
        skill={editing}
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

function SkillDialog({
  waSettingsId,
  skill,
  open,
  onOpenChange,
}: Readonly<{
  waSettingsId: string;
  skill: Skill | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>) {
  const createSkill = useCreateSkill(waSettingsId);
  const updateSkill = useUpdateSkill(waSettingsId);

  const form = useForm<SkillFormValues>({
    resolver: zodResolver(skillFormSchema),
    values: {
      title: skill?.title ?? "",
      description: skill?.description ?? "",
      skill: skill?.skill ?? "",
    },
  });

  const isPending = createSkill.isPending || updateSkill.isPending;

  const onSubmit = (values: SkillFormValues) => {
    const done = { onSuccess: () => onOpenChange(false) };
    if (skill) updateSkill.mutate({ skillId: skill.id, data: values }, done);
    else createSkill.mutate(values, done);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      // The dialog stays mounted between opens, and `values` only resets the form
      // when it changes — two "Add"s in a row pass the same empty values, so the
      // last draft would reappear. Reset once it has finished closing instead.
      onOpenChangeComplete={(isOpen) => !isOpen && form.reset()}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{skill ? "Edit skill" : "Add skill"}</DialogTitle>
          <DialogDescription>
            The description decides <em>when</em> the agent reaches for this skill; the instructions
            decide what it then does.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="gap-4">
            <FormField
              control={form.control}
              name="title"
              label="Title"
              required
              description="A slug: lowercase letters, numbers and hyphens, up to 64 characters."
            >
              {(field, controlProps) => (
                <Input
                  {...field}
                  {...controlProps}
                  placeholder="order-status-lookup"
                  className="font-mono"
                />
              )}
            </FormField>

            <FormField
              control={form.control}
              name="description"
              label="When to use it"
              required
              hint={`${form.watch("description").length}/1024`}
            >
              {(field, controlProps) => (
                <Textarea
                  {...field}
                  {...controlProps}
                  rows={2}
                  placeholder="When the customer asks where their order is, or gives an order number."
                />
              )}
            </FormField>

            <FormField
              control={form.control}
              name="skill"
              label="Instructions"
              required
              hint={`${form.watch("skill").length.toLocaleString()}/20,000`}
            >
              {(field, controlProps) => (
                <Textarea
                  {...field}
                  {...controlProps}
                  rows={10}
                  className="font-mono text-xs"
                  placeholder={
                    "Ask for the order number if it was not given.\nLook it up with the get_order tool.\nRead back the status and the expected delivery date."
                  }
                />
              )}
            </FormField>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={isPending}>
                {skill ? "Save changes" : "Create skill"}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
