import { IconLoader2, IconSearch, IconUserPlus } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { CustomerSearchResult } from "@/backend/loyalty/cashier/cashier.api";
import { useSearchCustomers } from "@/backend/loyalty/cashier/cashier.query";
import { Button } from "@/components/ui/button.tsx";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group.tsx";
import { useDebounce } from "@/hooks/use-debounce.ts";

import { maskPhone } from "./maskPhone.ts";

interface CustomerSearchProps {
  pointsName: string;
  onPick: (customer: CustomerSearchResult) => void;
  /** "Register {query}" — digits prefill the phone, anything else the name. */
  onRegister: (prefill: { phone?: string; name?: string }) => void;
  autoFocus?: boolean;
}

export function CustomerSearch({
  pointsName,
  onPick,
  onRegister,
  autoFocus,
}: Readonly<CustomerSearchProps>) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query.trim(), 300);
  const { data: results, isLoading } = useSearchCustomers(debounced);
  const searching = debounced.length >= 2;
  const isDigits = /^\+?[\d\s-]{6,}$/.test(debounced);

  const submit = () => {
    if (results?.length === 1) onPick(results[0]);
  };

  return (
    <div className="flex flex-col gap-2">
      <InputGroup>
        <InputGroupAddon>
          {isLoading && searching ? (
            <IconLoader2 className="animate-spin" size={16} />
          ) : (
            <IconSearch size={16} />
          )}
        </InputGroupAddon>
        <InputGroupInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
          }}
          placeholder={t("Name or phone number")}
          autoComplete="off"
          autoFocus={autoFocus}
          inputMode="search"
        />
      </InputGroup>

      {searching && !isLoading && (results?.length ?? 0) > 0 && (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
          {results?.map((result) => (
            <li key={result.id}>
              <button
                type="button"
                onClick={() => onPick(result)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-muted"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {result.contact.name || t("No name")}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {maskPhone(result.contact.phone)}
                  </span>
                </span>
                <span className="shrink-0 text-right text-xs text-muted-foreground">
                  {result.currentTier?.name ? `${result.currentTier.name} · ` : ""}
                  {result.currentPoints.toLocaleString()} {pointsName}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {searching && !isLoading && results?.length === 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-4">
          <p className="text-sm font-medium text-foreground">
            {isDigits
              ? t("Nobody on that number yet")
              : t("Nobody matches “{query}” yet", { query: debounced })}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("Register them now — it takes one field and the join bonus is automatic.")}
          </p>
          <Button
            size="sm"
            className="self-start"
            onClick={() => onRegister(isDigits ? { phone: debounced } : { name: debounced })}
          >
            <IconUserPlus size={16} />
            {t("Register {query}", { query: debounced })}
          </Button>
        </div>
      )}
    </div>
  );
}
