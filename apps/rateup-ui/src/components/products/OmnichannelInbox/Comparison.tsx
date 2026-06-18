import { CheckIcon, XIcon } from "./icons";

const rows = [
  {
    feature: "WhatsApp Business (native)",
    ru: "Full support",
    them: "Limited",
    ruType: "yes",
    themType: "partial",
  },
  {
    feature: "Instagram Direct Messages",
    ru: "Full support",
    them: "Limited",
    ruType: "yes",
    themType: "partial",
  },
  {
    feature: "Mobile Apps (Android & iOS)",
    ru: "Included",
    them: "Often extra cost",
    ruType: "yes",
    themType: "partial",
  },
  {
    feature: "Team Roles & Permissions",
    ru: "Included",
    them: "Included",
    ruType: "yes",
    themType: "yes",
  },
  {
    feature: "Inbox Automations",
    ru: "Included",
    them: "Included",
    ruType: "yes",
    themType: "yes",
  },
  {
    feature: "Loyalty & Rewards Integration",
    ru: "RateUp only",
    them: "Not available",
    ruType: "special",
    themType: "no",
  },
];

function Cell({ text, type }: { text: string; type: string }) {
  if (type === "yes")
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold"
        style={{ color: "#4AE88A" }}
      >
        <CheckIcon />
        {text}
      </span>
    );
  if (type === "special")
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[13px] font-bold"
        style={{ color: "#4FC3FF" }}
      >
        <CheckIcon />
        {text}
      </span>
    );
  if (type === "partial")
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[13px] font-medium"
        style={{ color: "#FFB638" }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 9v4M12 17h.01" />
          <path d="m10.29 3.86-8.49 14.7A2 2 0 0 0 3.5 21h17a2 2 0 0 0 1.71-3.06l-8.48-14.7a2 2 0 0 0-3.44 0z" />
        </svg>
        {text}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-white/35">
      <XIcon />
      {text}
    </span>
  );
}

export default function Comparison() {
  return (
    <section id="compare" className="py-20">
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
            Why RateUp Inbox
          </span>
          <h6
            className="reveal d1 font-display font-black text-white leading-[1.06] tracking-[-0.025em] mt-5 mb-4"
            style={{ fontSize: "clamp(32px,4.2vw,54px)" }}
          >
            Not just another helpdesk.
          </h6>
          <p className="reveal d2 text-[17px] leading-[1.65] text-white/50 m-0 max-w-[560px] mx-auto">
            Most helpdesk tools are built for email. RateUp Inbox is built
            around the channels your customers actually use — with the loyalty
            and engagement context only RateUp can provide.
          </p>
        </div>

        <div
          className="reveal d1 rounded-[28px] overflow-hidden"
          style={{
            background:
              "linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))",
            border: "1px solid rgba(255,255,255,0.09)",
          }}
        >
          <div className="overflow-x-auto">
            <table
              className="w-full border-collapse"
              style={{ minWidth: "520px" }}
            >
              <thead>
                <tr>
                  <th
                    className="text-left px-6 py-[18px] text-[12.5px] font-bold tracking-[0.06em] uppercase text-white/50"
                    style={{ width: "40%" }}
                  >
                    Feature
                  </th>
                  <th
                    className="text-left px-6 py-[18px] text-[12.5px] font-bold tracking-[0.06em] uppercase"
                    style={{
                      color: "#4FC3FF",
                      background: "rgba(47,163,255,0.08)",
                      borderBottom: "2px solid rgba(47,163,255,0.3)",
                    }}
                  >
                    RateUp Inbox
                  </th>
                  <th className="text-left px-6 py-[18px] text-[12.5px] font-bold tracking-[0.06em] uppercase text-white/50">
                    Generic Helpdesks
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ feature, ru, them, ruType, themType }) => (
                  <tr
                    key={feature}
                    className="group"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.09)" }}
                  >
                    <td className="px-6 py-[15px] text-[14px] font-medium text-white/75">
                      {feature}
                    </td>
                    <td
                      className="px-6 py-[15px]"
                      style={{ background: "rgba(47,163,255,0.04)" }}
                    >
                      <Cell text={ru} type={ruType} />
                    </td>
                    <td className="px-6 py-[15px]">
                      <Cell text={them} type={themType} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
