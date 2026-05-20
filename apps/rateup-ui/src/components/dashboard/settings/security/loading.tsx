import React from "react";

import { Loader2 } from "lucide-react";

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-gray-50/30 to-blue-50/20">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-12 h-12 text-rateup-blue animate-spin" />
        <p className="text-lg font-medium text-foreground">Loading...</p>
      </div>
    </div>
  );
}

export default Loading;
