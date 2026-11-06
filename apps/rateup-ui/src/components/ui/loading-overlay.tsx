import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/**
 * Absolutely-positioned busy overlay. The nearest positioned ancestor must be
 * `relative` — matching the old Mantine `LoadingOverlay` contract.
 */
function LoadingOverlay({
  visible,
  className,
  ...props
}: React.ComponentProps<"div"> & { visible?: boolean }) {
  if (!visible) return null;

  return (
    <div
      data-slot="loading-overlay"
      className={cn(
        "absolute inset-0 z-50 flex items-center justify-center rounded-sm bg-background/60 backdrop-blur-[2px]",
        className,
      )}
      {...props}
    >
      <Spinner className="size-7 text-muted-foreground" />
    </div>
  );
}

export { LoadingOverlay };
