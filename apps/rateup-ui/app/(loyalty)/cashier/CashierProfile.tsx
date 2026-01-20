import { User } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface CashierProfileProps {
  customer: {
    name?: string;
    phone: string;
    currentPoints: number;
    lifetimePoints?: number;
    currentTier?: {
      name: string;
      id: string;
    };
  };
}

export function CashierProfile({ customer }: CashierProfileProps) {
  return (
    <Card className="border-border shadow-md overflow-hidden">
      <div className="h-24 bg-gradient-to-r from-primary/20 to-primary/5"></div>
      <div className="px-6 relative">
        <div className="h-16 w-16 bg-background rounded-full absolute -top-8 border-4 border-background flex items-center justify-center shadow-sm">
          <User className="h-8 w-8 text-muted-foreground" />
        </div>
      </div>
      <CardContent className="pt-10 pb-6 text-center">
        <h2 className="text-xl font-bold text-foreground">
          {customer.name || "Guest Customer"}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">{customer.phone}</p>

        <div className="bg-secondary/50 rounded-xl p-4 border border-border/50">
          <p className="text-xs text-muted-foreground uppercase font-medium mb-1 tracking-wider">
            Current Balance
          </p>
          <p className="text-3xl font-bold text-primary">
            {customer.currentPoints} pts
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div className="p-2 rounded-lg bg-slate-50 text-slate-600">
            <p className="text-xs text-slate-400">Total Earned</p>
            <p className="font-semibold">{customer.lifetimePoints || 0}</p>
          </div>
          <div className="p-2 rounded-lg bg-slate-50 text-slate-600">
            <p className="text-xs text-slate-400">Tier</p>
            <p className="font-semibold">
              {customer.currentTier?.name || "Starter"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
