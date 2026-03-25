import { Layers } from "lucide-react";

export function FeatureShowcase() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div className="h-[30rem] w-[30rem] rounded-full bg-rateup-dark-blue-3 blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center rounded-full border border-rateup-blue/30 bg-rateup-blue/10 px-3 py-1 text-sm font-medium text-rateup-blue w-fit mx-auto">
            <Layers className="h-4 w-4 mr-2" />
            Features
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
            Everything In One Place, <br className="hidden md:block" />
            <span className="text-rateup-blue">Nothing Siloed.</span>
          </h2>
        </div>

        <div className="rounded-[2.5rem] border border-white/10 bg-[#0a0f1c] overflow-hidden flex flex-col lg:flex-row items-center gap-12 p-8 lg:p-12 relative shadow-[0_0_80px_-20px_rgba(46,91,255,0.2)]">
          {/* subtle glow in the card */}
          <div className="absolute top-0 right-0 -m-32 w-64 h-64 bg-rateup-blue/20 rounded-full blur-[80px]" />

          {/* Left Image Placeholder */}
          <div className="w-full lg:w-1/2 aspect-square lg:aspect-auto lg:h-[400px] rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="text-muted-foreground flex flex-col items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mb-4 opacity-30"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
              <span>Platform Interface UI</span>
            </div>
          </div>

          {/* Right Content */}
          <div className="w-full lg:w-1/2 flex flex-col gap-6 z-10">
            <div className="space-y-4">
              <h3 className="text-3xl lg:text-4xl font-bold text-white">
                Unified <br /> Omnichannel Inbox
              </h3>
              <p className="text-muted-foreground text-lg leading-relaxed max-w-md">
                Provide a consistent experience across all touchpoints with an
                inbox that brings your WhatsApp, emails, social DMs, and support
                tickets into one single view.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button className="px-4 text-[14px] relative py-2 rounded-xl border font-semibold border-rateup-blue-4 bg-rateup-blue-2 text-white transition">
                Get Started Now
              </button>
              <button className="bg-rateup-light-blue px-4 py-2 rounded-xl text-rateup-dark-blue cursor-pointer hover:bg-rateup-darkblue-2">
                <span className="font-semibold text-[14px]"> Know More</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
