import PhoneFrame, { ThreadHeader, Ticks } from "../shared/PhoneFrame";

/**
 * The hero's phone: a customer asks after an order, a Utility template answers with a track
 * button, and a WhatsApp Flow slides up over the thread to collect a rating.
 *
 * Static, unlike the broadcast page's mock — this design shows one finished state rather than a
 * sequence, so there is nothing to animate beyond the sheet's entrance.
 */
export default function PhoneMock() {
  return (
    <PhoneFrame homeIndicator>
      <ThreadHeader />

      <div className="flex min-h-0 flex-1 flex-col justify-end gap-2.25 overflow-hidden bg-ru-n-50 p-3.5">
        <span className="self-center pb-0.5 text-[10.5px] font-semibold tracking-[0.08em] text-ru-n-400 uppercase">
          Today
        </span>

        <div className="flex-none max-w-[78%] rounded-2xl rounded-bl-sm border border-ru-n-200 bg-white px-3.25 pt-2.5 pb-2 text-[14.5px]/[1.45] text-ru-n-700 shadow-xs">
          <div>Has my order shipped? 😊</div>
          <div className="mt-1 flex justify-end text-[11px] text-ru-n-400">14:02</div>
        </div>

        <div className="flex-none ml-auto max-w-[88%] overflow-hidden rounded-2xl rounded-br-sm border border-ru-green-100 bg-ru-green-50 shadow-xs">
          <div className="px-3.25 pt-2.5 pb-2">
            <span className="mb-1.75 inline-flex h-4.5 items-center rounded-md border border-ru-green-100 bg-white px-1.75 text-[10.5px] font-semibold tracking-[0.06em] text-ru-green-600 uppercase">
              Order update
            </span>
            <p className="text-[14.5px]/[1.45] text-ru-n-700">
              Order <strong className="font-semibold">#4821</strong> is on its way, Priya. Estimated
              delivery Thursday.
            </p>
            <div className="mt-1.25 flex items-center justify-end gap-1.25 text-[11px] text-ru-n-400">
              <span>14:02</span>
              <Ticks tone="read" />
            </div>
          </div>
          <span className="flex items-center justify-center gap-1.75 border-t border-ru-green-100 p-2.75 text-sm font-semibold text-ru-green-600">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <path d="M14 2v6h6M8 15h6" />
            </svg>
            Track order
          </span>
        </div>

        {/*
          The Flow sheet. The design draws it absolutely positioned over a fixed 206px spacer;
          here it stays in flow with negative margins that cancel the thread's padding, so it
          reaches the screen edges and reserves exactly its own height. The design's spacer was
          60px shorter than this sheet renders, which hid the "Track order" button behind it.
          `animate-ru-rise` is the site's own entrance easing.
        */}
        <div className="-mx-3.5 -mb-3.5 mt-auto animate-ru-rise rounded-t-2xl bg-white px-4 pt-4 pb-7.5 shadow-[0_-12px_32px_rgba(16,24,40,0.14)] motion-reduce:animate-none">
          <div className="mb-3.5 flex items-center justify-between">
            <span className="font-display text-[15px] font-bold tracking-[-0.018em] text-ru-n-700">
              Rate your order
            </span>
            <span className="text-[10.5px] font-semibold tracking-[0.08em] text-ru-n-400 uppercase">
              WhatsApp Flow
            </span>
          </div>
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.75">
              <span className="text-[12.5px] font-medium text-ru-n-600">How was your order?</span>
              <div className="flex gap-1.75" aria-hidden="true">
                {[0, 1, 2, 3].map((i) => (
                  <svg
                    key={i}
                    width="26"
                    height="26"
                    viewBox="0 0 24 24"
                    className="fill-ru-amber-700"
                  >
                    <path d="M12 2l2.4 6.9H22l-6 4.4 2.3 7-6.3-4.6L5.7 20.3 8 13.3l-6-4.4h7.6z" />
                  </svg>
                ))}
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinejoin="round"
                  className="text-ru-n-300"
                >
                  <path d="M12 2l2.4 6.9H22l-6 4.4 2.3 7-6.3-4.6L5.7 20.3 8 13.3l-6-4.4h7.6z" />
                </svg>
              </div>
            </div>
            <div className="flex flex-col gap-1.75">
              <span className="text-[12.5px] font-medium text-ru-n-600">
                What should we improve?
              </span>
              <span className="flex h-9.5 items-center justify-between rounded border border-ru-n-200 bg-ru-n-50 px-3 text-[13px] text-ru-n-500">
                Delivery speed
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="text-ru-n-400"
                  aria-hidden="true"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </div>
            <span className="flex h-10 items-center justify-center rounded-md bg-ru-green-500 text-sm font-semibold text-white">
              Submit
            </span>
          </div>
        </div>
      </div>

      {/* Composer */}
      <div className="flex flex-none items-center gap-2.5 border-t border-ru-n-200 bg-white px-3 pt-2.25 pb-5.5">
        <span className="flex flex-1 items-center justify-between gap-2.5 rounded-full border border-ru-n-200 bg-ru-n-50 px-3.5 py-2.25 text-[13px] text-ru-n-400">
          Message
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="flex-none"
            aria-hidden="true"
          >
            <path d="M21.4 11.1l-8.5 8.5a5.5 5.5 0 01-7.8-7.8l8.5-8.5a3.7 3.7 0 015.2 5.2l-8.5 8.5a1.8 1.8 0 01-2.6-2.6l7.8-7.8" />
          </svg>
        </span>
        <span className="flex size-8.5 flex-none items-center justify-center rounded-full bg-ru-green-500 text-white">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
            <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4" />
          </svg>
        </span>
      </div>
    </PhoneFrame>
  );
}
