import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useApplyMessagesStepMutation } from "@/backend/loyalty/onboarding.query";
import { useWaTemplates } from "@/backend/whatsapp/whatsapp.query";
import { TemplateType } from "@/types/enums.ts";

import { useProgramEditorData } from "../onboarding/useProgramEditorData.ts";
import { KeywordRepliesSection } from "./KeywordRepliesSection.tsx";
import type { LoyaltyMessageDefinition } from "./loyaltyMessageCatalog.ts";
import { NewTemplateDialog } from "./NewTemplateDialog.tsx";

/**
 * What the programme says back when a customer texts it. Plain replies, exactly as the
 * setup wizard writes them — plus, per reply, a template for customers who have never
 * messaged and so cannot be reached with plain text.
 */
export function RepliesTab() {
  const { t } = useTranslation();
  const { data: editorData } = useProgramEditorData();
  const { data: templates = [] } = useWaTemplates(TemplateType.LOYALTY);
  const [creating, setCreating] = useState<LoyaltyMessageDefinition | null>(null);

  const seed = useApplyMessagesStepMutation((result) => {
    if (result.skipped.length > 0) {
      toast.error(
        t("Some keywords are already in use: {keywords}", {
          keywords: result.skipped.map((s) => s.requestMessage).join(", "),
        }),
      );
      return;
    }
    toast.success(t("Saved"));
  });

  const standardReplies = useMemo(
    () =>
      editorData?.defaults.messages.commands.map((command) => ({
        type: String(command.type),
        requestMessage: String(command.requestMessage),
        text: String(command.text),
      })) ?? [],
    [editorData],
  );

  return (
    <>
      <KeywordRepliesSection
        templates={templates}
        suggestedJoinText={editorData?.suggestedJoinText}
        seeding={seed.isPending}
        onSeed={
          standardReplies.length > 0
            ? () => seed.mutate({ commands: standardReplies, eventTemplates: [] })
            : undefined
        }
        onCreateTemplate={setCreating}
      />
      <NewTemplateDialog
        open={creating !== null}
        starter={creating}
        onClose={() => setCreating(null)}
      />
    </>
  );
}
