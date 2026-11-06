import { useId, useState } from "react";

import {
  useAddStaff,
  useChangeStaffRole,
  useDeactivateStaff,
  useRevokeStaffSessions,
  type StaffMember,
} from "@/api/access.api";
import { useLogout } from "@/api/auth.query";
import { ActionDialog, done, Notice } from "@/components/ds/action-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type StaffAction =
  | { kind: "add" }
  | { kind: "role"; member: StaffMember }
  | { kind: "deactivate"; member: StaffMember }
  | { kind: "sign-out"; member: StaffMember };

/** The console's own domain: the API refuses any other address, and so does Google. */
const STAFF_DOMAIN = import.meta.env.VITE_STAFF_DOMAIN ?? "rateup.app";
/**
 * `vite dev`: any address, for a local API with NODE_ENV=development, which accepts any domain.
 * The API still decides; a dev console pointed at a deployed API gets its WRONG_DOMAIN error.
 */
const ANY_DOMAIN = import.meta.env.DEV;

const who = (member: StaffMember) => member.name ?? member.email;

/** Owner-only changes to the staff list. One dialog is open at a time; null is none. */
export function StaffDialogs({
  action,
  onClose,
  meId,
}: {
  action: StaffAction | null;
  onClose: () => void;
  meId: string;
}) {
  if (!action) return null;
  switch (action.kind) {
    case "add":
      return <AddDialog onClose={onClose} />;
    case "role":
      return <RoleDialog member={action.member} onClose={onClose} />;
    case "deactivate":
      return <DeactivateDialog member={action.member} onClose={onClose} />;
    case "sign-out":
      return (
        <SignOutDialog member={action.member} onClose={onClose} self={action.member.id === meId} />
      );
  }
}

function AddDialog({ onClose }: { onClose: () => void }) {
  const mutation = useAddStaff();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const emailId = useId();
  const nameId = useId();
  const ownerId = useId();
  const address = email.trim().toLowerCase();
  const onDomain = ANY_DOMAIN
    ? /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)
    : address.endsWith(`@${STAFF_DOMAIN}`) && address.indexOf("@") > 0;

  return (
    <ActionDialog
      open
      onOpenChange={onClose}
      title="Add a staff member"
      description={`They sign in with their ${ANY_DOMAIN ? "" : `@${STAFF_DOMAIN} `}Google account. Nothing is emailed; tell them the console's address.`}
      submitLabel="Add"
      blocked={
        !onDomain &&
        (!address
          ? "Enter their email"
          : ANY_DOMAIN
            ? "Enter a valid email"
            : `Use a @${STAFF_DOMAIN} address`)
      }
      pending={mutation.isPending}
      error={mutation.error}
      onSubmit={(reason) =>
        mutation.mutate(
          { email: address, name: name.trim() || undefined, isOwner, reason },
          { onSuccess: () => done(`${address} can now sign in.`, onClose) },
        )
      }
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor={emailId}>Work email</Label>
        <Input
          id={emailId}
          type="email"
          autoFocus
          autoComplete="off"
          placeholder={`name@${STAFF_DOMAIN}`}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-9 rounded-lg"
        />
        {!ANY_DOMAIN && address.length > 0 && !onDomain && (
          <p className="text-xs text-muted-foreground">
            Only @{STAFF_DOMAIN} addresses can sign in.
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={nameId}>
          Name <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id={nameId}
          autoComplete="off"
          placeholder="Filled from Google on their first sign-in if left blank"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="h-9 rounded-lg"
        />
      </div>
      <label htmlFor={ownerId} className="flex items-start gap-3 rounded-lg border px-4 py-3">
        <Checkbox
          id={ownerId}
          checked={isOwner}
          onCheckedChange={(checked) => setIsOwner(checked === true)}
          className="mt-0.5"
        />
        <span className="flex flex-col gap-0.5 text-sm">
          <span className="font-medium">Owner</span>
          <span className="text-xs text-muted-foreground">
            Can add and remove staff members. Everything else is the same for everyone.
          </span>
        </span>
      </label>
    </ActionDialog>
  );
}

function RoleDialog({ member, onClose }: { member: StaffMember; onClose: () => void }) {
  const mutation = useChangeStaffRole();
  const promote = !member.isOwner;
  return (
    <ActionDialog
      open
      onOpenChange={onClose}
      title={promote ? `Make ${who(member)} an owner` : `Remove ${who(member)} as owner`}
      description={
        promote
          ? "Owners can add and remove staff members, including other owners."
          : "They keep signing in and doing everything else; only managing the staff list goes."
      }
      submitLabel={promote ? "Make owner" : "Remove as owner"}
      pending={mutation.isPending}
      error={mutation.error}
      onSubmit={(reason) =>
        mutation.mutate(
          { id: member.id, isOwner: promote, reason },
          {
            onSuccess: () =>
              done(
                promote
                  ? `${who(member)} is now an owner.`
                  : `${who(member)} is no longer an owner.`,
                onClose,
              ),
          },
        )
      }
    />
  );
}

function DeactivateDialog({ member, onClose }: { member: StaffMember; onClose: () => void }) {
  const mutation = useDeactivateStaff();
  return (
    <ActionDialog
      open
      onOpenChange={onClose}
      destructive
      title={`Deactivate ${who(member)}`}
      description="They are signed out everywhere right now and can no longer sign in. Their audit history stays."
      submitLabel="Deactivate"
      pending={mutation.isPending}
      error={mutation.error}
      onSubmit={(reason) =>
        mutation.mutate(
          { id: member.id, reason },
          { onSuccess: () => done(`${who(member)} deactivated.`, onClose) },
        )
      }
    >
      {member.openSessions > 0 && (
        <Notice>
          {member.openSessions === 1
            ? "They are signed in right now; that session ends immediately."
            : `They have ${member.openSessions} open sessions; all of them end immediately.`}
        </Notice>
      )}
      <Notice tone="info">
        Adding the same address again later brings them back with their history intact.
      </Notice>
    </ActionDialog>
  );
}

function SignOutDialog({
  member,
  onClose,
  self,
}: {
  member: StaffMember;
  onClose: () => void;
  self: boolean;
}) {
  const mutation = useRevokeStaffSessions();
  const logout = useLogout();
  return (
    <ActionDialog
      open
      onOpenChange={onClose}
      title={self ? "Sign out everywhere" : `Sign ${who(member)} out everywhere`}
      description={
        self
          ? "Every browser you are signed in on, including this one, is signed out. Sign in again afterwards."
          : "Every browser they are signed in on is signed out. They can sign in again straight away."
      }
      submitLabel="Sign out everywhere"
      pending={mutation.isPending}
      error={mutation.error}
      onSubmit={(reason) =>
        mutation.mutate(
          { id: member.id, reason },
          {
            onSuccess: ({ sessionsEnded: n }) => {
              // Our own session was among them: leave the way a sign-out does.
              if (self) return logout.mutate();
              done(
                n === 0
                  ? "They were not signed in anywhere."
                  : `Ended ${n} session${n === 1 ? "" : "s"}.`,
                onClose,
              );
            },
          },
        )
      }
    />
  );
}
