import { AlertCircle, Gift, History, Search, Ticket, User } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export function CashierEmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="relative mb-10 group cursor-default">
        <div className="absolute -inset-4 bg-primary/20 rounded-full blur-xl opacity-70 group-hover:opacity-100 transition duration-1000"></div>
        <div className="relative bg-card p-8 rounded-full shadow-xl ring-1 ring-border">
          <Search className="h-12 w-12 text-primary" />
        </div>

        {/* Floating elements */}
        <div className="absolute -top-4 -right-12 bg-card p-3 rounded-2xl shadow-lg border border-border animate-bounce hidden md:block">
          <Gift className="h-6 w-6 text-primary/80" />
        </div>
        <div className="absolute -bottom-2 -left-12 bg-card p-3 rounded-2xl shadow-lg border border-border animate-bounce delay-1000 hidden md:block">
          <User className="h-6 w-6 text-primary/60" />
        </div>
        <div className="absolute top-1/2 -right-20 bg-card p-2 rounded-xl shadow-md border border-border animate-pulse delay-500 hidden md:block">
          <Ticket className="h-5 w-5 text-primary/70" />
        </div>
      </div>

      <h2 className="text-3xl font-bold tracking-tight mb-4 text-center">
        Cashier Portal
      </h2>
      <p className="text-muted-foreground text-center max-w-md text-lg leading-relaxed mb-12">
        Ready to serve. Search for a customer by phone number to manage points,
        rewards, and redemptions.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center w-full max-w-4xl px-4">
        {[
          {
            icon: History,
            title: "View History",
            desc: "Check past activity",
          },
          {
            icon: Gift,
            title: "Redeem Rewards",
            desc: "Process new rewards",
          },
          {
            icon: Ticket,
            title: "Verify Codes",
            desc: "Validate redemptions",
          },
        ].map(({ icon: Icon, title, desc }, idx) => (
          <Card key={idx} className="hover:bg-accent/5 transition-colors">
            <CardContent className="flex flex-col items-center gap-3 p-6 pt-6">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function CashierLoadingState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] animate-in fade-in zoom-in duration-300">
      <div className="relative">
        <div className="h-16 w-16 rounded-full border-4 border-slate-100 border-t-primary animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <User className="h-6 w-6 text-primary/50" />
        </div>
      </div>
      <h3 className="mt-6 text-lg font-medium text-slate-900">
        Locating Customer...
      </h3>
      <p className="text-slate-500 mt-1">Searching records for customer</p>
    </div>
  );
}

export function CashierErrorState({ error }: { error: any }) {
  return (
    <div className="max-w-md mx-auto mt-10">
      <Card className="border-destructive/20 bg-destructive/5 text-destructive shadow-none">
        <CardContent className="flex flex-col items-center p-6 text-center gap-2">
          <AlertCircle className="h-8 w-8 text-destructive mb-2" />
          <p className="font-semibold">Customer Not Found</p>
          <p className="text-sm opacity-90">
            {error?.response?.data?.message ||
              "Please check the phone number and try again."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
