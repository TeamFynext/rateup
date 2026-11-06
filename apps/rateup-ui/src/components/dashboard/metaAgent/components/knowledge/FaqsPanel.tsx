import { zodResolver } from "@hookform/resolvers/zod";
import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import type { Faq } from "@/backend/metaAgent/metaAgent.api";
import {
  useCreateFaq,
  useDeleteFaq,
  useFaqs,
  useSyncFaqs,
  useUpdateFaq,
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

import { faqFormSchema, type FaqFormValues } from "../../metaAgent.schemas";
import { FormField } from "../shared/FormField";
import { PanelCard } from "../shared/PanelCard";

export function FaqsPanel({ waSettingsId }: Readonly<{ waSettingsId: string }>) {
  const { data: faqs, isLoading } = useFaqs(waSettingsId);
  const deleteFaq = useDeleteFaq(waSettingsId);
  const sync = useSyncFaqs(waSettingsId);
  const [editing, setEditing] = useState<Faq | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <PanelCard
      title="FAQs"
      description="Question and answer pairs the agent can quote verbatim."
      count={faqs?.length ?? 0}
      onSync={() => sync.mutate()}
      isSyncing={sync.isPending}
      actions={
        <Button size="sm" onClick={() => setCreating(true)}>
          <IconPlus data-icon="inline-start" />
          Add FAQ
        </Button>
      }
    >
      {isLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {!isLoading && !faqs?.length && (
        <Empty className="border-none py-8">
          <EmptyTitle>No FAQs yet</EmptyTitle>
          <EmptyDescription>
            Add one, or sync the FAQs already configured on this number at Meta.
          </EmptyDescription>
        </Empty>
      )}

      {!!faqs?.length && (
        <Accordion multiple>
          {faqs.map((faq) => (
            <AccordionItem key={faq.id} value={faq.id}>
              <div className="flex items-center gap-1">
                <AccordionTrigger className="py-3">{faq.question}</AccordionTrigger>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0"
                  aria-label={`Edit "${faq.question}"`}
                  onClick={() => setEditing(faq)}
                >
                  <IconPencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0"
                  aria-label={`Delete "${faq.question}"`}
                  loading={deleteFaq.isPending}
                  onClick={() => deleteFaq.mutate(faq.id)}
                >
                  <IconTrash className="text-destructive" />
                </Button>
              </div>
              <AccordionContent className="whitespace-pre-wrap text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      <FaqDialog
        waSettingsId={waSettingsId}
        faq={editing}
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

function FaqDialog({
  waSettingsId,
  faq,
  open,
  onOpenChange,
}: Readonly<{
  waSettingsId: string;
  faq: Faq | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>) {
  const createFaq = useCreateFaq(waSettingsId);
  const updateFaq = useUpdateFaq(waSettingsId);

  const form = useForm<FaqFormValues>({
    resolver: zodResolver(faqFormSchema),
    values: { question: faq?.question ?? "", answer: faq?.answer ?? "" },
  });

  const isPending = createFaq.isPending || updateFaq.isPending;

  const onSubmit = (values: FaqFormValues) => {
    const done = { onSuccess: () => onOpenChange(false) };
    if (faq) updateFaq.mutate({ faqId: faq.id, data: values }, done);
    else createFaq.mutate(values, done);
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{faq ? "Edit FAQ" : "Add FAQ"}</DialogTitle>
          <DialogDescription>
            Write the question the way a customer would actually ask it, and keep the answer
            self-contained.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <FieldGroup className="-mx-6 max-h-[50vh] gap-4 overflow-y-auto px-6 py-1">
            <FormField
              control={form.control}
              name="question"
              label="Question"
              required
              hint={`${form.watch("question").length}/1000`}
            >
              {(field, controlProps) => (
                <Input {...field} {...controlProps} placeholder="Do you ship internationally?" />
              )}
            </FormField>
            <FormField
              control={form.control}
              name="answer"
              label="Answer"
              required
              hint={`${form.watch("answer").length}/5000`}
            >
              {(field, controlProps) => (
                <Textarea
                  {...field}
                  {...controlProps}
                  rows={5}
                  placeholder="Yes — we ship to 30 countries, and delivery takes 7–10 working days."
                />
              )}
            </FormField>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isPending}>
              {faq ? "Save changes" : "Create FAQ"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
