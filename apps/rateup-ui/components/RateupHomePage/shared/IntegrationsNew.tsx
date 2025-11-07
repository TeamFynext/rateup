import { Sora } from "next/font/google";
import Image from "next/image";

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function Integration() {
  return (
    <section
      className={`${sora.className} bg-rateup-darkblue w-full flex items-center justify-center py-12 px-4`}
    >
      <div className="max-w-6xl w-full flex flex-col items-center gap-6">
        {/* Top illustration / flow graphic */}
        <div className="w-full">
          <div className="w-full rounded-t-2xl overflow-hidden">
            {/* Replace src with the path you want; this uses the uploaded image */}
            <Image
              src="/mnt/data/00502d1a-b25d-4816-b138-c8b76893300c.png"
              alt="Integrations flow illustration"
              width={1600}
              height={420}
              className="w-full h-auto object-cover"
              priority
            />
          </div>
        </div>

        {/* Card-like content area */}
        <div className="w-full bg-[#052259] rounded-b-2xl px-6 py-10 sm:px-12 sm:py-14 flex flex-col items-center justify-center gap-4 text-center">
          <h2 className="text-white text-2xl sm:text-3xl md:text-4xl font-normal leading-tight max-w-4xl">
            Build Your Business With Favorite Integrations
          </h2>

          <p className="text-[#93C6F5] text-sm max-w-3xl">
            Our software seamlessly integrates with internal CRM systems,
            streamlining data management, optimizing internal data use, and
            increasing productivity and profitability through a more efficient
            workflow.
          </p>

          <div className="">
            <button
              type="button"
              className="inline-flex items-center justify-center bg-rateup-blue text-white font-medium px-4 py-2 rounded-sm shadow-sm hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2d74e0] transition"
              aria-label="View all integrations"
            >
              <span className="text-sm font-normal">View All Integrations</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
