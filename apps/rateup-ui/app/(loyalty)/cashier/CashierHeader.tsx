import { Loader2, Search, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/phone-input";

interface CashierHeaderProps {
  phoneNumber: string;
  setPhoneNumber: (val: string) => void;
  handleSearch: () => void;
  isLoading: boolean;
}

export function CashierHeader({
  phoneNumber,
  setPhoneNumber,
  handleSearch,
  isLoading,
}: CashierHeaderProps) {
  return (
    <div className="bg-background border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Trophy className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-lg font-bold text-foreground">Cashier Portal</h1>
        </div>

        <div className="flex items-center gap-2 w-full max-w-md ml-auto">
          <div className="flex-1">
            <PhoneInput
              international
              defaultCountry="IN"
              placeholder="Search customer phone..."
              value={phoneNumber}
              onChange={(value) => setPhoneNumber(value || "")}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
              className="bg-background border-input"
            />
          </div>
          <Button onClick={handleSearch} disabled={isLoading} size="icon">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
