const ReviewCta = () => {
  return (
    <section className="py-24 px-6 lg:px-8 bg-linear-to-br from-[#075E54] via-[#009987] to-[#075E54] text-white">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold leading-snug">
          Ready to Boost Your Online Reputation?
        </h2>
        <p className="pt-5 text-lg md:text-xl opacity-90">
          Join hundreds of businesses improving their Google reviews and customer loyalty with
          RateUp. Start your free trial today – no credit card required.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
          <a
            href={"https://rateup.app/login"}
            className="bg-white  text-[#075E54] hover:bg-gray-100  
            text-lg px-8 py-4 rounded-lg shadow transition"
          >
            Get Started with RateUp Free
          </a>
        </div>
      </div>
    </section>
  );
};

export default ReviewCta;
