import { IconBuilding } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";

import { OrgDirectory } from "@/components/org/org-directory";

export const Route = createFileRoute("/_app/orgs/")({
  component: OrganisationsPage,
});

/** On desktop the directory sits in the nav panel; phones have no panel, so it fills the page. */
function OrganisationsPage() {
  return (
    <>
      <OrgDirectory className="-mx-4 -my-6 h-[calc(100svh-3.5rem)] md:hidden" />
      <div className="hidden min-h-[60svh] flex-col items-center justify-center gap-4 text-center md:flex">
        <span className="flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <IconBuilding className="size-6" stroke={1.75} />
        </span>
        <div className="space-y-1.5">
          <h1 className="font-display text-xl font-bold tracking-[-0.015em]">
            Select an organisation
          </h1>
          <p className="max-w-[42ch] text-[15px] text-muted-foreground">
            Pick one from the list to see its members, plan, usage and activity. Or press{" "}
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-sans text-xs text-foreground">
              Ctrl K
            </kbd>{" "}
            to search by name, email or phone number.
          </p>
        </div>
      </div>
    </>
  );
}
