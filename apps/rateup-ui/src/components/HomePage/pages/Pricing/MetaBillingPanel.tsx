import { Link } from "@tanstack/react-router";

/**
 * The three claims the navy panel makes about Meta's charges. Paths are drawn on a
 * 24×24 grid with the design system's 2px round stroke.
 */
const POINTS = [
  {
    title: "No hidden charges",
    body: "No per-message margin, no markup, no minimum spend.",
    path: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  },
  {
    title: "Billed direct by Meta",
    body: "Conversation charges land on your own Meta Business account.",
    path: "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
  },
  {
    title: "Meta rates, unchanged",
    body: "You pay exactly Meta's published per-conversation price for your country.",
    path: "M4 20h16M6 16V9M11 16V5M16 16v-4",
  },
];

/** The RateUp star, in the lockup's warm gradient. Inlined so it needs no asset fetch. */
const StarMark = () => (
  <svg width="30" height="30" viewBox="0 0 54.2 51.2" fill="none" aria-hidden className="shrink-0">
    <defs>
      <linearGradient
        id="ru-star-panel"
        x1="9.57"
        y1="-22.11"
        x2="75.5"
        y2="41.66"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#FFD54C" />
        <stop offset="1" stopColor="#F8951D" />
      </linearGradient>
    </defs>
    <g transform="translate(-31.1 0)">
      <path
        d="M84.2478 21.6911L75.6025 30.0125L71.3787 24.2821C70.1137 22.5619 68.2377 21.3748 66.1246 20.9576C64.0115 20.5404 61.8165 20.9237 59.9773 22.0311C59.3246 22.2843 58.7082 22.6201 58.1434 23.0301C56.3089 24.353 55.0797 26.3378 54.7241 28.5512C54.3685 30.7646 54.9154 33.0268 56.2454 34.844L64.9763 46.7054L58.1381 43.1601L44.2692 50.3402C43.9576 50.5018 43.6153 50.5976 43.2641 50.6214C42.9128 50.6452 42.5604 50.5966 42.2293 50.4785C41.8983 50.3604 41.5958 50.1755 41.3413 49.9357C41.0868 49.6959 40.8858 49.4063 40.7512 49.0855C40.5695 48.6578 40.513 48.1885 40.5881 47.7307L43.2346 32.5139L32.0069 21.7253C31.6682 21.3996 31.4288 20.9869 31.3157 20.5339C31.2026 20.0809 31.2203 19.6058 31.3669 19.1622C31.5135 18.7187 31.7831 18.3244 32.1452 18.0242C32.5073 17.7239 32.9474 17.5296 33.4158 17.4632L48.9207 15.2438L55.8524 1.39235C56.0618 0.974388 56.3855 0.622492 56.7871 0.376443C57.1886 0.130394 57.6519 0 58.1247 0C58.5975 0 59.0608 0.130394 59.4624 0.376443C59.8639 0.622492 60.1876 0.974388 60.397 1.39235L67.3287 15.2438L82.8337 17.4632C83.2979 17.5321 83.7335 17.7267 84.0921 18.0255C84.4506 18.3242 84.718 18.7152 84.8644 19.155C85.0107 19.5948 85.0303 20.066 84.921 20.5161C84.8117 20.9662 84.5777 21.3776 84.2452 21.7043L84.2478 21.6911Z"
        fill="url(#ru-star-panel)"
      />
      <path
        d="M70.1105 29.5422C70.1117 30.8232 69.6622 32.0649 68.8387 33.0557C68.0151 34.0465 66.8686 34.7249 65.5945 34.9754C64.3204 35.226 62.9976 35.033 61.8517 34.4295C60.7057 33.8259 59.8076 32.8492 59.3103 31.6657C58.813 30.4822 58.7475 29.1654 59.1247 27.9396C59.502 26.7138 60.2988 25.6549 61.3793 24.9436C62.4597 24.2323 63.757 23.9124 65.0498 24.0387C66.3427 24.1649 67.5511 24.7293 68.4691 25.6358C69.519 26.6725 70.1092 28.0772 70.1105 29.5422Z"
        fill="url(#ru-star-panel)"
      />
    </g>
  </svg>
);

/**
 * "We add nothing on top of Meta's API charges."
 *
 * The single most-asked billing question on a WhatsApp platform, answered on the pricing
 * page rather than in the FAQ: the subscription is the only thing RateUp charges, and the
 * conversation charges are Meta's, billed to the customer's own Meta account.
 */
export const MetaBillingPanel = () => (
  <section className="mx-auto max-w-[1240px] px-8 pt-16">
    <div className="rounded-3xl bg-ru-blue-900 p-8 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] md:p-11">
      <div className="flex flex-wrap items-start gap-8">
        <div className="flex-1 basis-[380px]">
          <div className="mb-4 flex items-center gap-3">
            <StarMark />
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-white/60">
              Zero markup
            </span>
          </div>
          <h2 className="font-display m-0 mb-3 text-[26px] font-bold leading-[1.12] tracking-[-0.028em] text-white md:text-[36px]">
            We add nothing on top of Meta&apos;s API charges.
          </h2>
          <p className="m-0 max-w-[56ch] text-lg leading-[1.6] text-white/70">
            Your WhatsApp conversation charges are billed by Meta, to your own Meta account, at
            Meta&apos;s published rates. RateUp takes no per-message cut, no markup and no minimum
            spend — your subscription is the only thing you pay us.
          </p>
          <Link
            to="/tools/whatsapp-pricing-calculator"
            className="mt-5 inline-flex h-10 items-center gap-[9px] rounded-lg border border-white/20 bg-white/10 px-5 text-sm font-medium text-white transition-colors hover:bg-white/20"
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <rect x="4" y="2" width="16" height="20" rx="2" />
              <path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15v4" />
            </svg>
            Estimate your Meta charges
          </Link>
        </div>

        <div className="grid flex-1 basis-[300px] gap-3">
          {POINTS.map((point) => (
            <div
              key={point.title}
              className="flex items-start gap-3.5 rounded-xl bg-white/5 p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
            >
              <span className="flex size-[38px] shrink-0 items-center justify-center rounded-lg bg-ru-blue-400/20 shadow-[inset_0_0_0_1px_rgba(90,140,198,0.34)]">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-ru-blue-300"
                  aria-hidden
                >
                  <path d={point.path} />
                </svg>
              </span>
              <span>
                <span className="font-display block text-base font-medium leading-[1.35] text-white">
                  {point.title}
                </span>
                <span className="mt-[3px] block text-[13px] leading-[1.45] text-white/70">
                  {point.body}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);
