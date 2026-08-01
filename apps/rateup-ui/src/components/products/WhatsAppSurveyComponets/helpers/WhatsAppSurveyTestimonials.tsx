import { IconUserCircle } from "@tabler/icons-react";

const testimonials = [
  {
    quote:
      "RateUp revolutionized how we collect feedback. Our response rate tripled, and we're finally getting the insights we needed to improve our menu. The WhatsApp integration is seamless!",
    author: "Owner, Local Cafe",
    business: "Local Cafe",
  },
  {
    quote:
      "The ability to automatically route positive feedback to Google Reviews has significantly boosted our online reputation. Negative feedback is handled quickly through the ticketing system. It's a game-changer.",
    author: "Manager, Boutique Hotel",
    business: "Boutique Hotel",
  },
];

export default function WhatsAppSurveyTestimonials() {
  return (
    <section className="bg-gradient-to-b from-blue-50 px-8 to-white py-20">
      <div className="max-w-6xl mx-auto text-center">
        <h3 className="text-3xl sm:text-4xl font-bold text-[#009987]">
          Don&apos;t Just Take Our Word For It
        </h3>
        <p className="pt-3 text-lg text-gray-600">
          See how businesses like yours are finding success with RateUp.
        </p>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl shadow-lg p-8 text-left hover:shadow-xl transition-shadow duration-300"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <IconUserCircle className="w-8 h-8 text-[#075E54]" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{t.author}</p>
                  <p className="text-sm text-gray-500">{t.business}</p>
                </div>
              </div>
              <blockquote className="italic text-gray-700 leading-relaxed">“{t.quote}”</blockquote>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
