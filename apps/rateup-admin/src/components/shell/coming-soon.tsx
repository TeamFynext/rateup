import { IconHammer } from "@tabler/icons-react";

import { PageHeader } from "./page-header";

/** Stand-in body for sections whose screens haven't been ported yet. */
export function ComingSoon({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col gap-10">
      <PageHeader title={title} description={description} />
      <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed px-6 py-20 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-muted">
          <IconHammer className="size-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold">Not built yet</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          This screen lands once its <code className="font-mono">/api/staff</code> endpoints exist.
        </p>
      </div>
    </div>
  );
}
