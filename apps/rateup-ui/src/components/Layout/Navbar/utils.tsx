import { useNavigate } from "@tanstack/react-router";

import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";

export const WhatsAppSettingsModal = ({
  opened,
  onClose,
  intendedRoute,
}: {
  opened: boolean;
  onClose: () => void;
  intendedRoute?: string;
}) => {
  const navigate = useNavigate();
  return (
    <Dialog open={opened} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>WhatsApp Account Required</DialogTitle>
        </DialogHeader>
        <div className="text-sm mb-4">
          You don&apos;t have any WhatsApp account configured. Please set up your WhatsApp account
          to access this feature.
        </div>
        <DialogFooter className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onClose();
              if (intendedRoute)
                navigate({
                  to: intendedRoute,
                });
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              onClose();
              navigate({
                to: "/dashboard/settings/channels",
              });
            }}
          >
            Go to WhatsApp Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
