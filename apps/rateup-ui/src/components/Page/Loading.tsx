import { Spinner } from "@/components/ui/spinner.tsx";

const Loading = ({ h }: { h?: number }) => {
  return (
    <div className="rounded-xl bg-card p-4 text-card-foreground">
      <div
        className="flex flex-col flex-wrap items-center justify-center gap-4"
        style={h ? { minHeight: h } : undefined}
      >
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    </div>
  );
};

export default Loading;
