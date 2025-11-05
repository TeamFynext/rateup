import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-gray-50/30 to-blue-50/20">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-12 h-12 text-rateup-blue animate-spin" />
        <p className="text-sm text-muted-foreground">Loading settings...</p>
      </div>
    </div>
  );
}
