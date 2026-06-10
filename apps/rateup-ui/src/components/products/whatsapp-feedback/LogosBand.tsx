export default function LogosBand() {
  const logos = [
    { name: "myG", size: 14 },
    { name: "ShopDoc", size: 11 },
    { name: "Linnk", size: 14 },
    { name: "Metro", size: 11 },
    { name: "Elance", size: 11 },
    { name: "CDA", size: 14 },
    { name: "Oxygen", size: 11 },
  ];

  return (
    <div className="bg-ink-25 py-10 overflow-hidden border-t border-ink-100">
      <div className="max-w-[1200px] mx-auto px-5 md:px-8">
        <div className="text-center text-[13px] font-semibold text-ink-400 uppercase tracking-[0.08em] mb-6">
          Trusted by 500+ businesses worldwide
        </div>
        <div className="flex items-center gap-8 justify-center flex-wrap">
          {logos.map((l) => (
            <div
              key={l.name}
              className={`flex items-center justify-center w-20 h-16 bg-white border border-ink-100 rounded-2xl shadow-[0_1px_2px_rgba(11,31,72,0.06)] p-2.5 font-nunito font-black text-[14px] text-ink-400 tracking-[-0.02em]`}
              style={{ fontSize: l.size }}
            >
              {l.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
