function ContactUs() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-20 text-[#001C57]">
      <h1 className="text-5xl font-bold pb-16 text-center">Contact Us</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* India Contact */}
        <div className="bg-white shadow-lg rounded-2xl border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300">
          <h2 className="text-2xl font-semibold mb-3 text-[#1c518e]">India</h2>
          <p className="text-base leading-relaxed">
            <strong>Uprate Technologies Private Limited</strong>
            <br />
            Cochin
            <br />
            Kerala Startup Mission
            <br />
            <span className="text-blue-600">
              E-mail:{" "}
              <a href="mailto:hello@rateup.app" className="underline hover:text-blue-800">
                hello@rateup.app
              </a>
            </span>
          </p>
        </div>

        {/* Germany Contact */}
        <div className="bg-white shadow-lg rounded-2xl border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300">
          <h2 className="text-2xl font-semibold mb-3 text-[#1c518e]">Germany</h2>
          <p className="text-base leading-relaxed">
            <strong>Duesseldorf, Germany</strong>
            <br />
            <span className="text-blue-600">
              E-mail:{" "}
              <a href="mailto:hello@rateup.app" className="underline hover:text-blue-800">
                hello@rateup.app
              </a>
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ContactUs;
