import { AutomationPlatform } from "@/types/platform.ts";

import { ask, assign, cards, createGraph, quickReplies, text } from "./graph.ts";
import type { ChatbotExample } from "./types.ts";

const ON_MESSAGE = {
  triggerEvent: "MESSAGE_RECEIVED",
  hint: "Starts when a message to your Page matches a rule you set up.",
};

export const MESSENGER_EXAMPLES: ChatbotExample[] = [
  {
    key: "fb-page-welcome",
    platform: AutomationPlatform.FACEBOOK,
    useCase: "welcome",
    name: "Page welcome",
    description: "Greets people who message your Page with quick replies to get them started.",
    suggestedTrigger: ON_MESSAGE,
    build: () => {
      const g = createGraph();
      const menu = quickReplies(g, "Welcome", "Hi 👋 Thanks for messaging us! How can we help?", [
        "See products",
        "Opening hours",
        "Talk to us",
      ]);
      const products = text(g, "Products", "Browse everything here: https://example.com/shop");
      const hours = text(g, "Hours", "We're open Mon–Sat, 9 AM – 6 PM.");
      const human = text(g, "Talk to us", "Connecting you with our team…");
      g.connect(g.start, menu.id);
      g.connect(menu.id, products, menu.choices[0]);
      g.connect(menu.id, hours, menu.choices[1]);
      g.connect(menu.id, human, menu.choices[2]);
      g.chain(human, assign(g));
      return g.done();
    },
  },
  {
    key: "fb-faq-hours-location",
    platform: AutomationPlatform.FACEBOOK,
    useCase: "support",
    name: "FAQ, hours and location",
    description: "Answers the usual questions, including when you're open and where to find you.",
    suggestedTrigger: ON_MESSAGE,
    build: () => {
      const g = createGraph();
      const faq = quickReplies(g, "FAQs", "What would you like to know?", [
        "Opening hours",
        "Location",
        "Delivery",
      ]);
      const answers = [
        text(g, "Hours", "We're open Mon–Sat, 9 AM – 6 PM, and closed on Sundays."),
        text(g, "Location", "Find us at 12 Example Street. Map: https://example.com/map"),
        text(g, "Delivery", "We deliver in 2–4 working days, free over $50 📦"),
      ];
      g.connect(g.start, faq.id);
      answers.forEach((answer, i) => g.connect(faq.id, answer, faq.choices[i]));
      return g.done();
    },
  },
  {
    key: "fb-lead-capture",
    platform: AutomationPlatform.FACEBOOK,
    useCase: "leads",
    name: "Lead capture",
    description: "Asks for a name and a phone number or email, then hands the lead to your team.",
    suggestedTrigger: ON_MESSAGE,
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
    key: "fb-product-cards",
    platform: AutomationPlatform.FACEBOOK,
    useCase: "sales",
    name: "Product cards",
    description: "Shows products as swipeable cards with a link to buy each one.",
    suggestedTrigger: ON_MESSAGE,
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
    key: "fb-booking-request",
    platform: AutomationPlatform.FACEBOOK,
    useCase: "bookings",
    name: "Booking request",
    description: "Picks a service, asks for a preferred time and passes the request to your team.",
    suggestedTrigger: ON_MESSAGE,
    build: () => {
      const g = createGraph();
      const service = quickReplies(g, "Service", "Which service would you like to book?", [
        "Consultation",
        "Appointment",
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
    key: "fb-rating-follow-up",
    platform: AutomationPlatform.FACEBOOK,
    useCase: "feedback",
    name: "Rating with follow-up",
    description: "Asks how it went and follows up differently on a good or bad answer.",
    suggestedTrigger: ON_MESSAGE,
    build: () => {
      const g = createGraph();
      const rating = quickReplies(g, "Rating", "How was your experience with us?", [
        "😊 Great",
        "😐 Okay",
        "😞 Not good",
      ]);
      const great = text(g, "Thanks", "Thank you! That made our day 💙");
      const issue = ask(
        g,
        "What went wrong",
        "Sorry to hear that. What could we do better?",
        "feedback",
      );
      const noted = text(g, "Noted", "Thanks for telling us. Our team will look into it.");
      g.connect(g.start, rating.id);
      g.connect(rating.id, great, rating.choices[0]);
      g.connect(rating.id, issue, rating.choices[1]);
      g.connect(rating.id, issue, rating.choices[2]);
      g.chain(issue, noted);
      return g.done();
    },
  },
  {
    key: "fb-talk-to-a-person",
    platform: AutomationPlatform.FACEBOOK,
    useCase: "handoff",
    name: "Talk to a person",
    description: "Lets people ask for a person and assigns the chat to your team.",
    suggestedTrigger: {
      triggerEvent: "MESSAGE_RECEIVED",
      hint: "Starts when someone sends a keyword like “agent” or “human”.",
    },
    build: () => {
      const g = createGraph();
      const hello = text(g, "On it", "Connecting you with someone from our team…");
      g.chain(g.start, hello, assign(g));
      return g.done();
    },
  },
];
