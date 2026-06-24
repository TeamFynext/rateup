import { BarChart, MessageSquare, RefreshCcw } from "lucide-react";
import { easeOut, motion } from "motion/react";

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: easeOut },
  },
};

const ReviewAiFeatures = () => {
  return (
    <section id="features" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Heading */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={cardVariants}
          className="text-center flex justify-center flex-col items-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl text-[#009987] font-bold mb-4">
            <span className="font-bold">Everything You Need to Elevate Your Reputation</span>
          </h2>
          <p className="text-gray-600 max-w-2xl pt-4 mx-auto">
            From smart review collection to deep online presence analysis.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: <RefreshCcw className="h-8 w-8 text-[#009987] mb-4" />,
              title: "AI-Powered QR Codes",
              desc: "Generate dynamic QR codes optimized for review collection.",
            },
            {
              icon: <BarChart className="h-8 w-8 text-[#009987] mb-4" />,
              title: "Smart Review Filtering",
              desc: "Guide happy customers to Google, capture negative feedback internally.",
            },
            {
              icon: <MessageSquare className="h-8 w-8 text-[#009987] mb-4" />,
              title: "Negative Feedback Management",
              desc: "Automatically create tickets for negative reviews for fast resolution.",
            },
            {
              icon: <BarChart className="h-8 w-8 text-[#009987] mb-4" />,
              title: "Online Reputation Analysis",
              desc: "AI analyzes reviews across platforms for sentiment and key insights.",
            },
            {
              icon: <RefreshCcw className="h-8 w-8 text-[#009987] mb-4" />,
              title: "AI Agents & Assistance",
              desc: "Get AI-driven suggestions for responding to reviews and improving service.",
            },
            {
              icon: <MessageSquare className="h-8 w-8 text-[#009987] mb-4" />,
              title: "WhatsApp Integration",
              desc: "Connect via WhatsApp for instant support and issue resolution.",
            },
          ].map((feature, i) => (
            <motion.div
              key={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              className="bg-white p-6 rounded-xl shadow-sm border"
            >
              {feature.icon}
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ReviewAiFeatures;
