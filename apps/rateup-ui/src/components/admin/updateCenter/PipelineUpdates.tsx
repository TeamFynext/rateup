import {
  IconAlertTriangle,
  IconColumns,
  IconPlugConnected,
  IconRoute,
  IconUsersGroup,
  IconGitBranch,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";
import { useState } from "react";

import {
  useConvertAssignLifecycleActions,
  useDeleteAllPipelines,
  useMapLifecycleRefsToStages,
  usePlaceLeadsFromLifecycles,
  useSeedPipelines,
} from "@/backend/updations/update.query";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";

/** Typed word that arms the wipe. Deliberately not "yes" or "delete". */
const CONFIRM_PHRASE = "DELETE ALL PIPELINES";

/**
 * The board-clearing card. Separate from the migration cards because it is the
 * only one here that destroys rather than repairs: it takes every pipeline in
 * every org, and with each one its stages, leads, and every note, task and
 * activity hanging off those leads.
 *
 * Two gates before it can run — a dry run that reports the real counts, then a
 * typed confirmation — because nothing about the result is recoverable.
 */
function DeleteAllPipelinesCard() {
  const deleteAll = useDeleteAllPipelines();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typed, setTyped] = useState("");

  const armed = typed.trim() === CONFIRM_PHRASE;

  const apply = () => {
    if (!armed) return;
    deleteAll.mutate(true, {
      onSuccess: () => {
        setConfirmOpen(false);
        setTyped("");
      },
    });
  };

  return (
    <Card className="relative overflow-hidden border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-white/50 p-2 dark:bg-gray-900/20">
            <IconTrash className="h-5 w-5 text-red-600" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">Delete All Pipelines</CardTitle>
            <CardDescription className="mt-1">
              Removes every pipeline in every org, along with its stages, leads, and each lead's
              notes, tasks and timeline. Contacts and lifecycles are left alone. For clearing the
              boards created while testing.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => deleteAll.mutate(false)}
            disabled={deleteAll.isPending}
            className="flex-1"
          >
            {deleteAll.isPending ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Counting...
              </>
            ) : (
              <>
                <IconRefresh className="mr-2 h-4 w-4" />
                Dry Run
              </>
            )}
          </Button>
          <Button
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
            disabled={deleteAll.isPending}
            className="flex-1"
          >
            <IconTrash className="mr-2 h-4 w-4" />
            Delete Everything
          </Button>
        </div>

        <Dialog
          open={confirmOpen}
          onOpenChange={(open) => {
            setConfirmOpen(open);
            if (!open) setTyped("");
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete every pipeline in every org?</DialogTitle>
              <DialogDescription>
                This cannot be undone. Every board is removed, and with it every stage, every lead,
                and every note, task, assignee and timeline entry on those leads. Teams keep
                existing but lose their default-board pointer.
              </DialogDescription>
            </DialogHeader>

            <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
              <IconAlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 dark:text-red-200">
                Run the dry run first if you have not — it reports exactly what this will destroy.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="confirm-wipe">
                Type <span className="font-mono font-bold">{CONFIRM_PHRASE}</span> to confirm
              </Label>
              <Input
                id="confirm-wipe"
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                placeholder={CONFIRM_PHRASE}
                autoComplete="off"
              />
            </div>

            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
              <Button
                variant="destructive"
                onClick={apply}
                disabled={!armed || deleteAll.isPending}
              >
                {deleteAll.isPending ? "Deleting..." : "Delete everything"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

/**
 * Builds each org a board from the vocabulary it already uses. Columns take the
 * lifecycle names verbatim, so a contact sitting in "new lead" can later be
 * placed on the column of the same name.
 *
 * Not destructive and safe to re-run — an org that already has a board is
 * skipped — so this one needs no typed confirmation, only the dry run.
 */
function SeedPipelinesCard() {
  const seed = useSeedPipelines();

  return (
    <Card className="relative overflow-hidden border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-white/50 p-2 dark:bg-gray-900/20">
            <IconColumns className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">Seed Default Pipelines</CardTitle>
            <CardDescription className="mt-1">
              Gives every org without a board a &quot;Default Pipeline&quot;, with one column per
              lifecycle stage it owns — same names, ordered open first, then won, then lost. A Won
              or Lost column is appended if the org&apos;s lifecycles produce none. Orgs with no
              lifecycles or no teams are skipped.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => seed.mutate(false)}
            disabled={seed.isPending}
            className="flex-1"
          >
            {seed.isPending ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Running...
              </>
            ) : (
              <>
                <IconRefresh className="mr-2 h-4 w-4" />
                Dry Run
              </>
            )}
          </Button>
          <Button onClick={() => seed.mutate(true)} disabled={seed.isPending} className="flex-1">
            <IconColumns className="mr-2 h-4 w-4" />
            Seed Pipelines
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * The second half of the migration: every contact that already carries a
 * lifecycle gets a lead on the column of the same name.
 *
 * Contacts with no lifecycle get no lead — a lead is what holds a stage, so an
 * unclassified contact stays off the board exactly as it has no lifecycle today.
 *
 * Long-running and resumable; the hook keeps calling until the server reports it
 * is done. Safe to re-run, so no typed confirmation — but run the dry run first,
 * because the counts it reports are the only place unmatched lifecycles surface.
 */
function PlaceLeadsCard() {
  const place = usePlaceLeadsFromLifecycles();

  return (
    <Card className="relative overflow-hidden border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-white/50 p-2 dark:bg-gray-900/20">
            <IconUsersGroup className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">Place Contacts on Their Stage</CardTitle>
            <CardDescription className="mt-1">
              Opens a lead for every contact that has a lifecycle, on the column of the same name.
              Contacts with no lifecycle are left off the board. Dates each lead from the
              contact&apos;s last real touch, so genuinely stalled ones show as stalled. Run the
              seeder first.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => place.mutate(false)}
            disabled={place.isPending}
            className="flex-1"
          >
            {place.isPending ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Running...
              </>
            ) : (
              <>
                <IconRefresh className="mr-2 h-4 w-4" />
                Dry Run
              </>
            )}
          </Button>
          <Button onClick={() => place.mutate(true)} disabled={place.isPending} className="flex-1">
            <IconUsersGroup className="mr-2 h-4 w-4" />
            Place Leads
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Rewrites the lifecycle ids stored in JSON — Zoho's mapping tables and
 * automation-rule actions — so each carries the id of the matching column too.
 *
 * Additive rather than a swap: the Zoho sync and the rules still read the
 * lifecycle keys, so both have to be present until that code moves over.
 *
 * The counts to read are the leftovers, not the successes. An unresolved
 * reference is a mapping that will stop working, and the "needs work" figures
 * are things no data migration can fix.
 */
function MapLifecycleRefsCard() {
  const map = useMapLifecycleRefsToStages();

  return (
    <Card className="relative overflow-hidden border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-white/50 p-2 dark:bg-gray-900/20">
            <IconPlugConnected className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">Map Lifecycle References</CardTitle>
            <CardDescription className="mt-1">
              Writes a stage id beside every stored lifecycle id — Zoho&apos;s Bigin and CRM mapping
              tables, and each rule&apos;s Assign Lifecycle action. Nothing is removed, so existing
              syncing and rules keep working. Run the seeder first; matching is by name.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => map.mutate(false)}
            disabled={map.isPending}
            className="flex-1"
          >
            {map.isPending ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Running...
              </>
            ) : (
              <>
                <IconRefresh className="mr-2 h-4 w-4" />
                Dry Run
              </>
            )}
          </Button>
          <Button onClick={() => map.mutate(true)} disabled={map.isPending} className="flex-1">
            <IconPlugConnected className="mr-2 h-4 w-4" />
            Map References
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Typed word that arms the rule conversion. */
const CONVERT_PHRASE = "CONVERT RULES";

/**
 * Switches rules already written against Assign Lifecycle over to Assign Stage.
 *
 * Unlike the other cards here this changes **what those rules do the next time
 * they fire**, so it takes a typed confirmation rather than only a dry run. The
 * lifecycle id is kept in the stored value so a rule can be put back by hand,
 * but nothing undoes this in bulk.
 */
function ConvertRuleActionsCard() {
  const convert = useConvertAssignLifecycleActions();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typed, setTyped] = useState("");

  const armed = typed.trim() === CONVERT_PHRASE;

  const apply = () => {
    if (!armed) return;
    convert.mutate(true, {
      onSuccess: () => {
        setConfirmOpen(false);
        setTyped("");
      },
    });
  };

  return (
    <Card className="relative overflow-hidden border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-white/50 p-2 dark:bg-gray-900/20">
            <IconRoute className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">Convert Rules to Assign Stage</CardTitle>
            <CardDescription className="mt-1">
              Rewrites every rule action still set to Assign Lifecycle so it moves the
              contact&apos;s lead to the matching column instead. Actions whose lifecycle has no
              column of that name are left alone. Run &quot;Map Lifecycle References&quot; first.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => convert.mutate(false)}
            disabled={convert.isPending}
            className="flex-1"
          >
            {convert.isPending ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Running...
              </>
            ) : (
              <>
                <IconRefresh className="mr-2 h-4 w-4" />
                Dry Run
              </>
            )}
          </Button>
          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={convert.isPending}
            className="flex-1"
          >
            <IconRoute className="mr-2 h-4 w-4" />
            Convert Rules
          </Button>
        </div>

        <Dialog
          open={confirmOpen}
          onOpenChange={(open) => {
            setConfirmOpen(open);
            if (!open) setTyped("");
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change what these rules do?</DialogTitle>
              <DialogDescription>
                A converted rule moves the contact&apos;s lead to a column. It no longer writes the
                contact&apos;s lifecycle — so until the integrations move across, it also stops
                syncing that contact to Zoho, Zapier and the Meta Conversions API.
              </DialogDescription>
            </DialogHeader>

            <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
              <IconAlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                The lifecycle each action came from is kept in its stored value, so a rule can be
                put back by hand — but there is no bulk undo.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="confirm-convert">
                Type <span className="font-mono font-bold">{CONVERT_PHRASE}</span> to confirm
              </Label>
              <Input
                id="confirm-convert"
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                placeholder={CONVERT_PHRASE}
                autoComplete="off"
              />
            </div>

            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
              <Button onClick={apply} disabled={!armed || convert.isPending}>
                {convert.isPending ? "Converting..." : "Convert rules"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

/**
 * The Update Center's pipeline block. Its own section rather than more cards in
 * the migration grid, because these run as a sequence against the same feature:
 * clear the test boards, then seed from lifecycles, then place the leads.
 */
export function PipelineUpdates() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
        <IconGitBranch className="h-5 w-5" />
        Pipelines
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* The order these are meant to be run in: wipe, seed the columns, place
            the contacts on them, then repoint the stored integration and rule
            references at those columns. */}
        <DeleteAllPipelinesCard />
        <SeedPipelinesCard />
        <PlaceLeadsCard />
        <MapLifecycleRefsCard />
        <ConvertRuleActionsCard />
      </div>
    </div>
  );
}
