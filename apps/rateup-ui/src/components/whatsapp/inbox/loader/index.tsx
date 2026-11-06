import { IconBrandWhatsapp, IconLoader2 } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Progress } from "@/components/ui/progress.tsx";

export default function WhatsAppInboxLoader({ isLoading }: { isLoading: boolean }) {
  const [progress, setProgress] = useState(0);
  const { t: translations } = useTranslation();

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading) {
      timer = setInterval(() => {
        setProgress((oldProgress) => {
          if (oldProgress === 100) {
            clearInterval(timer);
            return 100;
          }
          const diff = Math.random() * 10;
          return Math.min(oldProgress + diff, 100);
        });
      }, 500);
    } else {
      setProgress(100);
    }
    return () => {
      clearInterval(timer);
    };
  }, [isLoading]);

  return (
    <div className="flex h-full items-center justify-center rounded-lg shadow-sm bg-background">
      <div className="flex flex-col gap-2 items-center min-w-[300px]">
        <IconBrandWhatsapp color="#0B846D" size={40} />
        <Progress value={progress} className="w-[300px] mt-2 h-0.5" />
        <div className="flex items-center gap-2 mt-1">
          <IconLoader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
          <p className="text-xs text-muted-foreground">{translations("Loading chats...")}</p>
        </div>
      </div>
    </div>
  );
}
