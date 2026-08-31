import { IconPhoneCall } from "@tabler/icons-react";
import { Image } from "@unpic/react";

import { BookDemoModal } from "@/components/RateupHomePage/helper/BookDemoModal.tsx";
import { Button } from "@/components/ui/button.tsx";
import { imagesPath } from "@/utils/constants.ts";

const QrFinalCTA = () => {
  return (
    <section className="relative bg-linear-to-br from-[#00397b] via-[#013553] to-primary text-white overflow-hidden py-24 px-4 sm:px-6 lg:px-8">
      {/* Decorative Blur Background */}
      <div className="absolute -top-20 -left-20 w-[300px] h-[300px] bg-white/10 rounded-full blur-3xl opacity-20 z-0"></div>
      <div className="absolute bottom-0 right-0 w-[250px] h-[250px] bg-white/10 rounded-full blur-2xl opacity-20 z-0"></div>

      <div className="relative max-w-6xl mx-auto text-center z-10">
        {/* Heading */}
        <div className="max-w-3xl mx-auto mb-12">
          <h2 className="text-4xl sm:text-5xl font-bold leading-tight mb-4 drop-shadow-sm">
            Ready to Revolutionize Your Engagement?
          </h2>
          <p className="text-lg sm:text-xl text-white/90">
            Don’t let your customer potential go untapped. RateUp’s powerful QR solutions help you
            capture attention, convert leads, and track results effortlessly.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-wrap justify-center gap-4 mb-14">
          <BookDemoModal>
            <Button className="cursor-pointer bg-white text-[#013553] hover:bg-white/90 text-base font-semibold px-7 py-4 rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl">
              Contact Sales
            </Button>
          </BookDemoModal>
          <Button
            variant="outline"
            className="border-white bg-white/10 hover:bg-white/20 text-white text-base font-medium px-6 py-4 rounded-xl flex items-center gap-2 backdrop-blur-sm transition"
          >
            <IconPhoneCall size={18} />
            <span>Or call us directly: +91 80755 45008</span>
          </Button>
        </div>

        {/* Image */}
        <div className="relative w-full max-w-2xl mx-auto h-64 sm:h-80 md:h-[27rem]">
          <Image
            src={`${imagesPath}/qr-landing/qrcta.png`}
            alt="RateUp Analytics Dashboard"
            layout="fullWidth"
            aspectRatio={16 / 9}
            objectFit="contain"
            className="object-contain rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.2)]"
          />
        </div>
      </div>
    </section>
  );
};

export default QrFinalCTA;
