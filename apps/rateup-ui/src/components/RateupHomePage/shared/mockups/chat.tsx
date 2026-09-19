import { useReveal } from "../home-ui";
import { BubbleIn, BubbleOut, Inset, bubbleReveal } from "./kit";

const delay = (index: number, stepMs = 260) => ({ transitionDelay: `${index * stepMs}ms` });

/* An 11×11 stand-in for a QR code: three finder squares plus a fixed scatter. It only has to
   read as "a QR" at 64px; it does not decode to anything. */
const QR_ROWS = [
  "11111010111",
  "10001001101",
  "10101110101",
  "10001010001",
  "11111011111",
  "00100100010",
  "11111001011",
  "10001011100",
  "10101101011",
  "10001010110",
  "11111001101",
];

function QrGlyph({ className = "" }: Readonly<{ className?: string }>) {
  return (
    <svg viewBox="0 0 11 11" className={className} aria-hidden="true" shapeRendering="crispEdges">
      {QR_ROWS.flatMap((row, y) =>
        [...row].map((cell, x) =>
          cell === "1" ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" /> : null,
        ),
      )}
    </svg>
  );
}

/** The loyalty thread: points land, the customer asks for their card, the QR card arrives. */
export function LoyaltyThread() {
  const [ref, shown] = useReveal<HTMLDivElement>(0.25);
  const bubble = bubbleReveal(shown);

  return (
    <div
      ref={ref}
      className="flex flex-col gap-2.25 rounded-2xl border border-ru-n-200 bg-ru-n-50 p-4"
    >
      <BubbleIn style={delay(0)} className={bubble}>
        Thanks for visiting! You've earned{" "}
        <strong className="font-semibold text-ru-amber-700">120 points</strong>. 80 more and your
        free coffee is unlocked.
        <div className="mt-2.5 flex gap-2">
          <span className="flex-1 rounded-lg border border-ru-blue-200 p-2 text-center text-[13.5px] font-semibold text-ru-blue-600">
            My card
          </span>
          <span className="flex-1 rounded-lg border border-ru-n-200 p-2 text-center text-[13.5px] font-medium text-ru-n-500">
            Rewards
          </span>
        </div>
      </BubbleIn>

      <BubbleOut style={delay(1)} className={bubble}>
        My card
      </BubbleOut>

      <BubbleIn style={delay(2)} className={`p-2! ${bubble}`}>
        <div className="flex items-center gap-3 rounded-xl bg-[linear-gradient(135deg,var(--color-ru-blue-700)_0%,var(--color-ru-blue-900)_100%)] p-3 text-white">
          <span className="flex-none rounded-lg bg-white p-1.5">
            <QrGlyph className="size-13 fill-ru-blue-900" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-[14.5px] font-semibold">Meera N.</div>
            <div className="text-[12.5px] text-white/70">320 points</div>
            <span className="mt-1.5 inline-flex items-center gap-1.25 rounded-full bg-white/12 py-0.75 pr-2 pl-1 text-[11.5px] font-semibold">
              <span className="size-3 rounded-full bg-ru-star" />
              Gold member
            </span>
          </div>
        </div>
        <div className="px-1.5 pt-2 pb-0.5 text-[13.5px] text-ru-n-500">
          Show this QR at the counter.
        </div>
      </BubbleIn>
    </div>
  );
}

function Stars({ shown }: Readonly<{ shown: boolean }>) {
  return (
    <span className="flex gap-0.75" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          style={{ transitionDelay: `${300 + i * 90}ms` }}
          className={`size-4.5 fill-ru-amber-500 transition-[opacity,transform] duration-300 motion-reduce:transition-none ${
            shown ? "scale-100 opacity-100" : "scale-50 opacity-0"
          }`}
        >
          <path d="M12 3.4l2.6 5.3 5.9.85-4.25 4.15 1 5.9-5.25-2.8-5.25 2.8 1-5.9L3.5 9.55l5.9-.85L12 3.4Z" />
        </svg>
      ))}
    </span>
  );
}

/** Post-visit survey, then the hand-off to Google with a suggested review to start from. */
export function ReviewFlow() {
  const [ref, shown] = useReveal<HTMLDivElement>(0.25);
  const bubble = bubbleReveal(shown);

  return (
    <Inset className="p-3">
      <div ref={ref} className="flex flex-col gap-2">
        <BubbleIn style={delay(0)} className={`text-[13.5px]! ${bubble}`}>
          How was your visit today?
        </BubbleIn>
        <BubbleOut style={delay(1)} className={`py-2! ${bubble}`}>
          <Stars shown={shown} />
        </BubbleOut>
        <BubbleIn style={delay(3)} className={`text-[13.5px]! ${bubble}`}>
          Glad you loved it! Would you share that on Google?
          <div className="mt-2 rounded-lg border border-ru-n-200 bg-ru-n-50 p-2 text-[12.5px]/[1.45] text-ru-n-500">
            <span className="mb-0.5 block text-[11px] font-semibold tracking-[0.06em] text-ru-blue-600 uppercase">
              Suggested review
            </span>
            “Quick service and the staff remembered my order…”
          </div>
          <span className="mt-2 block rounded-lg border border-ru-blue-200 p-2 text-center text-[13px] font-semibold text-ru-blue-600">
            Review us on Google
          </span>
        </BubbleIn>
      </div>
    </Inset>
  );
}

/** The AI agent answering from the business's own knowledge base. */
export function AgentReply() {
  const [ref, shown] = useReveal<HTMLDivElement>();
  const bubble = bubbleReveal(shown);

  return (
    <Inset className="p-3">
      <div ref={ref} className="flex flex-col gap-2">
        <BubbleOut style={delay(0)} className={`px-2.75! py-2! text-[13.5px]! ${bubble}`}>
          Are you open on Sunday?
        </BubbleOut>
        <BubbleIn style={delay(1)} className={`px-2.75! py-2! text-[13.5px]! ${bubble}`}>
          Yes — 10am to 9pm on Sundays. Want me to book a table?
          <span className="mt-1.5 flex w-fit items-center gap-1.25 rounded-full border border-ru-n-200 bg-ru-n-50 px-2 py-0.75 text-[11.5px] font-medium text-ru-n-500">
            <span className="size-1.5 rounded-full bg-ru-green-500" />
            From your knowledge base
          </span>
        </BubbleIn>
      </div>
    </Inset>
  );
}
