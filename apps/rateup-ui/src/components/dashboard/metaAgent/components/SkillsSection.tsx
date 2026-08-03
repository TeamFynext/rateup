import { IconPlus, IconRefresh, IconTrash } from "@tabler/icons-react";
import { useState } from "react";

import {
  useCreateSkill,
  useDeleteSkill,
  useSkills,
  useSyncSkills,
} from "@/backend/metaAgent/metaAgent.query";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

export function SkillsSection({ waSettingsId }: { waSettingsId: string }) {
  const { data: skills, isLoading } = useSkills(waSettingsId);
  const createSkill = useCreateSkill(waSettingsId);
  const deleteSkill = useDeleteSkill(waSettingsId);
  const sync = useSyncSkills(waSettingsId);

  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skill, setSkill] = useState("");

  const reset = () => {
    setTitle("");
    setDescription("");
    setSkill("");
    setAdding(false);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Skills ({skills?.length ?? 0})</CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={sync.isPending}
            onClick={() => sync.mutate()}
          >
            <IconRefresh
              data-icon="inline-start"
              className={sync.isPending ? "animate-spin" : ""}
            />
            Sync
          </Button>
          <Button size="sm" onClick={() => setAdding((v) => !v)}>
            <IconPlus data-icon="inline-start" />
            Add skill
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {adding && (
          <FieldGroup className="rounded-lg border p-3">
            <Field>
              <FieldLabel htmlFor="skill-title">Title</FieldLabel>
              <Input
                id="skill-title"
                placeholder="e.g. order-status-lookup"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="skill-description">When to use it</FieldLabel>
              <Textarea
                id="skill-description"
                placeholder="Trigger or context for applying this skill"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="skill-body">Instructions</FieldLabel>
              <Textarea
                id="skill-body"
                placeholder="Detailed instructions for the agent"
                rows={5}
                value={skill}
                onChange={(e) => setSkill(e.target.value)}
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={reset}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!title || !description || !skill || createSkill.isPending}
                onClick={() =>
                  createSkill.mutate({ title, description, skill }, { onSuccess: reset })
                }
              >
                Save
              </Button>
            </div>
          </FieldGroup>
        )}

        {isLoading && (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        )}

        {!isLoading && !skills?.length && (
          <Empty className="border-none py-8">
            <EmptyTitle>No skills configured</EmptyTitle>
            <EmptyDescription>Teach the agent a repeatable capability.</EmptyDescription>
          </Empty>
        )}

        {!!skills?.length && (
          <Accordion multiple>
            {skills.map((s) => (
              <AccordionItem key={s.id} value={s.id}>
                <div className="flex items-center gap-2">
                  <AccordionTrigger className="py-3">
                    <span className="flex flex-col items-start gap-0.5">
                      <code className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                        {s.title}
                      </code>
                      <span className="text-xs font-normal text-muted-foreground">
                        {s.description}
                      </span>
                    </span>
                  </AccordionTrigger>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0"
                    disabled={deleteSkill.isPending}
                    onClick={() => deleteSkill.mutate(s.id)}
                  >
                    <IconTrash className="text-destructive" />
                  </Button>
                </div>
                <AccordionContent>
                  <pre className="max-h-48 overflow-auto rounded-md bg-muted/60 p-3 text-xs whitespace-pre-wrap">
                    {s.skill}
                  </pre>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
