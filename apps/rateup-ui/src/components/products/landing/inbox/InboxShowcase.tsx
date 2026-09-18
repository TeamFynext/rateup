import InboxMock from "./inbox-mock/InboxMock";
import { SectionHead } from "./parts";

export default function InboxShowcase() {
  return (
    /* Rides up over the hero's navy as a rounded sheet, as the homepage's overview does. */
    <section className="relative -mt-8 rounded-t-4xl bg-ink-25 px-5 pt-12 pb-14 sm:-mt-10 sm:rounded-t-[2.5rem] sm:pt-20 sm:pb-24">
      <div className="mx-auto max-w-300">
        <SectionHead
          eyebrow="The inbox"
          icon={
            <>
              <path d="M3.5 13.5 6 5.5h12l2.5 8v4a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5v-4Z" />
              <path d="M3.5 13.5h4.6l1.2 2.4h5.4l1.2-2.4h4.6" />
            </>
          }
          title="One queue for every channel your customers use."
        >
          Each conversation is a ticket — numbered, assigned, tagged and closed with a result.
        </SectionHead>

        <InboxMock />
        <p className="mt-4 text-center text-[13px] text-ru-n-400">Illustrative conversation.</p>
      </div>
    </section>
  );
}
