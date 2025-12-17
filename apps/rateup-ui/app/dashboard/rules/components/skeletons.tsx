import React from "react";

const Skeletons = ({ viewMode }) => {
  const count = 6;
  if (viewMode === "list") {
    return (
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-2 p-2 rounded border border-border animate-pulse"
          >
            <div className="h-10 w-1 bg-muted rounded" />
            <div className="flex-1 ml-2">
              <div className="h-4 bg-muted rounded w-1/3 mb-2" />
              <div className="flex gap-2 text-xs">
                <div className="h-3 w-10 bg-muted rounded" />
                <div className="h-3 w-8 bg-muted rounded" />
                <div className="h-3 w-12 bg-muted rounded" />
              </div>
            </div>
            <div className="w-20 h-6 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  // grid
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded border border-border overflow-hidden animate-pulse"
        >
          <div className="h-1 bg-muted" />
          <div className="p-3 space-y-2">
            <div className="h-4 bg-muted rounded w-2/3" />
            <div className="h-3 bg-muted rounded w-1/2" />
            <div className="flex gap-2">
              <div className="h-6 w-16 bg-muted rounded" />
              <div className="h-6 w-12 bg-muted rounded" />
            </div>
          </div>
          <div className="h-8 bg-muted/70" />
        </div>
      ))}
    </div>
  );
};

export default Skeletons;
