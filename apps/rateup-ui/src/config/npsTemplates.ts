/**
 * Industry-specific NPS survey templates for `/tools/nps-survey-templates`.
 *
 * Each template also gets its own indexable detail page at
 * `/tools/nps-survey-templates/$slug`, so treat `slug` as a permanent URL —
 * renaming one breaks a live page. Add new industries freely; the index,
 * the sidebar filter and the sitemap all read from this array.
 */

export interface NpsTemplate {
  slug: string;
  industry: string;
  /** Short label for chips/filters. */
  sector: "Retail & D2C" | "Food & hospitality" | "Health & wellness" | "Services" | "B2B & SaaS";
  /** The 0–10 rating question. */
  ratingQuestion: string;
  followUps: {
    promoter: string;
    passive: string;
    detractor: string;
  };
  /** When to send it. */
  timing: string;
  /** Why this wording works for this industry. */
  note: string;
  benchmark: string;
}

export const NPS_TEMPLATES: NpsTemplate[] = [
  {
    slug: "ecommerce-d2c",
    industry: "Ecommerce / D2C brand",
    sector: "Retail & D2C",
    ratingQuestion:
      "How likely are you to recommend {{brand}} to a friend or family member? (0 = not at all, 10 = definitely)",
    followUps: {
      promoter: "Love that! What did we get right — the product, the delivery, or something else?",
      passive: "Thanks for the honest score. What would have made it a 10?",
      detractor:
        "Sorry we let you down. What went wrong with your order? A human will read this reply.",
    },
    timing: "2–3 days after delivery, not at dispatch",
    note: "Asking at dispatch measures your marketing; asking after delivery measures your product. Wait until they have actually opened the box.",
    benchmark: "Typical D2C NPS: 30–50",
  },
  {
    slug: "fashion-apparel",
    industry: "Fashion & apparel",
    sector: "Retail & D2C",
    ratingQuestion: "How likely are you to recommend shopping with {{brand}} to a friend? (0–10)",
    followUps: {
      promoter: "Wonderful! Would you mind telling us which piece you loved most?",
      passive: "Thank you. Was it the fit, the fabric or the delivery that fell short?",
      detractor:
        "We're sorry. Was the issue with sizing, quality or delivery? Reply and we'll fix it.",
    },
    timing: "5–7 days after delivery, once they have worn it",
    note: "Fit is the number one detractor driver in apparel. Naming sizing explicitly in the follow-up gets a far more useful answer than an open box.",
    benchmark: "Typical fashion NPS: 25–45",
  },
  {
    slug: "beauty-skincare",
    industry: "Beauty & skincare",
    sector: "Retail & D2C",
    ratingQuestion:
      "How likely are you to recommend {{brand}} to someone with a similar skin type? (0–10)",
    followUps: {
      promoter: "That's great to hear! Which product worked best for you?",
      passive:
        "Thanks. Have you been using it long enough to see results, or did something not suit you?",
      detractor:
        "We're sorry it didn't work out. Did you have a reaction, or did it just not deliver?",
    },
    timing: "21–30 days after delivery, after a full usage cycle",
    note: "Skincare results take weeks. Surveying at day three measures packaging, not efficacy.",
    benchmark: "Typical beauty NPS: 30–50",
  },
  {
    slug: "grocery-quick-commerce",
    industry: "Grocery & quick commerce",
    sector: "Retail & D2C",
    ratingQuestion: "How likely are you to recommend {{brand}} for your daily essentials? (0–10)",
    followUps: {
      promoter: "Thank you! Is it the speed, the prices or the range that keeps you coming back?",
      passive: "Thanks for the score. What one thing would make us your default?",
      detractor: "Sorry about that. Was it a missing item, freshness, or a late delivery?",
    },
    timing: "Within 2 hours of delivery",
    note: "Quick commerce is judged on the last order, not the last month. Ask immediately or the memory is gone.",
    benchmark: "Typical quick commerce NPS: 20–40",
  },
  {
    slug: "restaurant-cafe",
    industry: "Restaurant & café",
    sector: "Food & hospitality",
    ratingQuestion:
      "How likely are you to recommend {{brand}} to a friend looking for a place to eat? (0–10)",
    followUps: {
      promoter: "So glad you enjoyed it! What was your favourite dish?",
      passive: "Thanks for visiting. What would have made the meal a 10?",
      detractor:
        "We're sorry. Was it the food, the wait or the service? The manager will see this.",
    },
    timing: "2–4 hours after the visit, same evening",
    note: "Send it the same day. Next-morning surveys get half the response and vaguer answers.",
    benchmark: "Typical restaurant NPS: 40–60",
  },
  {
    slug: "cloud-kitchen-delivery",
    industry: "Cloud kitchen & food delivery",
    sector: "Food & hospitality",
    ratingQuestion: "How likely are you to order from {{brand}} again and recommend us? (0–10)",
    followUps: {
      promoter: "Brilliant! What did you order, and what made it good?",
      passive: "Thanks. Was it the food, the packaging or the delivery time?",
      detractor:
        "Sorry we got it wrong. Did the food arrive cold, late, or was the order incorrect?",
    },
    timing: "45–60 minutes after delivery",
    note: "Temperature and timing dominate delivery complaints — name them and detractors will tell you exactly which one failed.",
    benchmark: "Typical delivery NPS: 25–45",
  },
  {
    slug: "hotel-hospitality",
    industry: "Hotel & hospitality",
    sector: "Food & hospitality",
    ratingQuestion: "How likely are you to recommend staying at {{brand}} to a friend? (0–10)",
    followUps: {
      promoter: "Thank you! What made your stay memorable?",
      passive: "Thanks for staying with us. What would have made it a 10?",
      detractor:
        "We're sorry your stay disappointed. What went wrong — the room, the service, or check-in?",
    },
    timing: "Within 24 hours of checkout",
    note: "Ask after checkout, not during the stay — mid-stay surveys get polite scores because the guest is still your captive.",
    benchmark: "Typical hotel NPS: 40–60",
  },
  {
    slug: "clinic-healthcare",
    industry: "Clinic & healthcare",
    sector: "Health & wellness",
    ratingQuestion:
      "How likely are you to recommend {{brand}} to a friend or family member needing similar care? (0–10)",
    followUps: {
      promoter: "Thank you. What made your visit a good experience?",
      passive: "Thanks for your feedback. What could we have done better?",
      detractor:
        "We're sorry. Was it the waiting time, the consultation or the staff? Our team will follow up personally.",
    },
    timing: "24 hours after the appointment",
    note: "Keep healthcare follow-ups plainly worded and never automate a detractor reply — route it to a person the same day.",
    benchmark: "Typical healthcare NPS: 50–70",
  },
  {
    slug: "dental-clinic",
    industry: "Dental clinic",
    sector: "Health & wellness",
    ratingQuestion:
      "How likely are you to recommend {{brand}} to someone looking for a dentist? (0–10)",
    followUps: {
      promoter: "Thank you! Would you be open to sharing that as a review?",
      passive: "Thanks. Was there anything about the visit that felt uncomfortable?",
      detractor: "We're sorry. Was it the pain management, the wait or the pricing?",
    },
    timing: "1–2 days after the procedure",
    note: "Anxiety, not clinical outcome, drives most dental detractors. Asking about comfort surfaces what a generic question misses.",
    benchmark: "Typical dental NPS: 55–75",
  },
  {
    slug: "salon-spa",
    industry: "Salon & spa",
    sector: "Health & wellness",
    ratingQuestion: "How likely are you to recommend {{brand}} to a friend? (0–10)",
    followUps: {
      promoter: "Lovely! Which stylist looked after you? We'd love to pass it on.",
      passive: "Thanks. What would have made your visit a 10?",
      detractor: "We're sorry. Was it the result, the wait or the service?",
    },
    timing: "Same day, 3–4 hours after the appointment",
    note: "Naming the stylist in a promoter reply gives you both a testimonial and staff recognition data in one answer.",
    benchmark: "Typical salon NPS: 50–70",
  },
  {
    slug: "gym-fitness",
    industry: "Gym & fitness studio",
    sector: "Health & wellness",
    ratingQuestion:
      "How likely are you to recommend {{brand}} to a friend who wants to get fit? (0–10)",
    followUps: {
      promoter: "Great! What's working best — the trainers, the equipment or the classes?",
      passive: "Thanks. What one change would make this your favourite gym?",
      detractor: "Sorry to hear that. Is it crowding, equipment, cleanliness or the trainers?",
    },
    timing: "30 days after joining, then quarterly",
    note: "Month one is when churn is decided. A detractor caught at day 30 is still saveable; at day 90 they have already stopped coming.",
    benchmark: "Typical fitness NPS: 40–60",
  },
  {
    slug: "education-coaching",
    industry: "Education & coaching",
    sector: "Services",
    ratingQuestion:
      "How likely are you to recommend {{brand}} to another parent or student? (0–10)",
    followUps: {
      promoter: "Thank you! What has made the biggest difference for you?",
      passive: "Thanks for the feedback. What would you like us to improve?",
      detractor: "We're sorry. Is it the teaching, the pace or the support outside class?",
    },
    timing: "End of each term or course module",
    note: "Survey the payer and the learner separately where they differ — a parent and a student rate the same course very differently.",
    benchmark: "Typical education NPS: 40–60",
  },
  {
    slug: "real-estate",
    industry: "Real estate",
    sector: "Services",
    ratingQuestion:
      "How likely are you to recommend {{brand}} to someone buying or renting? (0–10)",
    followUps: {
      promoter: "Thank you! What did your agent do particularly well?",
      passive: "Thanks. What part of the process felt harder than it should have?",
      detractor: "We're sorry. Was it communication, paperwork or the property itself?",
    },
    timing: "1 week after possession or agreement signing",
    note: "Long sales cycles mean one survey at the end misses everything. Add a mid-process check after the first site visit.",
    benchmark: "Typical real estate NPS: 30–50",
  },
  {
    slug: "logistics-courier",
    industry: "Logistics & courier",
    sector: "Services",
    ratingQuestion: "How likely are you to recommend {{brand}} for deliveries? (0–10)",
    followUps: {
      promoter: "Thank you! Was it the speed, the tracking or the delivery agent?",
      passive: "Thanks. Where did the experience fall short?",
      detractor: "We're sorry. Was the parcel late, damaged, or was the agent unhelpful?",
    },
    timing: "Immediately after delivery confirmation",
    note: "Tie the response to the shipment ID so a detractor score is traceable to a route and an agent, not just a date.",
    benchmark: "Typical logistics NPS: 20–40",
  },
  {
    slug: "b2b-saas",
    industry: "B2B SaaS",
    sector: "B2B & SaaS",
    ratingQuestion:
      "How likely are you to recommend {{brand}} to a colleague in a similar role? (0–10)",
    followUps: {
      promoter: "Thank you! Which part of the product has been most valuable to your team?",
      passive:
        "Thanks for the honest score. What's the one thing missing that would make this a 10?",
      detractor:
        "Sorry to hear that. What is blocking you — a missing feature, reliability, or support?",
    },
    timing: "30 days after onboarding, then every quarter",
    note: "Ask 'a colleague in a similar role', not 'a friend' — B2B recommendations travel along job functions, not friendships.",
    benchmark: "Typical B2B SaaS NPS: 30–50",
  },
  {
    slug: "financial-services",
    industry: "Financial services",
    sector: "B2B & SaaS",
    ratingQuestion: "How likely are you to recommend {{brand}} to a friend or colleague? (0–10)",
    followUps: {
      promoter: "Thank you. What has given you the most confidence in us?",
      passive: "Thanks. What would make you more comfortable recommending us?",
      detractor: "We're sorry. Was it the fees, the process, or the support you received?",
    },
    timing: "After the first completed transaction, then twice a year",
    note: "Trust, not features, moves financial NPS. Follow-ups that ask about confidence outperform ones that ask about functionality.",
    benchmark: "Typical financial services NPS: 30–45",
  },
];

export const NPS_SECTORS = [
  "Retail & D2C",
  "Food & hospitality",
  "Health & wellness",
  "Services",
  "B2B & SaaS",
] as const;

export const getNpsTemplate = (slug: string): NpsTemplate | undefined =>
  NPS_TEMPLATES.find((template) => template.slug === slug);

/**
 * NPS = %promoters − %detractors. Passives count in the denominator only.
 * Returns null when there are no responses, so callers can render an empty state
 * rather than a misleading zero.
 */
export function calculateNps(promoters: number, passives: number, detractors: number) {
  const total = promoters + passives + detractors;
  if (total <= 0) return null;

  const promoterShare = (promoters / total) * 100;
  const detractorShare = (detractors / total) * 100;

  return {
    total,
    score: Math.round(promoterShare - detractorShare),
    promoterShare: Math.round(promoterShare),
    passiveShare: Math.round((passives / total) * 100),
    detractorShare: Math.round(detractorShare),
  };
}

export function npsVerdict(score: number) {
  if (score >= 70) return { label: "World class", tone: "excellent" as const };
  if (score >= 50) return { label: "Excellent", tone: "excellent" as const };
  if (score >= 30) return { label: "Good", tone: "good" as const };
  if (score > 0) return { label: "Needs work", tone: "ok" as const };
  return { label: "Critical", tone: "bad" as const };
}
