import {
  IconBrandFacebookFilled,
  IconBrandLinkedinFilled,
  IconBrandWhatsappFilled,
  IconBrandXFilled,
  IconCheck,
  IconCopy,
  IconShare,
} from "@tabler/icons-react";
import {
  FacebookShareButton,
  LinkedinShareButton,
  TwitterShareButton,
  WhatsappShareButton,
} from "next-share";
import { useState } from "react";

import { Button } from "@/components/ui/button.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";

export default function SharePopover() {
  const url = typeof window !== "undefined" ? window.location.href : "";
  const [opened, setOpened] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Popover open={opened} onOpenChange={setOpened}>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon-lg" className="rounded-full" aria-label="Share" />
        }
      >
        <IconShare size={18} />
      </PopoverTrigger>

      <PopoverContent side="right" className="w-56 gap-3">
        <div className="flex items-center justify-between">
          <Tooltip>
            <TooltipTrigger
              render={<Button variant="ghost" className="w-full" onClick={handleCopy} />}
            >
              {copied ? <IconCheck size={18} className="text-green-600" /> : <IconCopy size={18} />}
              {copied ? "Copied!" : "Copy Link"}
            </TooltipTrigger>
            <TooltipContent>Copy link</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-2 [&>*]:flex-1">
          <FacebookShareButton url={url}>
            <div className="flex size-10 items-center justify-center rounded-full bg-blue-600 text-white">
              <IconBrandFacebookFilled size={18} />
            </div>
          </FacebookShareButton>

          <WhatsappShareButton url={url}>
            <div className="flex size-10 items-center justify-center rounded-full bg-green-600 text-white">
              <IconBrandWhatsappFilled size={18} />
            </div>
          </WhatsappShareButton>

          <TwitterShareButton url={url}>
            <div className="flex size-10 items-center justify-center rounded-full bg-black text-white">
              <IconBrandXFilled size={18} />
            </div>
          </TwitterShareButton>

          <LinkedinShareButton url={url}>
            <div className="flex size-10 items-center justify-center rounded-full bg-blue-700 text-white">
              <IconBrandLinkedinFilled size={18} />
            </div>
          </LinkedinShareButton>
        </div>
      </PopoverContent>
    </Popover>
  );
}
