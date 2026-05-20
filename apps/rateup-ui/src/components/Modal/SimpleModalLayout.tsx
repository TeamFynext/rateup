import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";

interface FormModalLayoutProps {
  centered?: boolean;
  onClose: () => void;
  opened: boolean;
  title?: string;
  children: React.ReactNode;
  noCustomHeader?: boolean;
  size?: string | number;
  withCloseButton?: boolean;
  zIndex?: number;
}

export default function SimpleModalLayout({
  onClose,
  opened,
  title,
  children,
  noCustomHeader,
  size = "md",
  zIndex = 999999,
  withCloseButton = true,
}: FormModalLayoutProps) {
  const contentStyle: React.CSSProperties = {};
  const contentClassNames: string[] = ["w-full"];

  if (typeof size === "number") {
    contentStyle.maxWidth = size;
  } else {
    switch (size) {
      case "xs":
        contentClassNames.push("sm:max-w-[320px]");
        break;
      case "sm":
        contentClassNames.push("sm:max-w-[400px]");
        break;
      case "md":
        contentClassNames.push("sm:max-w-[500px]");
        break;
      case "lg":
        contentClassNames.push("sm:max-w-[700px]");
        break;
      case "xl":
        contentClassNames.push("sm:max-w-[900px]");
        break;
      default:
        contentClassNames.push("sm:max-w-[500px]");
        break;
    }
  }

  return (
    <Dialog
      open={opened}
      onOpenChange={(nextOpen) => {
        if (!withCloseButton && !nextOpen) return;
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent
        className={`${contentClassNames.join(" ")} rounded-lg p-6 max-h-[90vh] overflow-auto`}
        style={{
          ...contentStyle,
          zIndex,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {noCustomHeader && title && (
          <DialogHeader className="mb-4">
            <div className="flex items-center justify-between gap-4">
              <DialogTitle className="text-lg font-semibold">
                {title}
              </DialogTitle>
              {withCloseButton && (
                <DialogClose className="rounded-full border px-2 py-1 text-sm">
                  ×
                </DialogClose>
              )}
            </div>
          </DialogHeader>
        )}

        {!noCustomHeader && title && (
          <div className="mb-4 flex justify-center">
            <h2 className="text-2xl font-bold">{title}</h2>
          </div>
        )}

        <div className="h-6" />

        {children}
      </DialogContent>
    </Dialog>
  );
}
