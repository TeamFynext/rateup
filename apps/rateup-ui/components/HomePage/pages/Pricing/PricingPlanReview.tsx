const reviews = [
  {
    title: "Pro plan unlocked real growth for us",
    author: "Meera, E-commerce Seller",
    description:
      "With automation, AI-powered workflows, and higher message limits, we now run campaigns that actually boost repeat sales.",
  },
  {
    title: "The Free plan was enough to get us started.",
    author: "Kavita, Boutique Owner",
    description:
      "I loved how easy it was to test the features without paying upfront. It gave me the confidence to later upgrade.",
  },
  {
    title: "The Basic plan fits perfectly for small businesses.",
    author: "Arjun, Café Manager",
    description:
      "We started with Basic and instantly saw a difference in customer feedback response rates. It’s affordable and super effective.",
  },
  {
    title: "Enterprise plan is exactly what we needed",
    author: "Ramesh, Hotel Chain Operator",
    description:
      "RateUp worked with us to customize features and message volume for our scale. The onboarding and support were top-notch.",
  },
];

const PricingPlanReview = () => {
  return (
    <div className="grid grid-cols-3 gap-8 p-6">
      {reviews.map((review, index) => (
        <div
          className="flex flex-col gap-2 bg-gray-100 p-6 rounded-lg"
          key={index}
        >
          <h4 className="italic">"{review.title}"</h4>
          <p className="text-sm pl-3">{review.description}</p>
          <p className="flex justify-end italic"> - {review.author}</p>
        </div>
      ))}
    </div>
  );
};

export default PricingPlanReview;
