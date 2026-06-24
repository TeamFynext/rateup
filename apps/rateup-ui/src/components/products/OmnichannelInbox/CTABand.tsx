import { useNavigate } from "@tanstack/react-router";

import { ArrowRight, WaIcon } from "./icons";

export default function CTABand() {
  const navigate = useNavigate();
  return (
    <section className="py-[52px]">
      <div className="max-w-[1200px] mx-auto px-7">
        <div
          className="reveal relative overflow-hidden rounded-[28px] text-center px-14 py-16"
          style={{
            background: "linear-gradient(135deg,#0E3E78,#0A2244 60%)",
            border: "1px solid rgba(120,180,255,0.25)",
          }}
        >
          {/* glow orbs */}
          <div
            className="absolute -top-20 -right-10 w-80 h-80 rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(circle,rgba(47,163,255,0.4),transparent 70%)",
            }}
          />
          <div
            className="absolute -bottom-16 -left-10 w-60 h-60 rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(circle,rgba(248,149,29,0.12),transparent 70%)",
            }}
          />

          <span
            className="relative inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.16em] px-[15px] py-[7px] rounded-full mb-4"
            style={{
              color: "#4FC3FF",
              background: "rgba(47,163,255,0.10)",
              border: "1px solid rgba(47,163,255,0.22)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "#4FC3FF", boxShadow: "0 0 10px #4FC3FF" }}
            />
            Now live — join 500+ brands
          </span>

          <h3
            className="relative font-display font-black text-white leading-none tracking-[-0.025em] mb-3.5"
            style={{ fontSize: "clamp(28px,3.6vw,48px)" }}
          >
            Unify your customer conversations today.
          </h3>
          <p
            className="relative text-white/75 text-[17px] mx-auto mb-7"
            style={{ maxWidth: "480px" }}
          >
            RateUp Inbox is live and ready for your team. Set up your unified WhatsApp, Instagram,
            and Messenger inbox in minutes — no complicated onboarding, no long contracts.
          </p>

          <div className="relative flex gap-3.5 justify-center flex-wrap">
            <button
              onClick={() => navigate({ to: "/signup" })}
              className="inline-flex items-center gap-2 font-bold text-[15px] text-white px-6 py-3.5 rounded-[11px] transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: "linear-gradient(180deg,#3D8BEE,#2360C8)",
                boxShadow: "0 10px 30px rgba(45,111,214,0.45),inset 0 1px 0 rgba(255,255,255,0.25)",
              }}
            >
              Sign Up for Free <ArrowRight />
            </button>
            <a
              href="https://wa.me/9947005768?text=Hi%20RateUp%2C%20I%27d%20like%20to%20learn%20about%20RateUp%20Inbox"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-bold text-[15px] text-white px-6 py-3.5 rounded-[11px] transition-all duration-200 hover:-translate-y-0.5 no-underline"
              style={{
                background: "linear-gradient(180deg,#2BD367,#1FB855)",
                boxShadow: "0 10px 28px rgba(37,211,102,0.35),inset 0 1px 0 rgba(255,255,255,0.25)",
              }}
            >
              <WaIcon size={18} /> Talk to the team on WhatsApp
            </a>
          </div>

          <div className="relative mt-5 text-[13px] text-white/50">
            Free to start · No credit card required · Cancel anytime
          </div>
        </div>
      </div>
    </section>
  );
}
