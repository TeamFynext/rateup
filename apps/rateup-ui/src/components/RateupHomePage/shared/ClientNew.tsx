import { Image } from "@unpic/react";
import { ArrowRight } from "lucide-react";

import { imagePath } from "@/components/HomePage/pages/constants.tsx";

export default function Clients() {
  const imagepath = `${imagePath}/homepage`;
  const clients = [
    {
      logo: "entrilogo.png",
      image: "entriimage.png",
      text: "RateUp made collecting feedback effortless. The WhatsApp flows feel natural, and response rates improved instantly.",
      clienthead: "- Rahul Menon, Operations Head at Entri",
      leads: "77",
      generation: "80",
      productivity: "64",
    },
  ];
  return (
    <section className="w-full flex flex-col items-center justify-center bg-rateup-darkblue py-20 gap-20">
      <div className="max-w-6xl">
        <h2 className="text-[#E2E5ED] text-4xl font-medium">
          Proven Results From Business Like Yours
        </h2>
      </div>
      <div className="max-w-6xl">
        {clients.map((client, i) => (
          <div className="bg-[#052259] rounded-4xl" key={i}>
            <div className="flex items-center justify-center">
              <div className="flex flex-col items-start justify-center gap-10 px-10">
                <Image
                  src={`${imagepath}/${client.logo}`}
                  alt="client logo"
                  width={400}
                  height={400}
                  priority
                  className="h-auto w-full object-contain max-w-[8vw]"
                />
                <div className="max-w-sm flex flex-col items-start gap-4">
                  <p className="text-sm text-[#93C6F5]">{client.text}</p>
                  <p className="text-xs text-[#93C6F5]">{client.clienthead}</p>
                </div>

                <div>
                  <button className="bg-[#0089FF] rounded-sm flex items-center gap-1 justify-center px-4 py-2">
                    <span className="text-white text-xs">Read story</span>
                    <ArrowRight className="text-white" size={14} />
                  </button>
                </div>
              </div>
              <div className="rounded-tr-4xl">
                <Image
                  src={`${imagepath}/${client.image}`}
                  alt="client logo"
                  width={400}
                  height={400}
                  priority
                  className="h-auto w-full object-contain max-w-[25vw] rounded-tr-4xl"
                />
              </div>
            </div>
            <div className="flex items-center justify-between px-12 py-6">
              <div className="flex flex-col items-center justify-center">
                <span className="font-bold text-5xl bg-linear-to-r from-[#66D7FF] to-[#2D74E0] bg-clip-text text-transparent">
                  {client.leads}%
                </span>
                <span className="text-lg text-[#E2E5ED]">Growth In Leads</span>
              </div>
              <div className="flex flex-col items-center justify-center">
                <span className="font-bold text-5xl bg-linear-to-r from-[#66D7FF] to-[#2D74E0] bg-clip-text text-transparent">
                  {client.generation}%
                </span>
                <span className="text-lg text-[#E2E5ED]">
                  Business Growth Generation
                </span>
              </div>
              <div className="flex flex-col items-center justify-center">
                <span className="font-bold text-5xl bg-linear-to-r from-[#66D7FF] to-[#2D74E0] bg-clip-text text-transparent">
                  {client.productivity}%
                </span>
                <span className="text-lg text-[#E2E5ED]">
                  Higher Team Productivity
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
