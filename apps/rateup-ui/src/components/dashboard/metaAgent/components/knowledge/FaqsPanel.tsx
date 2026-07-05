import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";

import {
  useCreateFaq,
  useDeleteFaq,
  useFaqs,
  useSyncFaqs,
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

export function FaqsPanel({ waSettingsId }: { waSettingsId: string }) {
  const { data: faqs, isLoading } = useFaqs(waSettingsId);
  const createFaq = useCreateFaq(waSettingsId);
  const deleteFaq = useDeleteFaq(waSettingsId);
  const sync = useSyncFaqs(waSettingsId);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [adding, setAdding] = useState(false);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>FAQs ({faqs?.length ?? 0})</CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={sync.isPending}
            onClick={() => sync.mutate()}
          >
            <RefreshCw data-icon="inline-start" className={sync.isPending ? "animate-spin" : ""} />
            Sync
          </Button>
          <Button size="sm" onClick={() => setAdding((v) => !v)}>
            <Plus data-icon="inline-start" />
            Add FAQ
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {adding && (
          <FieldGroup className="rounded-lg border p-3">
            <Field>
              <FieldLabel htmlFor="faq-question">Question</FieldLabel>
              <Input
                id="faq-question"
                placeholder="What a customer would ask"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="faq-answer">Answer</FieldLabel>
              <Textarea
                id="faq-answer"
                placeholder="Factual, concise answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!question || !answer || createFaq.isPending}
                onClick={() =>
                  createFaq.mutate(
                    { question, answer },
                    {
                      onSuccess: () => {
                        setQuestion("");
                        setAnswer("");
                        setAdding(false);
                      },
                    },
                  )
                }
              >
                Save
              </Button>
            </div>
          </FieldGroup>
        )}

        {isLoading && (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {!isLoading && !faqs?.length && (
          <Empty className="border-none py-8">
            <EmptyTitle>No FAQs yet</EmptyTitle>
            <EmptyDescription>Add one, or sync existing FAQs already set on Meta.</EmptyDescription>
          </Empty>
        )}

        {!!faqs?.length && (
          <Accordion multiple>
            {faqs.map((faq) => (
              <AccordionItem key={faq.id} value={faq.id}>
                <div className="flex items-center gap-2">
                  <AccordionTrigger className="py-3">{faq.question}</AccordionTrigger>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0"
                    disabled={deleteFaq.isPending}
                    onClick={() => deleteFaq.mutate(faq.id)}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </div>
                <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
