import { Image } from "@unpic/react";

import { BookDemoButton } from "@/components/RateupHomePage/helper/BookDemoLink.tsx";
import { imagesPath } from "@/utils/constants.ts";

function AboutUs() {
  return (
    <main className="bg-white text-[#001C57]">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-[#004F98] to-[#001C57] text-white py-24 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-extrabold mb-6 leading-tight">We’re Rateup</h1>
          <p className="text-xl font-medium">
            Empowering businesses with insights to create exceptional customer experiences.
          </p>
        </div>
      </section>

      {/* Mission + Vision Section */}
      <section className="py-20 px-6 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-start">
          {/* Mission Block */}
          <div className="space-y-4">
            <h2 className="text-3xl font-bold">Our Mission</h2>
            <p className="text-lg leading-relaxed text-gray-700">
              We are on a mission to empower businesses of all sizes with the insights they need to
              create exceptional, unforgettable{" "}
              <span className="font-semibold text-[#004F98]">customer experiences</span>.
            </p>
          </div>

          {/* Empowering Block */}
          <div className="space-y-4 border-l-4 border-[#001C57] pl-6">
            <h2 className="text-3xl font-bold">Empowering Businesses</h2>
            <p className="text-lg leading-relaxed text-gray-700">
              Through data, insights, and innovation — we help you elevate{" "}
              <span className="font-semibold text-[#004F98]">customer satisfaction</span> at every
              touchpoint.
            </p>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-1 px-6 bg-[#f8faff] text-center">
        <h2 className="text-4xl font-bold mb-4">The Rateup Commitment</h2>
        <p className="text-lg text-gray-600 mb-12">Our Values guide every decision we make.</p>

        <div className="flex justify-center">
          <Image
            src={`${imagesPath}/about-us-page/our-values/our-values.png`}
            alt="Our Core Values"
            width={900}
            height={700}
            className="w-full max-w-5xl h-auto drop-shadow-2xl rounded-xl"
          />
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 px-6 text-center bg-white">
        <div className="max-w-3xl mx-auto">
          <h3 className="text-3xl font-bold pb-2">
            Let’s build unforgettable experiences together
          </h3>
          <p className="text-lg text-gray-700 pb-4">
            Discover how Rateup can help your business grow through better customer understanding.
          </p>
          <BookDemoButton />
        </div>
      </section>
    </main>
  );
}

export default AboutUs;
