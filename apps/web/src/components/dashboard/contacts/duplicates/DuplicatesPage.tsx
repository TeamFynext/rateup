import { Badge } from "@rateup/ui/components/badge";
import { Button } from "@rateup/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@rateup/ui/components/empty";
import { Skeleton } from "@rateup/ui/components/skeleton";
import { IconScan, IconUsers } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { MergeContact, MergeSuggestion } from "@/backend/campaign/contacts/merge.api";
import {
  useDismissMergeSuggestion,
  useMergeSuggestions,
  useScanForDuplicates,
} from "@/backend/campaign/contacts/merge.query";
import { ListPageError } from "@/components/common/list-page-layout.tsx";
import { PageHeading } from "@/components/common/page-heading.tsx";
import { ContactDetailHost } from "@/components/Contacts/ContactDetailedView.tsx";
import {
  contactDetails,
  contactPlatforms,
  contactName,
  suggestionReasonText,
} from "@/components/Contacts/merge/identity.tsx";
import { MergeContactsDialog } from "@/components/Contacts/merge/MergeContactsDialog.tsx";
import { useOpenKeptContact } from "@/components/Contacts/merge/useOpenKeptContact.ts";
import { Card } from "@/components/ui/card.tsx";
import { CreativeAvatar } from "@/components/ui/creative-avatar.tsx";
import { useCan } from "@/hooks/usePermission.ts";
import { getApiErrorMessage } from "@/utils/apiError.ts";

/** Pending merge suggestions: pairs of contacts that look like one person. */
export function DuplicatesPage() {
  const { t } = useTranslation();
  const canMerge = useCan("contacts.merge");
  const suggestions = useMergeSuggestions();
  const dismiss = useDismissMergeSuggestion();
  const scan = useScanForDuplicates();
  const runScan = () =>
    scan.mutate(undefined, {
      onSuccess: ({ pending }) =>
        toast.success(
          pending
            ? t(
                "{count, plural, one {# possible duplicate} other {# possible duplicates}} to review",
                {
                  count: pending,
                },
              )
            : t("No duplicates found"),
        ),
      onError: (error) => toast.error(getApiErrorMessage(error, t("Could not scan"))),
    });
  const scanButton = canMerge ? (
    <Button variant="outline" onClick={runScan} loading={scan.isPending}>
      <IconScan />
      {t("Scan for duplicates")}
    </Button>
  ) : null;
  const openKeptContact = useOpenKeptContact();
  const [reviewing, setReviewing] = useState<MergeSuggestion | null>(null);
  const items = suggestions.data?.pages.flatMap((page) => page.items) ?? [];

  const notSamePerson = (suggestion: MergeSuggestion) =>
    dismiss.mutate(suggestion.id, {
      onSuccess: () => toast.success(t("Marked as different people")),
      onError: (error) => toast.error(getApiErrorMessage(error, t("Could not dismiss"))),
    });

  return (
    <div className="mx-auto flex w-full max-w-265 flex-col gap-5">
      <PageHeading
        title={t("Possible duplicates")}
        description={t(
          "Contacts that look like the same person. Merge them to keep one history, or mark them as different people.",
        )}
        actions={scanButton}
      />

      {suggestions.isPending ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : suggestions.isError ? (
        <ListPageError onRetry={() => void suggestions.refetch()} />
      ) : items.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconUsers />
            </EmptyMedia>
            <EmptyTitle>{t("No possible duplicates")}</EmptyTitle>
            <EmptyDescription>
              {t(
                "When two contacts share a phone, an email or a WhatsApp account, they show up here. Scan to check the contacts you already have.",
              )}
            </EmptyDescription>
          </EmptyHeader>
          {scanButton && <EmptyContent>{scanButton}</EmptyContent>}
        </Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((suggestion) => (
            <Card key={suggestion.id} className="flex flex-col gap-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant="secondary">
                  {suggestionReasonText(suggestion, suggestion.contactB, t)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {t("Found {date}", { date: dayjs(suggestion.createdAt).format("D MMM YYYY") })}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <SuggestionContact contact={suggestion.contactA} />
                <SuggestionContact contact={suggestion.contactB} />
              </div>
              {canMerge && (
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    loading={dismiss.isPending && dismiss.variables === suggestion.id}
                    onClick={() => notSamePerson(suggestion)}
                  >
                    {t("Not the same person")}
                  </Button>
                  <Button size="sm" onClick={() => setReviewing(suggestion)}>
                    {t("Review")}
                  </Button>
                </div>
              )}
            </Card>
          ))}
          {suggestions.hasNextPage && (
            <Button
              variant="outline"
              className="self-center"
              loading={suggestions.isFetchingNextPage}
              onClick={() => void suggestions.fetchNextPage()}
            >
              {t("Load more")}
            </Button>
          )}
        </div>
      )}

      {reviewing && (
        <MergeContactsDialog
          key={reviewing.id}
          open
          onOpenChange={(open) => {
            if (!open) setReviewing(null);
          }}
          contactIds={[reviewing.contactA.id, reviewing.contactB.id]}
          suggestionId={reviewing.id}
          onMerged={({ targetId }) => void openKeptContact(targetId)}
        />
      )}
      <ContactDetailHost />
    </div>
  );
}

function SuggestionContact({ contact }: Readonly<{ contact: MergeContact }>) {
  const { t } = useTranslation();
  const platforms = contactPlatforms(contact, t);
  const details = contactDetails(contact, t);
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-lg border border-border p-3">
      <CreativeAvatar name={contactName(contact, t)} src={contact.profilePic} size="md" />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-foreground">
            {contactName(contact, t)}
          </span>
          {platforms.map((platform) => (
            <Badge key={platform} variant="outline">
              {platform}
            </Badge>
          ))}
        </div>
        {details.length > 0 && (
          <ul className="flex flex-col text-xs text-foreground/80">
            {details.map((detail) => (
              <li key={detail} className="truncate">
                {detail}
              </li>
            ))}
          </ul>
        )}
        <div className="text-xs text-muted-foreground">
          {t("Added {date}", { date: dayjs(contact.createdAt).format("D MMM YYYY") })}
          {contact.lastReceivedMessageTimeStamp
            ? ` · ${t("Last message {date}", {
                date: dayjs(contact.lastReceivedMessageTimeStamp).format("D MMM YYYY"),
              })}`
            : ""}
        </div>
      </div>
    </div>
  );
}
