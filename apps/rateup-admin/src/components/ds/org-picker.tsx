import { IconSearch, IconX } from "@tabler/icons-react";
import { useId, useState } from "react";

import type { SearchOrg } from "@/api/search.api";
import { MIN_SEARCH_LENGTH, useGlobalSearch } from "@/api/search.query";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

import { EntityAvatar } from "./entity-avatar";

/**
 * Pick one organisation by name, owner email or id, with the same search as the header
 * palette. Chosen, it shows as a chip with a clear button; cleared, the search comes back.
 */
export function OrgPicker({
  value,
  onChange,
  label = "Organisation",
}: {
  value: SearchOrg | null;
  onChange: (org: SearchOrg | null) => void;
  label?: string;
}) {
  const [draft, setDraft] = useState("");
  const term = useDebouncedValue(draft, 250);
  const results = useGlobalSearch(term);
  const inputId = useId();
  const orgs = results.data?.orgs ?? [];
  const searching = term.trim().length >= MIN_SEARCH_LENGTH;

  if (value) {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex h-9 items-center gap-3 rounded-lg border px-3">
          <EntityAvatar name={value.name} src={value.logo} className="size-7" />
          <span className="min-w-0 flex-1 truncate text-sm">
            <span className="font-medium">{value.name}</span>
            <span className="text-muted-foreground"> · {value.ownerEmail}</span>
          </span>
          <button
            type="button"
            aria-label="Clear organisation"
            onClick={() => onChange(null)}
            className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <IconX className="size-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id={inputId}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Name, owner email or id"
          autoComplete="off"
          className="h-9 w-full rounded-lg border bg-transparent pr-3 pl-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        />
      </div>
      {searching && (
        <ul className="flex max-h-64 flex-col overflow-y-auto rounded-xl border">
          {results.isPending ? (
            <li className="px-3 py-3 text-xs text-muted-foreground">Searching…</li>
          ) : orgs.length === 0 ? (
            <li className="px-3 py-3 text-xs text-muted-foreground">No organisation matches.</li>
          ) : (
            orgs.map((org) => (
              <li key={org.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(org);
                    setDraft("");
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted"
                >
                  <EntityAvatar name={org.name} src={org.logo} className="size-7" />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{org.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {org.ownerEmail}
                      {org.plan ? ` · ${org.plan}` : ""}
                    </span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
