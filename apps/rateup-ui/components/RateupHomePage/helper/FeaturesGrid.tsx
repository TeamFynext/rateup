import { Inbox, MessageSquare, Target, Zap } from "lucide-react";

export function FeaturesGrid() {
  const features = [
    {
      title: "WhatsApp AI Chatbot",
      description:
        "Engage customers 24/7 with human-like, AI-driven conversations that resolve queries instantly.",
      icon: <MessageSquare className="h-6 w-6 text-green-400" />,
      image: "WhatsApp AI Chatbot Interface",
    },
    {
      title: "Automated Workflows",
      description:
        "Build logic-based automation to route tickets, send abandoned cart reminders, and more.",
      icon: <Zap className="h-6 w-6 text-yellow-400" />,
      image: "Workflow Builder Interface",
    },
    {
      title: "Campaign Manager",
      description:
        "Target segmented audiences with personalized marketing messages that drive conversions.",
      icon: <Target className="h-6 w-6 text-red-400" />,
      image: "Campaign Dashboard Interface",
    },
    {
      title: "Shared Inbox",
      description:
        "Collaborate seamlessly with your entire team. See who is replying to what in real-time.",
      icon: <Inbox className="h-6 w-6 text-rateup-blue" />,
      image: "Team Inbox Interface",
    },
  ];

  return (
    <section className="py-24" id="features">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative flex flex-col rounded-[2rem] border border-white/10 bg-rateup-dark-blue-3 overflow-hidden hover:border-rateup-blue/30 transition-all duration-300"
            >
              {/* Card top - Image placeholder area */}
              <div className="h-64 bg-gradient-to-b from-white/5 to-transparent relative overflow-hidden flex items-end justify-center p-6">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="w-full h-48 bg-black/40 rounded-t-2xl border border-white/10 border-b-0 backdrop-blur-sm flex flex-col items-center justify-center translate-y-4 group-hover:translate-y-2 transition-transform duration-300">
                  {feature.icon}
                  <span className="text-xs text-muted-foreground mt-4 block text-center px-4">
                    {feature.image}
                  </span>
                </div>
              </div>

              {/* Card bottom - Text content */}
              <div className="p-8 flex-1 flex flex-col">
                <h3 className="text-xl font-bold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
