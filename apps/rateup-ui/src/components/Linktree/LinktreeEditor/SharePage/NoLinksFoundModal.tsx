import { IconChevronRight } from "@tabler/icons-react";
import { useCallback } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

import { useSetLinktreeEditorTab } from "../LinktreeContext/LinktreeContext.tsx";

function NoLinksFoundModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const setLinktreeEditorTab = useSetLinktreeEditorTab();
  const handleGotoLinksPageBtnClick = useCallback(() => {
    setLinktreeEditorTab("links");
    onClose();
  }, []);
  return (
    <Dialog open={opened} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-2xl">
        <div className="flex flex-col items-center gap-6 p-6">
          <DialogTitle>No Links Found</DialogTitle>
          <Button onClick={handleGotoLinksPageBtnClick}>
            Go to Links Page
            <IconChevronRight data-icon="inline-end" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default NoLinksFoundModal;
