const reviews = [
  {
    title: "",
    author: "Senior Product Manager, Eduport",
    description:
      "The support from the Rateup team was fantastic! I believe a great product needs a strong support network, and they delivered just that. They were kind enough to add new features within a limited timeframe, which was very impressive.",
  },
  {
    title: "",
    author: "Training & Business Development Manager, Linnk Academy India",
    description:
      "Thank you to the Rateup team for supporting my team in reaching our target customers through your app. The platform is user-friendly and provides an efficient way to follow up with customers. While I have used several similar apps, I find Rateup to be more reliable and easier to use. I highly recommend it. Thank you once again for your excellent service.",
  },
  {
    title: "",
    author: "Sanjay Krishna H, Senior Product Manager, Entri",
    description:
      "We were struggling with getting feedback from users and that is when Rateup came in. We were able to try out different templates, send out campaigns to segments of users and view the feedback in a single dashboard. Would recommend Rateup majorly for their whatsapp based flows. The Rateup team provides great support and prompt updates which is a cherry on top!",
  },
];

const PricingPlanReview = () => {
  const quote = <span className="font-bold">"</span>;
  return (
    <div className="grid sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 p-6">
      {reviews.map((review, index) => (
        <div
          className="flex flex-col gap-2 bg-gray-100 p-6 rounded-lg"
          key={index}
        >
          {/* <h4 className="italic">"{review.title}"</h4> */}
          <p className="text-sm pl-3 italic">
            {quote} {review.description} {quote}
          </p>
          <p className="flex justify-end italic font-normal text-sm">
            {" "}
            - {review.author}
          </p>
        </div>
      ))}
    </div>
  );
};

export default PricingPlanReview;
