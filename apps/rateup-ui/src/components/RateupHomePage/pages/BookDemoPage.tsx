import { RateupStar } from "@/components/integrations/logos";

import BookDemoForm from "../helpers/BookDemoForm";

/** The dialog's demo request, as a standalone page for `/book-a-demo` — same form, same copy. */
export default function BookDemoPage() {
  return (
    <div className="mx-auto max-w-xl px-6 py-20">
      <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary">
        <RateupStar className="h-6 w-6" />
      </div>

      <h1 className="text-center text-3xl font-black leading-none tracking-[-0.03em] text-[#021B49]">
        Book a Demo
      </h1>

      <p className="mx-auto mt-2 max-w-95 text-center text-sm leading-normal text-slate-600">
        See how RateUp turns WhatsApp into your loyalty engine. We'll reach out to schedule a quick
        walkthrough.
      </p>

      <BookDemoForm idPrefix="book-a-demo-page" className="mt-6" />
    </div>
  );
}
