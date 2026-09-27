import PhoneFrame, { PHONE_IN, PHONE_OUT, PHONE_SYSTEM, Typing } from "../../shared/PhoneFrame";
import { useScript } from "../../shared/useScript";
import { AGENT_SCRIPT, type AgentState, type Msg } from "./script";

const TAG = "mb-0.5 block text-[10px] font-semibold tracking-[0.06em] uppercase";

function Message({ msg }: Readonly<{ msg: Msg }>) {
  switch (msg.kind) {
    case "out":
      return <div className={PHONE_OUT}>{msg.text}</div>;
    case "system":
      return <div className={PHONE_SYSTEM}>{msg.text}</div>;
    case "tool":
      return (
        <div className={`${PHONE_SYSTEM} font-mono text-[10.5px]`}>Looked up · {msg.text}</div>
      );
    case "ai":
    case "staff":
      return (
        <div className={PHONE_IN}>
          <span
            className={`${TAG} ${msg.kind === "ai" ? "text-ru-blue-600" : "text-ru-green-700"}`}
          >
            {msg.kind === "ai" ? "Meta AI" : "Rohan · Sales"}
          </span>
          {msg.text}
        </div>
      );
  }
}

function SidePanel({ state }: Readonly<{ state: AgentState }>) {
  const ai = state.owner === "ai";

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-[20px] border border-ru-n-200 bg-white p-5 text-left shadow-[0_24px_64px_rgba(16,24,40,0.08)]">
      <div className="text-[11px] font-semibold tracking-[0.08em] text-ru-n-400 uppercase">
        In the RateUp inbox
      </div>

      <div
        className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 transition-colors duration-500 ${
          ai ? "border-ru-blue-200 bg-ru-blue-50" : "border-ru-green-100 bg-ru-green-50"
        }`}
      >
        <span className="flex items-center gap-2.5">
          <span className={`size-2 rounded-full ${ai ? "bg-ru-blue-600" : "bg-ru-green-600"}`} />
          <span
            className={`text-[14px] font-semibold ${ai ? "text-ru-blue-700" : "text-ru-green-700"}`}
          >
            {ai ? "Meta AI is answering" : "Your team is answering"}
          </span>
        </span>
        {!ai && (
          <span className="flex-none rounded-lg border border-ru-n-200 bg-white px-2.5 py-1.25 text-[12px] font-semibold text-ru-n-600">
            Hand back to Meta AI
          </span>
        )}
      </div>

      <p className="text-[13px]/[1.5] text-ru-n-500">
        Closing the ticket hands the customer back to Meta AI.
      </p>

      <div className="mt-2 text-[11px] font-semibold tracking-[0.08em] text-ru-n-400 uppercase">
        Insights · conversation turns
      </div>
      <div className="flex min-h-33 flex-col gap-2">
        {state.turns.map((item) => (
          <div
            key={item.id}
            className="flex animate-ru-msg-in items-center justify-between gap-3 rounded-lg border border-ru-n-200 bg-ru-n-50 px-3 py-2.25 motion-reduce:animate-none"
          >
            <span className="min-w-0 truncate font-mono text-[12px] font-medium text-ru-n-700">
              {item.label}
            </span>
            <span className="flex-none text-[12px] text-ru-green-700">{item.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** A customer's chat with the agent — knowledge, a tool call, then a handover to staff. */
export default function AgentMock() {
  const [ref, state] = useScript(AGENT_SCRIPT);

  return (
    <div
      ref={ref}
      role="img"
      aria-label="A WhatsApp chat in which Meta AI answers a delivery question, looks up the customer's loyalty points with a tool, then hands the conversation to a salesperson, while RateUp shows who is answering and each step of the agent's turns."
      className="grid items-center gap-6 select-none lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10"
    >
      <div aria-hidden="true">
        <PhoneFrame initial="BB" name="Brew & Bean">
          {state.messages.map((msg) => (
            <Message key={msg.id} msg={msg} />
          ))}
          {state.typing && <Typing />}
        </PhoneFrame>
      </div>
      <div aria-hidden="true" className="mx-auto w-full max-w-110">
        <SidePanel state={state} />
      </div>
    </div>
  );
}
