import { IconMailExclamation, IconTrash } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useId, useState } from "react";

import { isReauthRequired } from "@/api/client";
import {
  orgDeletionQueryOptions,
  useDeleteOrg,
  useSendDeletionWarning,
  type OrgDeletionPreview,
} from "@/api/org-actions.api";
import type { OrgSummary } from "@/api/orgs.api";
import { ActionDialog, done, Notice } from "@/components/ds/action-dialog";
import { ErrorState, PanelSkeleton } from "@/components/ds/query-states";
import { StepUpPrompt } from "@/components/ds/step-up";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatNumber } from "@/lib/format";
import { rememberIntent, takeIntent } from "@/lib/resume";

/**
 * The irreversible end of an account: warn the owner, or delete it. Deleting needs a Google
 * sign-in from the last 15 minutes and the name typed back; the trip to Google comes back
 * here with the dialog reopened.
 */
export function OrgDangerTab({ org }: { org: OrgSummary }) {
  const preview = useQuery(orgDeletionQueryOptions(org.id));
  const path = `/orgs/${org.id}`;
  const [dialog, setDialog] = useState<"warn" | "delete" | null>(() =>
    takeIntent(path, "delete-org") ? "delete" : null,
  );

  if (preview.isPending) return <PanelSkeleton panels={2} />;
  if (preview.isError) {
    return <ErrorState error={preview.error} onRetry={() => void preview.refetch()} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <Row
        icon={IconMailExclamation}
        title="Send deletion warning"
        description={`Emails ${org.owner.email} that the account will be deleted in 7 days unless they act. Nothing is deleted by this.`}
        action="Send warning"
        onClick={() => setDialog("warn")}
      />
      <Row
        icon={IconTrash}
        title="Delete organisation"
        description="Removes the organisation, its teams, surveys, contacts and messages for good. Orders are kept for the books."
        action="Delete organisation"
        destructive
        onClick={() => setDialog("delete")}
      />

      {dialog === "warn" && <WarnDialog org={org} onClose={() => setDialog(null)} />}
      {dialog === "delete" && (
        <DeleteDialog
          org={org}
          preview={preview.data}
          path={path}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}

function Row({
  icon: Icon,
  title,
  description,
  action,
  destructive,
  onClick,
}: {
  icon: typeof IconTrash;
  title: string;
  description: string;
  action: string;
  destructive?: boolean;
  onClick: () => void;
}) {
  return (
    <section
      className={
        destructive
          ? "flex flex-col gap-4 rounded-3xl border border-negative/30 p-6 sm:flex-row sm:items-center sm:justify-between"
          : "flex flex-col gap-4 rounded-3xl border p-6 sm:flex-row sm:items-center sm:justify-between"
      }
    >
      <div className="flex min-w-0 items-start gap-4">
        <div
          className={
            destructive
              ? "grid size-11 shrink-0 place-items-center rounded-2xl bg-negative/10 text-negative"
              : "grid size-11 shrink-0 place-items-center rounded-2xl bg-muted"
          }
        >
          <Icon className="size-5" stroke={1.75} />
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-[15px] font-semibold">{title}</p>
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <Button
        variant={destructive ? "destructive" : "outline"}
        className="h-11 shrink-0 rounded-xl px-4"
        onClick={onClick}
      >
        {action}
      </Button>
    </section>
  );
}

function WarnDialog({ org, onClose }: { org: OrgSummary; onClose: () => void }) {
  const mutation = useSendDeletionWarning(org.id);
  return (
    <ActionDialog
      open
      onOpenChange={onClose}
      title="Send deletion warning"
      description={`To ${org.owner.email}. They are told the account will be deleted in 7 days; the RateUp team gets a reminder too.`}
      submitLabel="Send warning"
      pending={mutation.isPending}
      error={mutation.error}
      onSubmit={(reason) =>
        mutation.mutate(
          { reason },
          { onSuccess: ({ sentTo }) => done(`Warning sent to ${sentTo}.`, onClose) },
        )
      }
    >
      <Notice tone="info">
        The deletion itself is not scheduled. When the 7 days are up, delete it from here.
      </Notice>
    </ActionDialog>
  );
}

function DeleteDialog({
  org,
  preview,
  path,
  onClose,
}: {
  org: OrgSummary;
  preview: OrgDeletionPreview;
  path: string;
  onClose: () => void;
}) {
  const mutation = useDeleteOrg(org.id);
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState("");
  const confirmId = useId();
  const stepUp = isReauthRequired(mutation.error);
  const billing = preview.liveSubscriptions.length > 0;

  return (
    <ActionDialog
      open
      onOpenChange={onClose}
      destructive
      title={`Delete ${org.name}`}
      description="This cannot be undone."
      submitLabel="Delete for good"
      canSubmit={!billing && !stepUp && confirm.trim() === org.name.trim()}
      pending={mutation.isPending}
      error={stepUp ? null : mutation.error}
      onSubmit={(reason) =>
        mutation.mutate(
          { confirm: confirm.trim(), reason },
          {
            onSuccess: () =>
              done(`${org.name} deleted.`, () => {
                onClose();
                void navigate({ to: "/orgs" });
              }),
          },
        )
      }
    >
      {stepUp ? (
        <StepUpPrompt
          onBeforeLeave={() => rememberIntent({ path, kind: "delete-org", id: org.id })}
        />
      ) : (
        <>
          {billing && (
            <Notice>
              A payment gateway is still billing this organisation (
              {preview.liveSubscriptions.map((sub) => sub.subscriptionId).join(", ")}). Cancel the
              subscription first.
            </Notice>
          )}
          <dl className="grid grid-cols-2 gap-3 rounded-2xl bg-muted p-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Members</dt>
              <dd className="font-medium tabular">{formatNumber(preview.members)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Teams</dt>
              <dd className="font-medium tabular">{formatNumber(preview.teams)}</dd>
            </div>
          </dl>
          <People
            title="Accounts deleted"
            hint="This is their only organisation; their sign-in goes too."
            people={preview.usersDeleted}
          />
          <People
            title="Accounts kept"
            hint="They belong to another organisation, so only their membership here goes."
            people={preview.usersKept}
          />
          <div className="flex flex-col gap-2">
            <Label htmlFor={confirmId}>
              Type <span className="font-semibold">{org.name}</span> to confirm
            </Label>
            <Input
              id={confirmId}
              autoComplete="off"
              spellCheck={false}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              className="h-11 rounded-xl"
            />
          </div>
        </>
      )}
    </ActionDialog>
  );
}

function People({
  title,
  hint,
  people,
}: {
  title: string;
  hint: string;
  people: OrgDeletionPreview["usersDeleted"];
}) {
  if (people.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">
        {title} · {people.length}
      </p>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <ul className="flex max-h-32 flex-col gap-1 overflow-y-auto text-sm">
        {people.map((person) => (
          <li key={person.id} className="truncate">
            {person.name ? `${person.name} · ` : ""}
            <span className="text-muted-foreground">{person.email}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
