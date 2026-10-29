import { AutomationPlatform } from "@/types/platform.ts";

import { ask, assign, cards, createGraph, quickReplies, text } from "./graph.ts";
import type { ChatbotExample } from "./types.ts";

export const INSTAGRAM_EXAMPLES: ChatbotExample[] = [
  {
    key: "ig-dm-welcome",
    platform: AutomationPlatform.INSTAGRAM,
    useCase: "welcome",
    name: "DM welcome",
    description: "Greets people in DMs with quick replies to shop, ask a question or talk to us.",
    trigger: "keyword",
    build: () => {
      const g = createGraph();
      const menu = quickReplies(
        g,
        "Welcome",
        "Hey 👋 Thanks for reaching out! What brings you here?",
        ["Shop", "Ask a question", "Talk to us"],
      );
      const shop = text(g, "Shop", "Browse everything here: https://example.com/shop");
      const question = text(g, "Question", "Sure! Type your question and we'll get back to you.");
      const human = text(g, "Talk to us", "Connecting you with our team…");
      g.connect(g.start, menu.id);
      g.connect(menu.id, shop, menu.choices[0]);
      g.connect(menu.id, question, menu.choices[1]);
      g.connect(menu.id, human, menu.choices[2]);
      g.chain(human, assign(g));
      return g.done();
    },
  },
  {
    key: "ig-faq-quick-replies",
    platform: AutomationPlatform.INSTAGRAM,
    useCase: "support",
    name: "FAQ quick replies",
    description: "Answers the questions you get most with one tap each.",
    trigger: "keyword",
    build: () => {
      const g = createGraph();
      const faq = quickReplies(g, "FAQs", "What would you like to know?", [
        "Shipping",
        "Returns",
        "Sizes",
      ]);
      const answers = [
        text(g, "Shipping", "We ship in 2–4 working days, free over $50 📦"),
        text(g, "Returns", "Returns are free within 14 days of delivery."),
        text(g, "Sizes", "Our size guide is here: https://example.com/sizes"),
      ];
      g.connect(g.start, faq.id);
      answers.forEach((answer, i) => g.connect(faq.id, answer, faq.choices[i]));
      return g.done();
    },
  },
  {
    key: "ig-lead-capture",
    platform: AutomationPlatform.INSTAGRAM,
    useCase: "leads",
    name: "Lead capture",
    description: "Asks for a name and a phone number or email, then hands the lead to your team.",
    trigger: "keyword",
    build: () => {
      const g = createGraph();
      const name = ask(g, "Name", "Hi! What's your name?", "name");
      const how = quickReplies(g, "Contact method", "How should we reach you?", ["Phone", "Email"]);
      const phone = ask(g, "Phone", "What's the best number to reach you on?", "phone");
      const email = ask(g, "Email", "What's your email address?", "email");
      const thanks = text(g, "Thanks", "Thanks! Someone from our team will be in touch soon.");
      g.chain(g.start, name, how.id);
      g.connect(how.id, phone, how.choices[0]);
      g.connect(how.id, email, how.choices[1]);
      g.chain(phone, thanks);
      g.chain(email, thanks);
      g.chain(thanks, assign(g));
      return g.done();
    },
  },
  {
    key: "ig-product-cards",
    platform: AutomationPlatform.INSTAGRAM,
    useCase: "sales",
    name: "Product cards",
    description: "Shows products as swipeable cards with a link to buy each one.",
    trigger: "keyword",
    build: () => {
      const g = createGraph();
      const intro = text(g, "Intro", "Here are this week's favourites ✨");
      const products = cards(g, "Products", [
        {
          title: "Classic tee",
          subtitle: "$25 · 5 colours",
          buttons: [{ title: "Buy now", url: "https://example.com/classic-tee" }],
        },
        {
          title: "Everyday hoodie",
          subtitle: "$49 · Soft fleece",
          buttons: [{ title: "Buy now", url: "https://example.com/hoodie" }],
        },
        {
          title: "Not sure?",
          subtitle: "Get a recommendation",
          buttons: [{ title: "Help me choose", reply: true }],
        },
      ]);
      const help = text(g, "Help", "Happy to help! Tell us what you're looking for.");
      g.chain(g.start, intro, products.id);
      g.connect(products.id, help, products.choices[0]);
      return g.done();
    },
  },
  {
    key: "ig-booking-request",
    platform: AutomationPlatform.INSTAGRAM,
    useCase: "bookings",
    name: "Booking request",
    description: "Picks a service, asks for a preferred time and passes the request to your team.",
    trigger: "keyword",
    build: () => {
      const g = createGraph();
      const service = quickReplies(g, "Service", "Which service would you like to book?", [
        "Consultation",
        "Fitting",
        "Other",
      ]);
      const when = ask(
        g,
        "Preferred time",
        "When would suit you? Share a day and time.",
        "preferredTime",
      );
      const thanks = text(g, "Requested", "Thanks! We'll confirm your booking shortly.");
      g.connect(g.start, service.id);
      for (const choice of service.choices) g.connect(service.id, when, choice);
      g.chain(when, thanks, assign(g));
      return g.done();
    },
  },
  {
    key: "ig-comment-to-dm",
    platform: AutomationPlatform.INSTAGRAM,
    useCase: "growth",
    name: "Comment to DM a link",
    description:
      "Replies privately to anyone who comments on a post, with the link they asked for.",
    trigger: "comment",
    build: () => {
      const g = createGraph();
      // One message: a private reply is all Instagram allows until the person writes back.
      const dm = text(
        g,
        "Private reply",
        "Thanks for your comment! Here's the link: https://example.com/offer",
      );
      g.chain(g.start, dm);
      return g.done();
    },
  },
  {
    key: "ig-follow-to-unlock",
    platform: AutomationPlatform.INSTAGRAM,
    useCase: "growth",
    name: "Follow to unlock a code",
    description: "Sends a discount code to followers and asks everyone else to follow first.",
    trigger: "keyword",
    build: () => {
      const g = createGraph();
      const check = g.add("instagramFollowCheckNode", { label: "Follows you?" });
      const code = text(g, "Code", "Thanks for following! 🎉 Your code: WELCOME10");
      const nudge = text(
        g,
        "Follow first",
        "Follow us, then send “code” again to unlock your discount 💛",
      );
      g.connect(g.start, check);
      g.connect(check, code, "following");
      g.connect(check, nudge, "notFollowing");
      return g.done();
    },
  },
  {
    key: "ig-story-mention-thanks",
    platform: AutomationPlatform.INSTAGRAM,
    useCase: "growth",
    name: "Story mention thank-you",
    description: "Thanks people who mention you in their story.",
    trigger: "story",
    build: () => {
      const g = createGraph();
      const thanks = text(
        g,
        "Thanks",
        "Thanks so much for the shout-out! 💛 Here's 10% off your next order: THANKS10",
      );
      g.chain(g.start, thanks);
      return g.done();
    },
  },
  {
    key: "ig-link-campaign",
    platform: AutomationPlatform.INSTAGRAM,
    useCase: "growth",
    name: "ig.me link campaign",
    description: "Welcomes people who open your ig.me link from an ad, bio or QR code.",
    trigger: "link",
    build: () => {
      const g = createGraph();
      const menu = quickReplies(g, "Welcome", "Welcome! You're here for the launch offer 🎉", [
        "Get the offer",
        "Learn more",
      ]);
      const offer = text(g, "Offer", "Here you go: https://example.com/launch");
      const more = text(g, "More", "Ask us anything and we'll reply here.");
      g.connect(g.start, menu.id);
      g.connect(menu.id, offer, menu.choices[0]);
      g.connect(menu.id, more, menu.choices[1]);
      return g.done();
    },
  },
  {
    key: "ig-talk-to-a-person",
    platform: AutomationPlatform.INSTAGRAM,
    useCase: "handoff",
    name: "Talk to a person",
    description: "Lets people ask for a person and assigns the chat to your team.",
    trigger: "keyword",
    build: () => {
      const g = createGraph();
      const hello = text(g, "On it", "Connecting you with someone from our team…");
      g.chain(g.start, hello, assign(g));
      return g.done();
    },
  },
];
