function VizInbox() {
  return (
    <div className="absolute inset-0 p-3.5 flex flex-col gap-1.5 overflow-hidden">
      {[
        { av: "LH", color: "#1A7F4B", ch: "wa", active: true, w: "100%" },
        { av: "MR", color: "#8134AF", ch: "ig", active: false, w: "70%" },
        { av: "AT", color: "#006AFF", ch: "ms", active: false, w: "55%" },
        { av: "SK", color: "#0B5394", ch: "wa", active: false, w: "80%" },
        { av: "NM", color: "#DD2A7B", ch: "ig", active: false, w: "65%" },
      ].map(({ av, color, ch, active, w }, i) => (
        <div
          key={i}
          className="flex items-center gap-2 px-3 py-2.5 rounded-[10px]"
          style={{
            background: active
              ? "rgba(47,163,255,0.10)"
              : "rgba(255,255,255,0.045)",
            border: `1px solid ${active ? "rgba(47,163,255,0.28)" : "rgba(255,255,255,0.09)"}`,
          }}
        >
          <div
            className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
            style={{ background: color, fontFamily: "Nunito,sans-serif" }}
          >
            {av}
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <div
              className="h-[7px] rounded"
              style={{ background: "rgba(255,255,255,0.20)", width: w }}
            />
            <div
              className="h-[5px] rounded w-[62%]"
              style={{ background: "rgba(255,255,255,0.09)" }}
            />
          </div>
          <div
            className="w-[14px] h-[14px] rounded flex-shrink-0"
            style={{
              background:
                ch === "wa"
                  ? "#25D366"
                  : ch === "ig"
                    ? "linear-gradient(45deg,#F58529,#DD2A7B 55%,#8134AF)"
                    : "linear-gradient(135deg,#00B2FF,#006AFF)",
            }}
          />
          {!active && i === 1 && (
            <div
              className="w-[7px] h-[7px] rounded-full flex-shrink-0"
              style={{
                background: "#4FC3FF",
                boxShadow: "0 0 6px rgba(79,195,255,0.7)",
              }}
            />
          )}
          {!active && i === 4 && (
            <div
              className="w-[7px] h-[7px] rounded-full flex-shrink-0"
              style={{
                background: "#4FC3FF",
                boxShadow: "0 0 6px rgba(79,195,255,0.7)",
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function VizTeams() {
  return (
    <div className="absolute inset-0 p-3.5 flex flex-col gap-2.5 overflow-hidden">
      {[
        {
          av: "SA",
          color: "linear-gradient(135deg,#F8951D,#D97A0F)",
          badge: "Admin",
          badgeBg: "rgba(248,149,29,0.17)",
          badgeColor: "#FFB638",
          badgeBorder: "rgba(248,149,29,0.28)",
        },
        {
          av: "AM",
          color: "linear-gradient(135deg,#3D8BEE,#2360C8)",
          badge: "Manager",
          badgeBg: "rgba(47,163,255,0.14)",
          badgeColor: "#4FC3FF",
          badgeBorder: "rgba(47,163,255,0.25)",
        },
        {
          av: "FA",
          color: "linear-gradient(135deg,#25D366,#1A9E4F)",
          badge: "Agent",
          badgeBg: "rgba(255,255,255,0.06)",
          badgeColor: "rgba(255,255,255,0.50)",
          badgeBorder: "rgba(255,255,255,0.09)",
        },
        {
          av: "LK",
          color: "linear-gradient(135deg,#8B7BF0,#5B43D6)",
          badge: "Agent",
          badgeBg: "rgba(255,255,255,0.06)",
          badgeColor: "rgba(255,255,255,0.50)",
          badgeBorder: "rgba(255,255,255,0.09)",
        },
      ].map(({ av, color, badge, badgeBg, badgeColor, badgeBorder }) => (
        <div
          key={av}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px]"
          style={{
            background: "rgba(255,255,255,0.045)",
            border: "1px solid rgba(255,255,255,0.09)",
          }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10.5px] font-black text-white flex-shrink-0"
            style={{ background: color, fontFamily: "Nunito,sans-serif" }}
          >
            {av}
          </div>
          <div className="flex-1">
            <div
              className="h-[7px] rounded mb-1"
              style={{ background: "rgba(255,255,255,0.20)", width: "80px" }}
            />
            <div
              className="h-[5px] rounded"
              style={{ background: "rgba(255,255,255,0.09)", width: "54px" }}
            />
          </div>
          <span
            className="text-[9.5px] font-bold tracking-[0.05em] uppercase px-2 py-[3px] rounded-full whitespace-nowrap"
            style={{
              background: badgeBg,
              color: badgeColor,
              border: `1px solid ${badgeBorder}`,
            }}
          >
            {badge}
          </span>
        </div>
      ))}
    </div>
  );
}

function VizAuto() {
  return (
    <div className="absolute inset-0 p-3.5 flex flex-col gap-2.5 overflow-hidden">
      {[
        { trigger: 'Keyword: "order"', action: "Assign → Support Team" },
        { trigger: "New WhatsApp message", action: "Send acknowledgement" },
      ].map(({ trigger, action }) => (
        <div
          key={trigger}
          className="rounded-[11px] px-3 py-[11px]"
          style={{
            background: "rgba(255,255,255,0.045)",
            border: "1px solid rgba(255,255,255,0.09)",
          }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="text-[9.5px] font-bold tracking-[0.04em] uppercase px-2 py-[3px] rounded-full"
              style={{
                background: "rgba(139,123,240,0.16)",
                color: "#A99BF5",
                border: "1px solid rgba(139,123,240,0.24)",
              }}
            >
              Trigger
            </span>
            <span className="text-[11.5px] font-bold text-white">
              {trigger}
            </span>
          </div>
          <div className="flex justify-center text-white/35 mb-1.5">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="text-[9.5px] font-bold tracking-[0.04em] uppercase px-2 py-[3px] rounded-full"
              style={{
                background: "rgba(47,163,255,0.13)",
                color: "#4FC3FF",
                border: "1px solid rgba(47,163,255,0.24)",
              }}
            >
              Action
            </span>
            <span className="text-[11.5px] font-bold text-white">{action}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function VizMobile() {
  return (
    <div className="absolute inset-0 flex items-center justify-center gap-5">
      {[false, true].map((offset, i) => (
        <div
          key={i}
          className={`w-[82px] h-[150px] rounded-[18px] p-2 ${offset ? "mt-5" : ""}`}
          style={{
            background: "#0B1E3C",
            border: "1px solid rgba(255,255,255,0.15)",
            boxShadow: "0 22px 52px rgba(0,0,0,0.55)",
          }}
        >
          <div
            className="h-full rounded-[12px] relative overflow-hidden"
            style={{ background: "linear-gradient(180deg,#0F2C54,#0A2244)" }}
          >
            <div
              className="absolute top-[7px] left-1/2 -translate-x-1/2 w-[22px] h-[3px] rounded-full"
              style={{ background: "rgba(255,255,255,0.18)" }}
            />
            <div className="absolute top-5 left-1.5 right-1.5 flex flex-col gap-1">
              {(i === 0
                ? ["in", "out", "in w-4/5", "out w-3/5"]
                : ["out", "in w-[90%]", "out w-[65%]", "in w-[70%]"]
              ).map((type, j) => {
                const isOut = type.startsWith("out");
                const extra = type.split(" ").slice(1).join(" ");
                return (
                  <div
                    key={j}
                    className={`h-[18px] rounded-md ${extra}`}
                    style={{
                      background: isOut
                        ? "rgba(61,139,238,0.32)"
                        : "rgba(255,255,255,0.09)",
                      alignSelf: isOut ? "flex-end" : "flex-start",
                      width: extra ? undefined : "100%",
                    }}
                  />
                );
              })}
            </div>
            <div
              className="absolute bottom-2 left-1 right-1 flex items-center gap-1 rounded-[8px] px-1.5 py-1"
              style={{
                background: "rgba(47,163,255,0.15)",
                border: "1px solid rgba(47,163,255,0.3)",
              }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{
                  background: "#4FC3FF",
                  animation: "pulse 2s ease-in-out infinite",
                }}
              />
              <div
                className="h-[5px] rounded flex-1"
                style={{ background: "rgba(255,255,255,0.2)" }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function VizLifecycle() {
  return (
    <div className="absolute inset-0 p-3 flex gap-1.5 items-start overflow-hidden">
      {[
        {
          label: "New Lead",
          count: 2,
          hdrBg: "rgba(59,130,246,0.13)",
          hdrColor: "#93C5FD",
          items: [
            { n: "Sarah Collins", s: "Asked about pricing" },
            { n: "James Mitchell", s: "Requested a demo" },
          ],
        },
        null,
        {
          label: "Hot Lead",
          count: 3,
          hdrBg: "rgba(249,115,22,0.13)",
          hdrColor: "#FDBA74",
          items: [
            { n: "Emily Parker", s: "Ready to purchase" },
            { n: "David Chen", s: "Comparing options" },
          ],
        },
        null,
        {
          label: "Closed",
          count: 5,
          hdrBg: "rgba(34,197,94,0.13)",
          hdrColor: "#86EFAC",
          items: [
            { n: "Olivia Thompson", s: "Purchased plan" },
            { n: "Lucas Brown", s: "Upgraded account" },
          ],
        },
      ].map((col, i) =>
        col === null ? (
          <div
            key={i}
            className="flex items-start justify-center flex-shrink-0 pt-[26px] text-white/35"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
        ) : (
          <div key={i} className="flex-1 flex flex-col gap-1 min-w-0">
            <div
              className="text-[8.5px] font-bold tracking-[0.04em] uppercase px-2 py-1 rounded flex items-center justify-between"
              style={{ background: col.hdrBg, color: col.hdrColor }}
            >
              {col.label}
              <span
                className="text-[11px] font-black"
                style={{ fontFamily: "Nunito,sans-serif" }}
              >
                {col.count}
              </span>
            </div>
            {col.items.map(({ n, s }) => (
              <div
                key={n}
                className="rounded-[7px] px-2 py-1.5"
                style={{
                  background: "rgba(255,255,255,0.055)",
                  border: "1px solid rgba(255,255,255,0.09)",
                }}
              >
                <span className="block font-semibold text-white text-[9px] truncate">
                  {n}
                </span>
                <span className="block text-[8px] text-white/35 mt-0.5 truncate">
                  {s}
                </span>
              </div>
            ))}
          </div>
        ),
      )}
    </div>
  );
}

function VizLabels() {
  const rows = [
    {
      av: "SC",
      color: "#4B5563",
      name: "Sarah Collins",
      prev: "My order hasn't arrived yet…",
      tags: [
        { l: "Urgent", bg: "rgba(239,68,68,0.15)", c: "#FCA5A5" },
        { l: "Billing", bg: "rgba(59,130,246,0.15)", c: "#93C5FD" },
      ],
    },
    {
      av: "JM",
      color: "#475569",
      name: "James Mitchell",
      prev: "Can I upgrade my plan?",
      tags: [
        { l: "VIP", bg: "rgba(168,85,247,0.15)", c: "#C4B5FD" },
        { l: "Sales", bg: "rgba(34,197,94,0.15)", c: "#86EFAC" },
      ],
    },
    {
      av: "EP",
      color: "#64748B",
      name: "Emily Parker",
      prev: "The item arrived damaged…",
      tags: [
        { l: "Returns", bg: "rgba(249,115,22,0.15)", c: "#FDBA74" },
        { l: "Urgent", bg: "rgba(239,68,68,0.15)", c: "#FCA5A5" },
      ],
    },
    {
      av: "DC",
      color: "#374151",
      name: "David Chen",
      prev: "Great experience, thank you!",
      tags: [{ l: "Happy", bg: "rgba(34,197,94,0.15)", c: "#86EFAC" }],
    },
  ];
  return (
    <div className="absolute inset-0 p-3 flex flex-col gap-1.5 overflow-hidden">
      {rows.map(({ av, color, name, prev, tags }) => (
        <div
          key={av}
          className="flex items-center gap-2 px-2.5 py-[7px] rounded-[9px]"
          style={{
            background: "rgba(255,255,255,0.045)",
            border: "1px solid rgba(255,255,255,0.09)",
          }}
        >
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
            style={{ background: color, fontFamily: "Nunito,sans-serif" }}
          >
            {av}
          </div>
          <div className="flex-1 min-w-0">
            <span className="block text-[9.5px] font-semibold text-white truncate">
              {name}
            </span>
            <span className="block text-[8.5px] text-white/35 truncate">
              {prev}
            </span>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            {tags.map(({ l, bg, c }) => (
              <span
                key={l}
                className="text-[8px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap"
                style={{ background: bg, color: c }}
              >
                {l}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const features = [
  {
    viz: <VizInbox />,
    iconBg: "linear-gradient(135deg,#3D8BEE,#2360C8)",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    title: "All Your Channels. Zero Switching.",
    body: "Every incoming message — WhatsApp, Instagram, Messenger — lands in one place. Your team sees the full customer history, across every platform, in one thread.",
    tags: [
      "WhatsApp Business",
      "Instagram Direct",
      "Messenger",
      "More coming soon",
    ],
  },
  {
    viz: <VizTeams />,
    iconBg: "linear-gradient(135deg,#4FC3FF,#2FA3FF)",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: "The Right People, The Right Conversations.",
    body: "Create teams by department — support, sales, logistics, returns. Set role-based permissions so every staff member sees exactly what they need to.",
    tags: [
      "Admin, Manager, Agent roles",
      "Team assignment",
      "Custom permissions",
    ],
  },
  {
    viz: <VizAuto />,
    iconBg: "linear-gradient(135deg,#8B7BF0,#5B43D6)",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    title: "Let the Routine Work Run Itself.",
    body: "Set up smart automation rules that trigger based on keywords, channels, tags, or status. Route messages, send first responses, and escalate urgent issues — automatically.",
    tags: [
      "Keyword routing",
      "Auto-replies",
      "Escalation rules",
      "Tag & assign",
    ],
  },
  {
    viz: <VizMobile />,
    iconBg: "linear-gradient(135deg,#3D8BEE,#2360C8)",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="5" y="2" width="14" height="20" rx="3" />
        <path d="M12 18h.01" />
      </svg>
    ),
    title: "Your Inbox, In Your Pocket.",
    body: "Stay connected wherever you are. The RateUp Inbox mobile app gives your team full access to conversations, assignments, and notifications.",
    tags: [
      "Android app",
      "iOS app",
      "Push notifications",
      "Assign & resolve on the go",
    ],
  },
  {
    viz: <VizLifecycle />,
    iconBg: "linear-gradient(135deg,#F97316,#EA580C)",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    title: "Track Every Lead Through the Pipeline.",
    body: "Move conversations through custom lifecycle stages — New Lead, Hot Lead, Closed, Lost. See exactly where every customer stands and never let a warm lead go cold.",
    tags: ["Custom stages", "Pipeline view", "Lead tracking", "Stage reports"],
  },
  {
    viz: <VizLabels />,
    iconBg: "linear-gradient(135deg,#8B5CF6,#6D28D9)",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
    ),
    title: "Organize Conversations with Labels.",
    body: "Tag conversations with custom labels like Urgent, VIP, Returns, or Sales. Filter your inbox instantly so the right conversations always rise to the top.",
    tags: [
      "Custom labels",
      "Color-coded tags",
      "Instant filtering",
      "Team visibility",
    ],
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20">
      <div className="max-w-[1200px] mx-auto px-7">
        <div className="text-center max-w-[720px] mx-auto mb-[52px]">
          <span
            className="reveal inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.16em] px-[15px] py-[7px] rounded-full mb-5"
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
            Everything your team needs
          </span>
          <h2
            className="reveal d1 font-display font-black text-white leading-[1.06] tracking-[-0.025em] mt-5 mb-4"
            style={{ fontSize: "clamp(32px,4.2vw,54px)" }}
          >
            Built for how customer-facing
            <br />
            teams{" "}
            <span
              className="
  bg-[linear-gradient(100deg,#6BD0FF_0%,#2FA3FF_55%,#2C6FD6_100%)]
  bg-clip-text
  text-transparent
"
            >
              actually work
            </span>
          </h2>
        </div>

        <div className="grid gap-5 grid-cols-1 md:grid-cols-2">
          {features.map(({ viz, iconBg, icon, title, body, tags }, i) => (
            <div
              key={title}
              className={`reveal ${i % 2 === 1 ? "d1" : ""} relative rounded-[28px] overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1`}
              style={{
                background:
                  "linear-gradient(180deg,rgba(255,255,255,0.054),rgba(255,255,255,0.016))",
                border: "1px solid rgba(255,255,255,0.09)",
              }}
            >
              <div
                className="relative overflow-hidden"
                style={{
                  height: "220px",
                  borderBottom: "1px solid rgba(255,255,255,0.09)",
                  background:
                    "radial-gradient(ellipse 80% 90% at 50% 0%,rgba(47,163,255,0.09),transparent 70%),#05182C",
                }}
              >
                {viz}
              </div>
              <div className="p-7">
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center text-white flex-shrink-0"
                    style={{ background: iconBg }}
                  >
                    {icon}
                  </span>
                  <h3 className="font-display font-black text-white text-[20px] m-0 tracking-[-0.01em]">
                    {title}
                  </h3>
                </div>
                <p className="text-[14px] leading-[1.6] text-white/50 m-0">
                  {body}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="text-[11.5px] font-semibold text-white/75 px-2.5 py-1 rounded-full"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.09)",
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
