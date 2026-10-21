import { useSetUserPaused, type OrgMember } from "@/api/orgs.api";
import { ActionDialog, done, Notice } from "@/components/ds/action-dialog";

/** Stored before a step-up sign-in; the members tab takes it back and reopens the dialog. */
export const PAUSE_RESUME_KIND = "pause-user";

/** Pause or resume a person's account. Which one depends on where they are now. */
export function MemberPauseDialog({
  user,
  returnPath,
  initialReason,
  onClose,
}: {
  user: OrgMember["user"];
  /** The page to come back to after a step-up sign-in. */
  returnPath: string;
  initialReason?: string;
  onClose: () => void;
}) {
  const mutation = useSetUserPaused();
  const who = user.name ?? user.email;
  const pausing = !user.paused;
  return (
    <ActionDialog
      open
      onOpenChange={onClose}
      destructive={pausing}
      title={pausing ? `Pause ${who}` : `Resume ${who}`}
      description={
        pausing
          ? "They are shown an “account paused” screen on their next request and can do nothing until resumed. Their organisations are unaffected."
          : "They can use their account again straight away."
      }
      submitLabel={pausing ? "Pause account" : "Resume account"}
      pending={mutation.isPending}
      error={mutation.error}
      initialReason={initialReason}
      stepUp={{ path: returnPath, kind: PAUSE_RESUME_KIND, id: user.id }}
      onSubmit={(reason) =>
        mutation.mutate(
          { id: user.id, paused: pausing, reason },
          { onSuccess: () => done(pausing ? `${who} paused.` : `${who} resumed.`, onClose) },
        )
      }
    >
      {pausing ? (
        <Notice>
          The screen says RateUp paused the account and to contact support. Your reason stays in the
          audit log.
        </Notice>
      ) : (
        <Notice tone="info">
          This also clears a pause set by their own organisation's admin, if that is who paused
          them.
        </Notice>
      )}
    </ActionDialog>
  );
}
