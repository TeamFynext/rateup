import { useEffect, useState } from "react";

import {
  useNavigate,
  useRouterState,
  useSearch,
} from "@tanstack/react-router";
import { AlertTriangle, Loader2, Plus, Search, User } from "lucide-react";

import {
  useCustomerRewardsByPhone,
  useSearchCustomers,
} from "@/backend/loyalty/cashier/cashier.query";
import InfoButton from "@/components/Button/InfoButton.tsx";
import type { CustomerPanelCustomer } from "@/components/loyalty/CustomerDetailPanel.tsx";
import { CustomerDetailPanel } from "@/components/loyalty/CustomerDetailPanel.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { docsPath } from "@/utils/constants.ts";

export function CashierPage() {
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });
  const searchParams = useSearch({ strict: false });

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedPhone, setSelectedPhone] = useState("");

  // Fetch data
  const {
    data: customerData,
    isLoading: isLoadingCustomer,
    error,
  } = useCustomerRewardsByPhone(selectedPhone);
  const {
    user: { orgId },
  } = useUser();

  // Search
  const { data: searchResults, isLoading: isSearchLoading } =
    useSearchCustomers(debouncedSearch);
  const showResultsDropdown = !selectedPhone && debouncedSearch.length >= 2;

  const customer = customerData?.customer;

  const normalizePhone = (phone: string) => phone.replaceAll("+", "");

  // Debounce search input
  useEffect(() => {
    if (searchInput.length < 2) {
      setDebouncedSearch("");
      return;
    }
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const phoneFromQuery = searchParams.phone || "";
    setSearchInput(phoneFromQuery);
    setSelectedPhone(phoneFromQuery ? normalizePhone(phoneFromQuery) : "");
  }, [searchParams]);

  const updatePhoneQueryParam = (phone: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (phone) {
      params.set("phone", phone);
    } else {
      params.delete("phone");
    }
    const query = params.toString();
    navigate({
      to: query ? `${pathname}?${query}` : pathname,
      replace: true,
    });
  };

  const handleSearchCustomer = () => {
    if (searchInput.length < 2) return;
    setSelectedPhone(normalizePhone(searchInput));
    updatePhoneQueryParam(searchInput);
  };

  const handleSelectCustomer = (result: {
    contact: { name: string; phone: string };
  }) => {
    setSelectedPhone(normalizePhone(result.contact.phone));
    setSearchInput(result.contact.name || result.contact.phone);
    updatePhoneQueryParam(result.contact.phone);
  };

  const handleClearCustomerSearch = () => {
    setSelectedPhone("");
    setSearchInput("");
    setDebouncedSearch("");
    updatePhoneQueryParam("");
  };

  const panelCustomer: CustomerPanelCustomer | null = customer
    ? {
        id: customer.id,
        contactId: customer.contactId,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        currentPoints: customer.currentPoints,
        lifetimePoints: customer.lifetimePoints,
        currentTier: customer.currentTier
          ? { id: customer.currentTier.id, name: customer.currentTier.name }
          : null,
        status: customer.status,
        referralCode: customer.referralCode,
      }
    : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl mb-1">Cashier Portal</h1>
          <p className="text-sm text-muted-foreground">
            Quick customer lookup and transaction processing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              window.open(`/loyalty/${orgId}/register`, "_blank");
            }}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Register Customer
          </Button>
          <InfoButton docUrl={`${docsPath}/loyality/cashierPortal`} />
        </div>
      </div>

      {/* Search Customer */}
      <Card>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="cashier-search">
              Search Customer by Name or Phone
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10 pointer-events-none" />
              <Input
                id="cashier-search"
                placeholder="Search by name or phone..."
                className="pl-9"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  if (selectedPhone) {
                    setSelectedPhone("");
                    updatePhoneQueryParam("");
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchInput.length >= 2) {
                    handleSearchCustomer();
                  }
                }}
                autoComplete="off"
              />
              {/* Results dropdown */}
              {showResultsDropdown && (
                <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-background border rounded-lg shadow-lg overflow-hidden">
                  {isSearchLoading && (
                    <div className="flex items-center gap-2 px-4 py-3 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Searching...</span>
                    </div>
                  )}
                  {!isSearchLoading &&
                    debouncedSearch &&
                    searchResults?.length === 0 && (
                      <div className="px-4 py-3">
                        <p className="text-sm text-muted-foreground">
                          No customers found for &quot;{debouncedSearch}&quot;
                        </p>
                      </div>
                    )}
                  {!isSearchLoading &&
                    searchResults?.map((result) => (
                      <button
                        key={result?.contact?.id}
                        type="button"
                        onClick={() => handleSelectCustomer(result)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left border-b last:border-b-0"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {result.contact.name || "No name"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {result.contact.phone}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-semibold text-primary">
                            {result.contact.currentPoints} pts
                          </p>
                          {result.contact.currentTier?.name && (
                            <p className="text-xs text-muted-foreground">
                              {result.contact.currentTier.name}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                </div>
              )}
            </div>
            {searchInput.length >= 2 && !selectedPhone && (
              <Button
                onClick={handleSearchCustomer}
                variant="outline"
                className="w-full"
                disabled={isLoadingCustomer}
              >
                {isLoadingCustomer ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Search &quot;{searchInput}&quot;
                  </>
                )}
              </Button>
            )}
            {searchInput.length > 0 && searchInput.length < 2 && (
              <p className="text-xs text-muted-foreground">
                Please enter at least 2 characters
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <div className="mb-4">
          <Card className="bg-destructive/10 border-destructive">
            <CardContent className="flex items-center gap-2 py-3">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <span className="text-destructive text-sm">
                {error?.message || "Failed to load customer data"}
              </span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Customer Detail Panel */}
      {panelCustomer && (
        <CustomerDetailPanel
          customer={panelCustomer}
          onClose={handleClearCustomerSearch}
          orgId={orgId}
        />
      )}
    </div>
  );
}
