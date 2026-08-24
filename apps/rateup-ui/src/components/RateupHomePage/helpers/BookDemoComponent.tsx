import { RateupStar } from "@/components/integrations/logos";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

import BookDemoForm from "./BookDemoForm";

interface DemoModalProps {
  open: boolean;
  onClose: () => void;
}

export default function DemoModal({ open, onClose }: DemoModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      {/* `sm:max-w-xl`, not `max-w-xl`: the base width has to stay `DialogContent`'s own
          `max-w-[calc(100%-2rem)]` so the dialog keeps its gutters on a phone, and the override
          has to land on `sm` to beat the component's `sm:max-w-md`. The height cap plus the
          scrolling body below keep it inside short viewports — `dvh` so mobile browser chrome
          cannot push the submit button out of reach. */}
      <DialogContent className="sm:max-w-xl max-h-[90dvh] grid-rows-[minmax(0,1fr)] overflow-hidden rounded-xl p-4 sm:p-6">
        <div className="min-h-0 overflow-y-auto">
          <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary">
            <RateupStar className="h-6 w-6" />
          </div>

          <DialogTitle className="text-center text-xl font-black leading-none tracking-[-0.03em] text-[#021B49]">
            Book a Demo
          </DialogTitle>

          <DialogDescription className="mx-auto mt-1 max-w-95 text-center text-xs leading-normal text-slate-600">
            See how RateUp turns WhatsApp into your loyalty engine. We'll reach out to schedule a
            quick walkthrough.
          </DialogDescription>

          <BookDemoForm onSuccess={onClose} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
