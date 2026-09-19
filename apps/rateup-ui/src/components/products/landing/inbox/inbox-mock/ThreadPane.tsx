import { Avatar, ChannelDot } from "@/components/RateupHomePage/shared/mockups/kit";

import type { MockState, Msg } from "./script";

const enter = "animate-ru-msg-in motion-reduce:animate-none";
const stamp = "mt-1 block text-right text-[10px]";

function Message({ msg }: Readonly<{ msg: Msg }>) {
  if (msg.kind === "system") {
    return (
      <div
        className={`self-center rounded-full border border-ru-n-200 bg-white px-3 py-1 text-[11px] font-medium text-ru-n-500 ${enter}`}
      >
        {msg.text}
      </div>
    );
  }

  if (msg.kind === "note") {
    return (
      <div
        className={`w-full rounded-xl border border-ru-amber-200 bg-ru-amber-50 px-3 py-2 text-[12.5px]/[1.45] text-ru-n-700 ${enter}`}
      >
        <span className="mb-0.5 block text-[10px] font-semibold tracking-[0.06em] text-ru-amber-700 uppercase">
          Private note · Rohan K.
        </span>
        {msg.text}
      </div>
    );
  }

  if (msg.kind === "in") {
    return (
      <div
        className={`max-w-[78%] self-start rounded-[14px_14px_14px_4px] border border-ru-n-200 bg-white px-3 py-2 text-[12.5px]/[1.45] text-ru-n-700 ${enter}`}
      >
        {msg.text}
        <span className={`${stamp} text-ru-n-400`}>{msg.at}</span>
      </div>
    );
  }

  return (
    <div
      className={`max-w-[78%] self-end rounded-[14px_14px_4px_14px] bg-ru-blue-600 px-3 py-2 text-[12.5px]/[1.45] text-white ${enter}`}
    >
      {msg.kind === "auto" && (
        <span className="mb-0.5 block text-[10px] font-semibold tracking-[0.06em] text-white/70 uppercase">
          Auto-reply
        </span>
      )}
      {msg.text}
      {msg.at && <span className={`${stamp} text-white/70`}>{msg.at}</span>}
    </div>
  );
}

function TypingDots({ side }: Readonly<{ side: "agent" | "customer" }>) {
  return (
    <div
      className={`flex gap-1 rounded-full border border-ru-n-200 bg-white px-3 py-2.25 ${
        side === "agent" ? "self-end" : "self-start"
      } ${enter}`}
    >
      {[0, 200, 400].map((delay) => (
        <span
          key={delay}
          style={{ animationDelay: `${delay}ms` }}
          className="size-1.5 animate-ru-dot rounded-full bg-ru-n-400"
        />
      ))}
    </div>
  );
}

export default function ThreadPane({ state }: Readonly<{ state: MockState }>) {
  return (
    <div className="flex min-w-0 flex-col bg-ru-n-50">
      <div className="flex items-center gap-2.5 border-b border-ru-n-200 bg-white px-3.5 py-2.5">
        <span className="relative flex-none">
          <Avatar initials="MN" className="bg-ru-green-600" size="size-8.5 text-[12px]" />
          <ChannelDot channel="whatsapp" className="absolute -right-0.5 -bottom-0.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-semibold text-ru-n-700">Meera N.</div>
          <div className="truncate text-[11px] text-ru-n-400">
            #2041 · Order #8823 not confirmed
          </div>
        </div>
        {/* The real header counts down WhatsApp's 24-hour window; fixed text here, since a
            clock would differ between the server's render and the client's. */}
        <span className="inline-flex flex-none items-center gap-1.25 rounded-full border border-ru-green-100 bg-ru-green-50 px-2 py-1 text-[10.5px] font-semibold text-ru-green-700">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="size-3"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 7.5V12l3 2" />
          </svg>
          Session · 23h 12m left
        </span>
        <span
          className={`flex-none rounded-lg px-2.5 py-1.25 text-[11.5px] font-semibold max-sm:hidden ${
            state.closed
              ? "border border-ru-n-200 bg-white text-ru-n-600"
              : "bg-ru-green-600 text-white"
          }`}
        >
          {state.closed ? "Reopen" : "Close"}
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-end gap-2 overflow-hidden px-3.5 py-3">
        {state.messages.map((msg) => (
          <Message key={msg.id} msg={msg} />
        ))}
        {state.typing && <TypingDots side={state.typing} />}
      </div>

      <div className="border-t border-ru-n-200 bg-white px-3.5 pt-2 pb-2.5">
        <div className="mb-2 flex gap-3.5 text-[11.5px] font-semibold">
          <span className="border-b-2 border-ru-blue-600 pb-1 text-ru-blue-600">Message</span>
          <span className="pb-1 text-ru-n-400">Private Note</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex-1 truncate rounded-lg border border-ru-n-200 bg-ru-n-50 px-3 py-2 text-[12px] text-ru-n-400">
            Reply to Meera on WhatsApp…
          </span>
          <span className="hidden rounded-lg border border-ru-n-200 px-2 py-1.75 text-[11px] font-medium text-ru-n-500 min-[420px]:block">
            Quick replies
          </span>
          <span className="flex size-8 flex-none items-center justify-center rounded-lg bg-ru-blue-600 text-white">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-3.75"
              aria-hidden="true"
            >
              <path d="M4 12 20 4l-6 16-3-7-7-1Z" />
            </svg>
          </span>
        </div>
      </div>
    </div>
  );
}
