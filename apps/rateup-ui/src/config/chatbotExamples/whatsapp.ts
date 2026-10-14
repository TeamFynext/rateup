import { AutomationPlatform } from "@/types/platform.ts";

import { ask, assign, buttons, createGraph, list, text } from "./graph.ts";
import type { ChatbotExample } from "./types.ts";

const ON_MESSAGE = {
  triggerEvent: "MESSAGE_RECEIVED",
  hint: "Starts when a WhatsApp message matches a rule you set up.",
};

/** The WhatsApp examples. The first six are the former templates (tpl-001 to tpl-008). */
export const WHATSAPP_EXAMPLES: ChatbotExample[] = [
  {
    key: "wa-welcome-menu",
    platform: AutomationPlatform.WHATSAPP,
    useCase: "welcome",
    name: "Welcome menu",
    description: "Greets people with buttons to explore, read FAQs or get in touch.",
    suggestedTrigger: ON_MESSAGE,
    build: () => {
      const g = createGraph();
      const welcome = buttons(
        g,
        "Welcome",
        "Hi! How can we help you today?",
        ["Explore", "FAQs", "Contact"],
        "Welcome 👋",
      );
      const explore = text(g, "Explore", "Explore our services and features 🚀");
      const faq = buttons(g, "FAQs", "Choose a question:", ["Pricing", "Working Hours"], "FAQs ❓");
      const contact = text(g, "Contact", "Email: support@example.com\nPhone: +123456789");
      const pricing = buttons(
        g,
        "Pricing",
        "Plans start from $10/month.",
        ["Back to Menu"],
        "Pricing 💰",
      );
      const hours = buttons(
        g,
        "Hours",
        "Mon–Sat: 9 AM – 6 PM",
        ["Back to Menu"],
        "Working Hours 🕒",
      );
      g.connect(g.start, welcome.id);
      g.connect(welcome.id, explore, welcome.choices[0]);
      g.connect(welcome.id, faq.id, welcome.choices[1]);
      g.connect(welcome.id, contact, welcome.choices[2]);
      g.connect(faq.id, pricing.id, faq.choices[0]);
      g.connect(faq.id, hours.id, faq.choices[1]);
      g.connect(pricing.id, welcome.id, pricing.choices[0]);
      g.connect(hours.id, welcome.id, hours.choices[0]);
      return g.done();
    },
  },
  {
    key: "wa-faq-list",
    platform: AutomationPlatform.WHATSAPP,
    useCase: "support",
    name: "FAQ list",
    description: "Answers common questions from a list, with a way back to the list.",
    suggestedTrigger: ON_MESSAGE,
    build: () => {
      const g = createGraph();
      const intro = buttons(
        g,
        "Help center",
        "Welcome! Browse common questions below.",
        ["View FAQs"],
        "Help Center 💬",
      );
      const faqs = list(
        g,
        "FAQ list",
        "Select a question:",
        "View questions",
        "Common Questions",
        [
          { title: "Pricing", description: "View plans" },
          { title: "Refund Policy", description: "Learn about refunds" },
          { title: "Working Hours", description: "Business hours" },
        ],
        "FAQs 📚",
      );
      const answers = [
        buttons(g, "Pricing", "Our plans start from $10/month.", ["Back to FAQs"], "Pricing 💰"),
        buttons(
          g,
          "Refund",
          "Refunds are available within 7 days.",
          ["Back to FAQs"],
          "Refund Policy 🔁",
        ),
        buttons(
          g,
          "Hours",
          "We operate 9 AM – 6 PM, Mon–Sat.",
          ["Back to FAQs"],
          "Working Hours 🕒",
        ),
      ];
      g.connect(g.start, intro.id);
      g.connect(intro.id, faqs.id, intro.choices[0]);
      answers.forEach((answer, i) => {
        g.connect(faqs.id, answer.id, faqs.choices[i]);
        g.connect(answer.id, faqs.id, answer.choices[0]);
      });
      return g.done();
    },
  },
  {
    key: "wa-mini-store",
    platform: AutomationPlatform.WHATSAPP,
    useCase: "sales",
    name: "Mini store",
    description: "Lets people browse categories and follow a link to your store.",
    suggestedTrigger: ON_MESSAGE,
    build: () => {
      const g = createGraph();
      const menu = buttons(
        g,
        "Main menu",
        "Welcome! What would you like to do?",
        ["Browse Categories", "View Offers", "Support"],
        "Shop 🛒",
      );
      const categories = list(
        g,
        "Categories",
        "Choose a category:",
        "View categories",
        "Shop Now",
        [
          { title: "Electronics", description: "Phones, Gadgets" },
          { title: "Fashion", description: "Clothing & Style" },
        ],
        "Categories 📦",
      );
      const electronics = g.add("textNode", {
        label: "Electronics",
        body: "Top product: iPhone 15 - $999\nShop now: https://example.com/electronics",
        previewUrl: true,
      });
      const fashion = g.add("textNode", {
        label: "Fashion",
        body: "Trending outfits, new arrivals weekly.\nShop now: https://example.com/fashion",
        previewUrl: true,
      });
      const offers = text(g, "Offers", "🔥 20% OFF on all products today!");
      const support = text(g, "Support", "Support will contact you shortly.");
      g.connect(g.start, menu.id);
      g.connect(menu.id, categories.id, menu.choices[0]);
      g.connect(menu.id, offers, menu.choices[1]);
      g.connect(menu.id, support, menu.choices[2]);
      g.connect(categories.id, electronics, categories.choices[0]);
      g.connect(categories.id, fashion, categories.choices[1]);
      return g.done();
    },
  },
  {
    key: "wa-appointment-booking",
    platform: AutomationPlatform.WHATSAPP,
    useCase: "bookings",
    name: "Appointment booking",
    description: "Picks a service, a day and a time, then confirms the booking.",
    suggestedTrigger: ON_MESSAGE,
    build: () => {
      const g = createGraph();
      const welcome = buttons(
        g,
        "Welcome",
        "Would you like to book an appointment?",
        ["Book Now"],
        "Book Appointment 📅",
      );
      const services = list(
        g,
        "Services",
        "Choose a service:",
        "View services",
        "Available Services",
        [
          { title: "Consultation", description: "General discussion" },
          { title: "Demo Session", description: "Product walkthrough" },
        ],
        "Select Service 🧾",
      );
      const date = buttons(
        g,
        "Date",
        "Pick a preferred date:",
        ["Tomorrow", "Next Week"],
        "Select Date 📅",
      );
      const time = buttons(
        g,
        "Time",
        "Choose a time slot:",
        ["10:00 AM", "4:00 PM"],
        "Select Time ⏰",
      );
      const confirm = buttons(
        g,
        "Confirm",
        "Confirm your appointment?",
        ["Confirm", "Change Slot"],
        "Confirm Booking ✅",
      );
      const success = text(g, "Booked", "🎉 Appointment booked successfully!");
      g.connect(g.start, welcome.id);
      g.connect(welcome.id, services.id, welcome.choices[0]);
      for (const row of services.choices) g.connect(services.id, date.id, row);
      for (const day of date.choices) g.connect(date.id, time.id, day);
      for (const slot of time.choices) g.connect(time.id, confirm.id, slot);
      g.connect(confirm.id, success, confirm.choices[0]);
      g.connect(confirm.id, date.id, confirm.choices[1]);
      return g.done();
    },
  },
  {
    key: "wa-rating-follow-up",
    platform: AutomationPlatform.WHATSAPP,
    useCase: "feedback",
    name: "Rating with follow-up",
    description: "Asks how it went and follows up differently on a good or bad answer.",
    suggestedTrigger: ON_MESSAGE,
    build: () => {
      const g = createGraph();
      const intro = buttons(
        g,
        "Feedback start",
        "Would you like to share your experience?",
        ["Give Feedback"],
        "We Value Your Feedback 💬",
      );
      const rating = buttons(
        g,
        "Rating",
        "How was your experience?",
        ["😊 Good", "😞 Bad"],
        "Rate Us ⭐",
      );
      const good = text(g, "Thanks", "Thank you! Your feedback helps us grow 🚀");
      const issue = ask(g, "What went wrong", "Sorry to hear that. What went wrong?", "issue");
      const sorry = text(g, "Follow-up", "We've noted your issue. Our team will review it.");
      g.connect(g.start, intro.id);
      g.connect(intro.id, rating.id, intro.choices[0]);
      g.connect(rating.id, good, rating.choices[0]);
      g.connect(rating.id, issue, rating.choices[1]);
      g.connect(issue, sorry);
      return g.done();
    },
  },
  {
    key: "wa-loan-eligibility",
    platform: AutomationPlatform.WHATSAPP,
    useCase: "qualification",
    name: "Loan eligibility",
    description: "Checks employment, income and credit score before passing a lead on.",
    suggestedTrigger: ON_MESSAGE,
    build: () => {
      const g = createGraph();
      const intro = buttons(
        g,
        "Intro",
        "Check your loan eligibility in seconds!",
        ["Check Now"],
        "Loan Eligibility 💰",
      );
      const employment = buttons(
        g,
        "Employment",
        "What is your employment type?",
        ["Salaried", "Self-Employed"],
        "Employment Type 👔",
      );
      const income = buttons(
        g,
        "Income",
        "Select your income range:",
        ["Above ₹50K", "Below ₹50K"],
        "Monthly Income 💵",
      );
      const business = buttons(
        g,
        "Business income",
        "Is your business income stable?",
        ["Yes"],
        "Business Income 📊",
      );
      const credit = buttons(
        g,
        "Credit",
        "What is your credit score?",
        ["700+", "Below 700"],
        "Credit Score 📈",
      );
      const eligible = text(g, "Eligible", "🎉 You are eligible for the loan!");
      const review = text(g, "Review", "Your profile needs manual review.");
      const handoff = assign(g);
      const rejected = text(g, "Not eligible", "❌ Not eligible at this time.");
      g.connect(g.start, intro.id);
      g.connect(intro.id, employment.id, intro.choices[0]);
      g.connect(employment.id, income.id, employment.choices[0]);
      g.connect(employment.id, business.id, employment.choices[1]);
      g.connect(income.id, credit.id, income.choices[0]);
      g.connect(income.id, rejected, income.choices[1]);
      g.connect(business.id, credit.id, business.choices[0]);
      g.connect(credit.id, eligible, credit.choices[0]);
      g.connect(credit.id, review, credit.choices[1]);
      g.chain(eligible, handoff);
      return g.done();
    },
  },
  {
    key: "wa-lead-capture",
    platform: AutomationPlatform.WHATSAPP,
    useCase: "leads",
    name: "Lead capture",
    description: "Asks for a name and what they need, then hands the lead to your team.",
    suggestedTrigger: ON_MESSAGE,
    build: () => {
      const g = createGraph();
      const name = ask(g, "Name", "Hi! What's your name?", "name");
      const need = ask(g, "Need", "Thanks! What can we help you with?", "need");
      const thanks = text(g, "Thanks", "Got it. Someone from our team will reply shortly.");
      g.chain(g.start, name, need, thanks, assign(g));
      return g.done();
    },
  },
  {
    key: "wa-talk-to-a-person",
    platform: AutomationPlatform.WHATSAPP,
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
