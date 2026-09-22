import { createFileRoute } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  component: Home,
});

// Placeholder until the `_app` shell (sidebar, search, auth guard) lands.
function Home() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="font-display text-xl">RateUp Staff</CardTitle>
            <Badge variant="secondary">{import.meta.env.MODE}</Badge>
          </div>
          <CardDescription>Console scaffold is running.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button>Sign in with Google</Button>
        </CardContent>
      </Card>
    </main>
  );
}
