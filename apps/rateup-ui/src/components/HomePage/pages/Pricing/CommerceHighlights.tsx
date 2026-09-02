const CARDS = [
  {
    title: "Shopify integration",
    body: "Sync orders, customers and products in minutes. Trigger abandoned-cart, order-confirmed and delivery messages on WhatsApp, and award loyalty points on every paid order.",
    tint: "bg-accent text-primary",
    icon: (
      <>
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </>
    ),
  },
  {
    title: "WhatsApp catalog integration",
    body: "Push your catalog straight into WhatsApp. Customers browse products, build a cart and check out inside the chat — no apps, no forms, no site hop.",
    tint: "bg-[#25D366]/12 text-[#128C7E]",
    icon: (
      <>
        <path d="M3 9h18" />
        <path d="M3 5h18v14H3z" />
        <path d="M8 13h8" />
      </>
    ),
  },
];

export const CommerceHighlights = () => (
  <section className="mx-auto max-w-[1240px] px-8 pt-24">
    <div className="grid gap-5 sm:grid-cols-1 md:grid-cols-2">
      {CARDS.map((card) => (
        <div
          key={card.title}
          className="rounded-2xl border border-border bg-card p-8 shadow-[0_1px_2px_rgba(11,31,72,0.06)]"
        >
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.tint}`}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              {card.icon}
            </svg>
          </div>
          <h3 className="font-nunito mb-2 mt-[18px] text-[22px] font-extrabold text-foreground">
            {card.title}
          </h3>
          <p className="m-0 text-[15px] leading-relaxed text-muted-foreground">{card.body}</p>
        </div>
      ))}
    </div>
  </section>
);
