import { IconBuilding, IconPhone, IconUser } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { MIN_SEARCH_LENGTH, useGlobalSearch } from "@/api/search.query";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

import { NAV_ITEMS } from "./nav";

/** ⌘/Ctrl+K anywhere in the console. */
export function useSearchHotkey(onOpen: () => void) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        onOpen();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onOpen]);
}

interface SearchPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchPalette({ open, onOpenChange }: SearchPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 250);
  const { data, isFetching } = useGlobalSearch(debounced);

  const term = query.trim();
  const searching = term.length >= MIN_SEARCH_LENGTH;
  const results = searching ? data : undefined;
  const resultCount = results
    ? results.orgs.length + results.users.length + results.phones.length
    : 0;

  const navItems = NAV_ITEMS.filter((item) =>
    item.title.toLowerCase().includes(term.toLowerCase()),
  );

  const close = () => {
    onOpenChange(false);
    setQuery("");
  };

  const openOrg = (orgId: string) => {
    close();
    void navigate({ to: "/orgs/$orgId", params: { orgId } });
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search"
      description="Find an organisation, user or phone number"
      className="sm:max-w-xl"
    >
      {/* The API has already matched the results, so cmdk's own fuzzy filter stays off. */}
      <Command shouldFilter={false}>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Org name or id, email, phone number, WABA id…"
        />
        <CommandList>
          {searching && resultCount === 0 && navItems.length === 0 && (
            <CommandEmpty>{isFetching ? "Searching…" : "No matches."}</CommandEmpty>
          )}

          {results && results.orgs.length > 0 && (
            <CommandGroup heading="Organisations">
              {results.orgs.map((org) => (
                <CommandItem key={org.id} value={`org-${org.id}`} onSelect={() => openOrg(org.id)}>
                  <IconBuilding />
                  <span className="truncate">{org.name}</span>
                  <span className="ml-auto truncate text-xs text-muted-foreground">
                    {org.ownerEmail ?? org.plan}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {results && results.users.length > 0 && (
            <CommandGroup heading="Users">
              {results.users.map((user) => (
                <CommandItem
                  key={user.id}
                  value={`user-${user.id}`}
                  onSelect={() => {
                    if (user.orgId) return openOrg(user.orgId);
                    close();
                    void navigate({ to: "/users", search: { q: user.email } });
                  }}
                >
                  <IconUser />
                  <span className="truncate">{user.name ?? user.email}</span>
                  <span className="ml-auto truncate text-xs text-muted-foreground">
                    {user.name ? user.email : user.orgName}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {results && results.phones.length > 0 && (
            <CommandGroup heading="Phone numbers">
              {results.phones.map((phone) => (
                <CommandItem
                  key={`${phone.orgId}-${phone.phone}`}
                  value={`phone-${phone.orgId}-${phone.phone}`}
                  onSelect={() => openOrg(phone.orgId)}
                >
                  <IconPhone />
                  <span className="truncate tabular-nums">{phone.phone}</span>
                  <span className="ml-auto truncate text-xs text-muted-foreground">
                    {phone.orgName}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {resultCount > 0 && navItems.length > 0 && <CommandSeparator />}

          {navItems.length > 0 && (
            <CommandGroup heading="Go to">
              {navItems.map((item) => (
                <CommandItem
                  key={item.to}
                  value={`nav-${item.to}`}
                  onSelect={() => {
                    close();
                    void navigate({ to: item.to });
                  }}
                >
                  <item.icon />
                  {item.title}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
