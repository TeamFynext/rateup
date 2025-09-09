import Image from "next/image";

import { imagesPath } from "@/utils/constants";

const ChatInterface = () => {
  return (
    <div className="relative shadow-lg border rounded-2xl border-gray-200 overflow-hidden h-96 w-full">
      <Image
        src={`${imagesPath}/ticketing/TICKETING AND LEADS.png`}
        alt="ticketing image"
        fill
        className="object-cover" // use 'object-contain' if you don't want cropping
      />
    </div>
  );
};

export default ChatInterface;
