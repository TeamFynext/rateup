import { useReveal } from "@/components/RateupHomePage/shared/home-ui";
import { Inset } from "@/components/RateupHomePage/shared/mockups/kit";

import { RowsMini, rowDelay, rowReveal } from "../shared/mini";

const ok = (text: string) => <span className="font-medium text-ru-green-700">{text}</span>;

export function KnowledgeMini() {
  return (
    <RowsMini
      items={[
        { key: "info", left: "Business info", right: "Hours, delivery, returns" },
        { key: "faq", left: "FAQs", right: "24 answers" },
        { key: "file", left: "menu-and-prices.pdf", right: ok("Ready") },
        { key: "site", left: "brewandbean.in", right: ok("38 pages crawled") },
      ]}
    />
  );
}

export function SkillsMini() {
  const [ref, shown] = useReveal<HTMLDivElement>();

  return (
    <Inset className="p-2.5">
      <div ref={ref} className="flex flex-col gap-1.5">
        {[
          {
            title: "Take a table booking",
            when: "When someone asks to reserve a table",
            status: "Active",
            tone: "bg-ru-green-50 text-ru-green-700",
          },
          {
            title: "Check an order",
            when: "When someone asks where their order is",
            status: "Pending review",
            tone: "bg-ru-amber-50 text-ru-amber-700",
          },
        ].map((skill, i) => (
          <div
            key={skill.title}
            style={rowDelay(i)}
            className={`rounded-lg border border-ru-n-200 bg-white px-2.75 py-2 ${rowReveal(shown)}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[12.5px] font-medium text-ru-n-700">
                {skill.title}
              </span>
              <span
                className={`flex-none rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${skill.tone}`}
              >
                {skill.status}
              </span>
            </div>
            <div className="mt-0.5 truncate text-[11.5px] text-ru-n-400">{skill.when}</div>
          </div>
        ))}
      </div>
    </Inset>
  );
}

export function RichRepliesMini() {
  const [ref, shown] = useReveal<HTMLDivElement>();
  const replies = [
    { name: "Quick-reply carousel", on: true },
    { name: "Call-to-action button", on: true },
    { name: "WhatsApp Flow", on: true },
    { name: "Interactive list", on: false },
  ];

  return (
    <Inset className="p-2.5">
      <div ref={ref} className="flex flex-col gap-1.5">
        {replies.map((reply, i) => (
          <div
            key={reply.name}
            style={rowDelay(i)}
            className={`flex items-center justify-between rounded-lg border border-ru-n-200 bg-white px-2.75 py-1.75 ${rowReveal(shown)}`}
          >
            <span className="text-[12.5px] font-medium text-ru-n-700">{reply.name}</span>
            <span
              className={`flex h-4 w-7 flex-none items-center rounded-full p-0.5 ${
                reply.on ? "justify-end bg-ru-blue-600" : "justify-start bg-ru-n-200"
              }`}
            >
              <span className="size-3 rounded-full bg-white" />
            </span>
          </div>
        ))}
      </div>
    </Inset>
  );
}

export function ConnectorMini() {
  const [ref, shown] = useReveal<HTMLDivElement>();

  return (
    <Inset className="p-2.5">
      <div ref={ref} className="flex flex-col gap-1.5">
        <div
          style={rowDelay(0)}
          className={`rounded-lg border border-ru-n-200 bg-white px-2.75 py-2 ${rowReveal(shown)}`}
        >
          <div className="truncate font-mono text-[11.5px] text-ru-n-700">
            GET https://api.yourstore.com/orders
          </div>
          <div className="mt-0.5 text-[11.5px] text-ru-n-400">Auth · OAuth2 client credentials</div>
        </div>
        <div
          style={rowDelay(1)}
          className={`flex items-center justify-between rounded-lg border border-ru-n-200 bg-white px-2.75 py-1.75 ${rowReveal(shown)}`}
        >
          <span className="font-mono text-[11.5px] text-ru-n-600">order_status</span>
          <span className="text-[11.5px] font-medium text-ru-green-700">200 · 180 ms</span>
        </div>
      </div>
    </Inset>
  );
}

const RATEUP_TOOLS = [
  "get_loyalty_status",
  "list_loyalty_rewards",
  "add_contact_label",
  "set_lead_stage",
  "assign_to_team",
  "get_crm_options",
];

export function RateupConnectorMini() {
  const [ref, shown] = useReveal<HTMLDivElement>();

  return (
    <Inset className="p-2.5">
      <div ref={ref} className="grid grid-cols-2 gap-1.5">
        {RATEUP_TOOLS.map((tool, i) => (
          <span
            key={tool}
            style={{ transitionDelay: `${i * 90}ms` }}
            className={`truncate rounded-md border border-ru-n-200 bg-white px-2 py-1.5 font-mono text-[10.5px] text-ru-n-600 ${rowReveal(shown)}`}
          >
            {tool}
          </span>
        ))}
      </div>
    </Inset>
  );
}

export function GuardrailsMini() {
  return (
    <RowsMini
      items={[
        { key: "who", left: "Answers", right: "Allowlist · 3 of 20 numbers" },
        { key: "never", left: "Never say", right: "“guaranteed”, “refund approved”" },
        { key: "cap", left: "Usage cap", right: "2,000 AI turns · 7 days" },
        { key: "follow", left: "Follow-up", right: "After 2 hours" },
      ]}
    />
  );
}
