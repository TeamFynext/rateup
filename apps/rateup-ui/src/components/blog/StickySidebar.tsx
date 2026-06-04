// StickySidebar.tsx
// Converted from the RateUp HTML sidebar — all styles preserved as Tailwind utility classes

// Ring SVG for stat cards
function Ring({
  stroke,
  offset,
  value,
  color,
}: Readonly<{
  stroke: string;
  offset: number;
  value: string;
  color: string;
}>) {
  return (
    <div className="relative w-10 h-10 mx-auto">
      <svg width="40" height="40" viewBox="0 0 40 40" className="-rotate-90">
        <circle
          cx="20"
          cy="20"
          r="15"
          fill="none"
          stroke="#EAECF8"
          strokeWidth="4.5"
        />
        <circle
          cx="20"
          cy="20"
          r="15"
          fill="none"
          stroke={stroke}
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeDasharray="94.2"
          strokeDashoffset={offset}
        />
      </svg>
      <div
        className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold"
        style={{ color }}
      >
        {value}
      </div>
    </div>
  );
}

function StatCard({
  label,
  stroke,
  offset,
  value,
  color,
}: Readonly<{
  label: string;
  stroke: string;
  offset: number;
  value: string;
  color: string;
}>) {
  return (
    <div className="bg-white/[0.96] rounded-xl pt-[7px] px-2 pb-[6px] w-[68px] text-center">
      <span className="block text-[7px] font-extrabold tracking-[0.07em] text-[#555] mb-1 uppercase">
        {label}
      </span>
      <Ring stroke={stroke} offset={offset} value={value} color={color} />
    </div>
  );
}

export default function StickySidebar() {
  return (
    <div className="w-[268px] font-sans">
      {/* Main card */}
      <div className="w-[268px] rounded-[24px] overflow-hidden bg-[linear-gradient(168deg,#061140_0%,#0C2383_42%,#1A52E8_78%,#2462FF_100%)] shadow-[0_20px_60px_rgba(8,24,120,0.45)]">
        {/* ── HERO ── */}
        <div className="relative w-full h-[300px] overflow-hidden bg-[linear-gradient(168deg,#061140_0%,#0C2383_55%,#1A52E8_100%)]">
          {/* Stats grid — behind photo (z-index 1) */}
          <div className="absolute top-4 right-2.5 grid grid-cols-2 gap-1.5 z-[1]">
            <StatCard
              label="SENT"
              stroke="#6C7FFF"
              offset={18.84}
              value="80%"
              color="#4A5BDE"
            />
            <StatCard
              label="DELIVERED"
              stroke="#A78BFA"
              offset={37.68}
              value="60%"
              color="#7C3AED"
            />
            <StatCard
              label="READ"
              stroke="#38BDF8"
              offset={56.52}
              value="40%"
              color="#0369A1"
            />
            <StatCard
              label="REPLIED"
              stroke="#34D399"
              offset={75.36}
              value="20%"
              color="#047857"
            />
          </div>

          {/* WhatsApp badge — behind photo (z-index 1) */}
          <div className="absolute left-3.5 top-[72px] z-[1]">
            <div className="w-[50px] h-[50px] bg-[#25D366] rounded-full flex items-center justify-center shadow-[0_4px_18px_rgba(37,211,102,0.55)] relative">
              <span className="absolute -top-[5px] -right-[5px] bg-[#FF3B30] text-white text-[7px] font-black rounded-[20px] py-[2px] px-[5px] border-[1.5px] border-white/90 font-sans">
                99+
              </span>
              <svg width="27" height="27" viewBox="0 0 32 32" fill="none">
                <path
                  d="M16 2.5C8.54 2.5 2.5 8.54 2.5 16c0 2.37.64 4.6 1.76 6.52L2.5 29.5l7.24-1.73A13.44 13.44 0 0016 29.5c7.46 0 13.5-6.04 13.5-13.5S23.46 2.5 16 2.5z"
                  fill="white"
                />
                <path
                  d="M22.4 19.85c-.3-.15-1.79-.88-2.07-.98-.27-.1-.47-.15-.67.15-.2.3-.78.98-.96 1.18-.18.2-.36.23-.66.08-.3-.15-1.28-.47-2.44-1.5-.9-.8-1.51-1.8-1.69-2.1-.18-.3-.02-.46.14-.61.13-.13.3-.35.45-.53.15-.17.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51-.18-.01-.38-.01-.58-.01s-.53.07-.8.38c-.28.3-1.06 1.03-1.06 2.52 0 1.48 1.08 2.91 1.23 3.11.15.2 2.13 3.25 5.16 4.56.72.31 1.28.5 1.72.64.72.23 1.38.2 1.9.12.58-.09 1.79-.73 2.04-1.43.26-.7.26-1.3.18-1.43-.07-.13-.27-.2-.57-.35z"
                  fill="#25D366"
                />
              </svg>
            </div>
          </div>

          {/* Gradient top — z-index 2 */}
          <div className="absolute top-0 left-0 right-0 h-[50px] bg-gradient-to-b from-[#061140] to-transparent z-[2] pointer-events-none" />

          {/* Woman photo — z-index 3 */}
          <img
            src={`${import.meta.env.VITE_CLOUDFRONT_WEB_IMAGES_URL}/blog/girlwithphone.png`}
            alt="Woman smiling while using WhatsApp on her phone"
            className="absolute top-0 left-1/2 -translate-x-[52%] h-[310px] w-auto object-contain object-top z-[3]"
          />

          {/* Gradient bottom — z-index 4 */}
          <div className="absolute bottom-0 left-0 right-0 h-[85px] bg-gradient-to-t from-[#1340C8] to-transparent z-[4] pointer-events-none" />
        </div>

        {/* ── BODY ── */}
        <div className="pt-2.5 px-[18px] pb-0">
          {/* Free trial chip */}
          <div className="inline-flex items-center gap-[5px] bg-white/[0.12] border border-white/20 rounded-[30px] py-1 px-[11px] text-[10px] font-bold text-white/88 tracking-[0.04em] uppercase mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] shadow-[0_0_8px_#25D366] inline-block" />
            Free Trial Available
          </div>

          {/* Heading */}
          <div className="text-[22px] font-black text-white leading-[1.2] tracking-[-0.4px] mb-4">
            Get your business
            <br />
            on <em className="text-[#82CBFF] not-italic">WhatsApp</em>
            <br />
            with RateUp
          </div>

          {/* CTA buttons */}
          <a
            href="https://rateup.app/signup"
            className="flex items-center justify-center w-full p-[13px] bg-white/[0.14] border-[1.5px] border-white/[0.32] rounded-[13px] text-white text-[13.5px] font-bold cursor-pointer no-underline mb-[9px] transition-colors duration-200 gap-[6px] hover:bg-white/[0.22]"
          >
            Start Free Trial &nbsp;→
          </a>
          <a
            href="https://rateup.app/contact-us"
            className="flex items-center justify-center w-full p-[13px] bg-[#25D366] border-none rounded-[13px] text-white text-[13px] font-bold cursor-pointer no-underline gap-[7px] transition-colors duration-200 hover:bg-[#1EBD5A]"
          >
            <svg width="16" height="16" viewBox="0 0 32 32" fill="white">
              <path d="M16 2.5C8.54 2.5 2.5 8.54 2.5 16c0 2.37.64 4.6 1.76 6.52L2.5 29.5l7.24-1.73A13.44 13.44 0 0016 29.5c7.46 0 13.5-6.04 13.5-13.5S23.46 2.5 16 2.5z" />
            </svg>
            Book a Demo
          </a>
        </div>

        {/* ── TRUST BAR ── */}
        <div className="flex items-center justify-center mt-[13px] mb-[18px] gap-0">
          {["No credit card", "No expiry", "100+ clients"].map((text, i) => (
            <span key={text} className="flex items-center">
              <span className="text-[10px] text-white/48 font-sans">
                {text}
              </span>
              {i < 2 && (
                <span className="w-[3px] h-[3px] rounded-full bg-white/22 mx-1.5 inline-block" />
              )}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
